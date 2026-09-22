/**
 * AlifWorld Customer Support & Incident Ticket Authorization Policy
 * 
 * Governs omnichannel support tickets, inquiry pipelines, operator assignments,
 * issue resolution SLAs, and enforces maker-checker financial boundaries.
 * 
 * Invariants: ADR-0003, ADR-0006, ADR-0022, ADR-0023, Milestone 046
 */

import { IPolicy, ActorContext, ResourceContext, PolicyDecision } from '../authz.types';
import { SystemRoleCode } from '@/features/identity/types';

export class SupportPolicy implements IPolicy {
  readonly name = 'SupportPolicy';
  readonly resourceType = 'SUPPORT';

  evaluate(actor: ActorContext, action: string, resource: ResourceContext): PolicyDecision {
    const isSuperAdmin = actor.roles.includes(SystemRoleCode.SUPER_ADMIN);
    const isPlatformAdmin = actor.roles.includes(SystemRoleCode.ADMIN);
    const isSupportAgent = actor.roles.includes(SystemRoleCode.SUPPORT) || actor.permissions.includes('support:read');
    const isSupportManager = isPlatformAdmin || actor.permissions.includes('support:manage');

    // 1. Super Administrator Global Operational Bypass
    if (isSuperAdmin) {
      return {
        granted: true,
        code: 'GRANTED',
        reason: 'Super Administrator holds global support management privileges.',
        policyName: this.name,
      };
    }

    // 2. Strict Financial Guardrail:
    // Support agents CANNOT directly execute financial disbursements, manual ledger adjustments,
    // or unverified cash refunds from support workflows without finance dual-control maker-checker approval
    if (action === 'financial_adjustment' || action === 'refund:issue' || action === 'wallet:credit') {
      return {
        granted: false,
        code: 'MAKER_CHECKER_REQUIRED',
        reason: 'Manual financial credits and refunds cannot be issued from the support console without finance maker-checker approval.',
        policyName: this.name,
        diagnostics: { action, actorId: actor.userId },
      };
    }

    // Check ownership for requester (Customer or Seller)
    const isRequesterOwner = Boolean(
      (resource.ownerId && resource.ownerId === actor.userId) ||
      (resource.sellerId && resource.sellerId === actor.sellerId)
    );

    switch (action) {
      case 'create':
      case 'support:ticket:create': {
        // Any authenticated customer, seller, or support agent can open a ticket
        if (isSupportAgent || isPlatformAdmin) {
          return { granted: true, code: 'GRANTED', reason: 'Support operator opening ticket on behalf of user.', policyName: this.name };
        }

        // Customer opening ticket for their own account
        if (resource.ownerId && resource.ownerId === actor.userId) {
          return { granted: true, code: 'GRANTED', reason: 'Customer creating support inquiry ticket.', policyName: this.name };
        }

        // Seller opening ticket for their own merchant store
        if (resource.sellerId && resource.sellerId === actor.sellerId) {
          return { granted: true, code: 'GRANTED', reason: 'Seller creating merchant support inquiry ticket.', policyName: this.name };
        }

        // Defaults to self if not explicitly specified
        if (!resource.ownerId && !resource.sellerId) {
          return { granted: true, code: 'GRANTED', reason: 'Authenticated user opening inquiry ticket.', policyName: this.name };
        }

        return {
          granted: false,
          code: 'FORBIDDEN',
          reason: 'Cannot open support ticket on behalf of an unrelated user or seller account.',
          policyName: this.name,
        };
      }

      case 'read':
      case 'support:ticket:read': {
        // Support agents & admins can inspect tickets in queue
        if (isSupportAgent || isPlatformAdmin) {
          return { granted: true, code: 'GRANTED', reason: 'Support operator authorized to inspect ticket.', policyName: this.name };
        }

        // Ticket creator can read their own ticket
        if (isRequesterOwner) {
          return { granted: true, code: 'GRANTED', reason: 'Ticket owner viewing inquiry progress.', policyName: this.name };
        }

        return {
          granted: false,
          code: 'OWNERSHIP_VIOLATION',
          reason: 'Cannot inspect support tickets belonging to another customer or store.',
          policyName: this.name,
        };
      }

      case 'reply':
      case 'respond':
      case 'support:ticket:reply': {
        // Support agents can respond
        if (isSupportAgent || isPlatformAdmin) {
          return { granted: true, code: 'GRANTED', reason: 'Support agent posting response to ticket.', policyName: this.name };
        }

        // Ticket owner can respond
        if (isRequesterOwner) {
          return { granted: true, code: 'GRANTED', reason: 'Ticket owner responding with inquiry details.', policyName: this.name };
        }

        return {
          granted: false,
          code: 'OWNERSHIP_VIOLATION',
          reason: 'Only the ticket owner or assigned support staff can post messages.',
          policyName: this.name,
        };
      }

      case 'assign':
      case 'support:ticket:assign': {
        // Only Support managers or admins can assign tickets to agents
        if (isSupportManager || actor.permissions.includes('support:assign')) {
          return { granted: true, code: 'GRANTED', reason: 'Authorized to dispatch/assign ticket to agent.', policyName: this.name };
        }

        return {
          granted: false,
          code: 'FORBIDDEN',
          reason: 'Only support supervisors can assign tickets.',
          policyName: this.name,
        };
      }

      case 'resolve':
      case 'close':
      case 'support:ticket:resolve': {
        // Support agent can resolve
        if (isSupportAgent || isPlatformAdmin) {
          return { granted: true, code: 'GRANTED', reason: 'Support operator resolving ticket.', policyName: this.name };
        }

        // Ticket owner can close their own ticket
        if (isRequesterOwner) {
          return { granted: true, code: 'GRANTED', reason: 'Ticket owner closing inquiry.', policyName: this.name };
        }

        return {
          granted: false,
          code: 'FORBIDDEN',
          reason: 'Unauthorized to resolve or close this ticket.',
          policyName: this.name,
        };
      }

      default:
        return {
          granted: false,
          code: 'FORBIDDEN',
          reason: `Unrecognized support action '${action}'.`,
          policyName: this.name,
        };
    }
  }
}
