/**
 * REST API Route Handler: /api/v1/support/tickets/[id]
 * 
 * Manages single support ticket inspection, thread replies, and resolution.
 * 
 * Invariants: ADR-0003, ADR-0006, ADR-0022, ADR-0024, Milestone 046
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { SupportTicketService } from '@/services/support-ticket.service';
import { ReplySupportTicketSchema, ResolveSupportTicketSchema } from '@/validators/support-and-rider.validators';
import { AppError } from '@/shared/errors/app-error';

const ticketService = new SupportTicketService();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = authenticateRequest(req);
    const { id } = await params;
    const ticket = await ticketService.getTicket(actor, id);

    return NextResponse.json({
      success: true,
      data: ticket,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toJSON(), { status: error.statusCode });
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = authenticateRequest(req);
    const { id } = await params;

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_JSON', message: 'Valid JSON payload is required.' } },
        { status: 400 }
      );
    }

    const parseResult = ReplySupportTicketSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: parseResult.error.errors[0]?.message || 'Input validation failed',
            details: parseResult.error.format(),
          },
        },
        { status: 422 }
      );
    }

    const updated = await ticketService.replyTicket(actor, id, parseResult.data);

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toJSON(), { status: error.statusCode });
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = authenticateRequest(req);
    const { id } = await params;

    const body = await req.json().catch(() => ({}));
    const parseResult = ResolveSupportTicketSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: parseResult.error.errors[0]?.message || 'Input validation failed',
            details: parseResult.error.format(),
          },
        },
        { status: 422 }
      );
    }

    const updated = await ticketService.resolveTicket(actor, id, parseResult.data);

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toJSON(), { status: error.statusCode });
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
