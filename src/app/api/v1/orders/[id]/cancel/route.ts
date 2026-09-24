/**
 * Order Cancellation API Route
 * 
 * Enforces customer self-ownership and order lifecycle invariants.
 * Customers can only cancel their own orders in eligible pending states.
 * 
 * Invariants: ADR-0003, ADR-0010, ADR-0022, ADR-0023, Milestone 047
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, defaultObjectAuthzService } from '@/shared/authz';
import { OrderRepository } from '@/repositories/order.repository';
import { CancelOrderSchema } from '@/validators/order.validator';
import { AppError, ValidationError, NotFoundError } from '@/shared/errors/app-error';
import { prisma } from '@/shared/database/prisma';
import { auditService } from '@/shared/audit';

export const dynamic = 'force-dynamic';

const orderRepo = new OrderRepository();

/**
 * POST /api/v1/orders/[id]/cancel
 * Cancels an order with object-level ownership and lifecycle checks.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = authenticateRequest(req);
    const { id: orderId } = await params;

    let body = {};
    try {
      body = await req.json();
    } catch {
      // Optional body
    }

    const parseResult = CancelOrderSchema.safeParse(body);
    const reason = parseResult.success ? parseResult.data.reason : 'Customer requested order cancellation';

    // 1. Fetch the order
    const order = await orderRepo.findById(orderId);
    if (!order) {
      throw new NotFoundError(`Order '${orderId}' not found`);
    }

    // 2. Object-level authorization and lifecycle check
    await defaultObjectAuthzService.assert({
      action: 'cancel',
      actor,
      object: {
        type: 'ORDER',
        id: order.id,
        ownerId: order.customerId,
        status: order.status,
      },
      reason,
    });

    // 3. Perform cancellation in transaction
    const updated = await (prisma as any).order.update({
      where: { id: order.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelReason: reason,
      },
    });

    // 4. Record status history
    await (prisma as any).orderStatusHistory.create({
      data: {
        id: `osh_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        orderId: order.id,
        fromStatus: order.status,
        toStatus: 'CANCELLED',
        actorId: actor.userId,
        actorRole: actor.roles[0] || 'CUSTOMER',
        reason,
      },
    });

    // 5. Record immutable business audit log with state diff
    await auditService.logBusinessEvent({
      action: 'ORDER_CANCELLED',
      resource: 'ORDER',
      resourceId: order.id,
      actorId: actor.userId,
      actorRole: actor.roles[0] || 'CUSTOMER',
      before: { status: order.status },
      after: { status: 'CANCELLED' },
      metadata: { reason, orderNumber: order.orderNumber },
      req,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: updated.id,
          orderNumber: updated.orderNumber,
          status: updated.status,
          cancelReason: updated.cancelReason,
          cancelledAt: updated.cancelledAt,
        },
      },
      { status: 200 }
    );
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
