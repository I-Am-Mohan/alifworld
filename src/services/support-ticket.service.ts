/**
 * AlifWorld Customer Support Ticket Domain Service
 * 
 * Manages customer inquiries, order incident reports, ticket threads,
 * and operator assignment with strict privacy boundaries and SLA tracking.
 * 
 * Invariants: ADR-0003, ADR-0006, ADR-0022, ADR-0024, Milestone 046
 */

import { prisma } from '@/shared/database/prisma';
import { ActorContext } from '@/shared/authz/authz.types';
import { defaultPolicyEngine } from '@/shared/authz';
import { NotFoundError, ValidationError, AuthorizationError } from '@/shared/errors/app-error';
import { CreateSupportTicketInput, ReplySupportTicketInput, ResolveSupportTicketInput } from '@/validators/support-and-rider.validators';

export interface TicketMessage {
  id: string;
  senderId: string;
  senderRole: string;
  message: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  ownerId: string;
  sellerId?: string | null;
  orderId?: string | null;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_ON_CUSTOMER' | 'RESOLVED' | 'CLOSED';
  assignedAgentId?: string | null;
  resolutionNote?: string | null;
  messages: TicketMessage[];
  createdAt: string;
  updatedAt: string;
}

export class SupportTicketService {
  // In-memory support ticket store: ticketId -> SupportTicket
  private static tickets = new Map<string, SupportTicket>();

  /**
   * Creates a new support ticket.
   */
  public async createTicket(actor: ActorContext, input: CreateSupportTicketInput): Promise<SupportTicket> {
    await defaultPolicyEngine.assert(actor, 'create', {
      type: 'SUPPORT',
      ownerId: actor.userId,
      sellerId: input.sellerId || actor.sellerId || null,
    });

    const ticketId = `tkt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const ticketNumber = `TKT-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const now = new Date().toISOString();

    const ticket: SupportTicket = {
      id: ticketId,
      ticketNumber,
      ownerId: actor.userId,
      sellerId: input.sellerId || actor.sellerId || null,
      orderId: input.orderId || null,
      subject: input.subject,
      description: input.description,
      category: input.category,
      priority: input.priority,
      status: 'OPEN',
      assignedAgentId: null,
      messages: [
        {
          id: `msg_${Date.now()}_1`,
          senderId: actor.userId,
          senderRole: actor.roles[0] || 'CUSTOMER',
          message: input.description,
          createdAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    SupportTicketService.tickets.set(ticketId, ticket);

    // Emit audit log
    await (prisma as any).auditLog.create({
      data: {
        actorId: actor.userId,
        action: 'SUPPORT_TICKET_CREATED',
        resource: 'SupportTicket',
        resourceId: ticketId,
        metadata: {
          ticketNumber,
          category: input.category,
          priority: input.priority,
          orderId: input.orderId,
        },
      },
    });

    return ticket;
  }

  /**
   * Retrieves a single support ticket by ID, verifying privacy and ownership policy.
   */
  public async getTicket(actor: ActorContext, ticketId: string): Promise<SupportTicket> {
    const ticket = SupportTicketService.tickets.get(ticketId);
    if (!ticket) {
      throw new NotFoundError(`Support ticket with id '${ticketId}' not found.`);
    }

    await defaultPolicyEngine.assert(actor, 'read', {
      type: 'SUPPORT',
      id: ticket.id,
      ownerId: ticket.ownerId,
      sellerId: ticket.sellerId,
    });

    return ticket;
  }

  /**
   * Lists support tickets with role-based scoping (Customer sees own, Seller sees store, Support sees queue).
   */
  public async listTickets(actor: ActorContext): Promise<SupportTicket[]> {
    const all = Array.from(SupportTicketService.tickets.values());
    const isSupportOrAdmin =
      actor.roles.includes('SUPPORT') ||
      actor.roles.includes('ADMIN') ||
      actor.roles.includes('SUPER_ADMIN') ||
      actor.permissions.includes('support:read');

    if (isSupportOrAdmin) {
      return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    // Customer or Seller scoping
    return all.filter((ticket) => {
      if (ticket.ownerId === actor.userId) return true;
      if (actor.sellerId && ticket.sellerId === actor.sellerId) return true;
      return false;
    });
  }

  /**
   * Appends a response message to a support ticket thread.
   */
  public async replyTicket(
    actor: ActorContext,
    ticketId: string,
    input: ReplySupportTicketInput
  ): Promise<SupportTicket> {
    const ticket = await this.getTicket(actor, ticketId);

    await defaultPolicyEngine.assert(actor, 'reply', {
      type: 'SUPPORT',
      id: ticket.id,
      ownerId: ticket.ownerId,
      sellerId: ticket.sellerId,
      data: { assignedAgentId: ticket.assignedAgentId },
    });

    const now = new Date().toISOString();
    const newMsg: TicketMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      senderId: actor.userId,
      senderRole: actor.roles[0] || 'USER',
      message: input.message,
      createdAt: now,
    };

    ticket.messages.push(newMsg);
    ticket.updatedAt = now;

    // Update status to IN_PROGRESS if agent replied, or WAITING_ON_AGENT if customer replied
    const isAgent = actor.roles.includes('SUPPORT') || actor.roles.includes('ADMIN');
    if (isAgent && ticket.status === 'OPEN') {
      ticket.status = 'IN_PROGRESS';
    }

    SupportTicketService.tickets.set(ticketId, ticket);
    return ticket;
  }

  /**
   * Resolves or closes a support ticket.
   */
  public async resolveTicket(
    actor: ActorContext,
    ticketId: string,
    input: ResolveSupportTicketInput
  ): Promise<SupportTicket> {
    const ticket = await this.getTicket(actor, ticketId);

    await defaultPolicyEngine.assert(actor, 'resolve', {
      type: 'SUPPORT',
      id: ticket.id,
      ownerId: ticket.ownerId,
      sellerId: ticket.sellerId,
    });

    ticket.status = 'RESOLVED';
    ticket.resolutionNote = input.resolutionNote || 'Resolved by support operator.';
    ticket.updatedAt = new Date().toISOString();

    SupportTicketService.tickets.set(ticketId, ticket);
    return ticket;
  }

  /**
   * Clears in-memory test state.
   */
  public static clearState(): void {
    SupportTicketService.tickets.clear();
  }
}
