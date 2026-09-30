/**
 * Order Cancellation API Route
 *
 * Enforces customer self-ownership and order lifecycle invariants.
 * Customers can only cancel their own orders in eligible pending states.
 *
 * Invariants: ADR-0003, ADR-0010, ADR-0022, ADR-0023, Milestone 047
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest, defaultObjectAuthzService } from '@/shared/authz';
import { OrderRepository } from '@/repositories/order.repository';
import { CancelOrderSchema } from '@/validators/order.validator';
import {
  AppError,
  ValidationError,
  NotFoundError,
  AuthorizationError,
} from '@/shared/errors/app-error';
import { validationErrorResponse } from '@/shared/api/error-response';
import { TransitionIdempotencyKeySchema } from '@/features/orders/validators/order.validators';
import { orderTransitionService } from '@/features/orders/state-machines/order-transition.service';

export const dynamic = 'force-dynamic';

const orderRepo = new OrderRepository();

/**
 * POST /api/v1/orders/[id]/cancel
 * Cancels an order with object-level ownership and lifecycle checks.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = authenticateRequest(req);
    const { id: orderId } = await params;

    let body = {};
    try {
      body = await req.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    const { reason } = CancelOrderSchema.parse(body);

    // 1. Fetch the order
    const order = await orderRepo.findById(orderId);
    if (!order) {
      throw new NotFoundError(`Order '${orderId}' not found`);
    }

    // 2. Object-level authorization and lifecycle check
    if (order.status === 'CANCELLED') {
      const isAdmin = actor.roles.some((role) => ['ADMIN', 'SUPER_ADMIN'].includes(role));
      if (
        (!isAdmin && order.customerId !== actor.userId) ||
        (!actor.roles.includes('SUPER_ADMIN') && !actor.permissions.includes('orders:cancel'))
      ) {
        throw new AuthorizationError('Cancellation ownership and permission required.');
      }
    } else
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

    const idempotencyKey = TransitionIdempotencyKeySchema.parse(req.headers.get('idempotency-key'));
    const transition = await orderTransitionService.transitionOrderStatus({
      orderId: order.id,
      nextStatus: 'CANCELLED',
      actorId: actor.userId,
      actorRole: actor.roles.some((role) => ['ADMIN', 'SUPER_ADMIN'].includes(role))
        ? 'ADMIN'
        : 'CUSTOMER',
      reason,
      idempotencyKey,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: transition.newStatus,
          cancelReason: reason,
          cancelledAt: transition.transitionedAt,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) return validationErrorResponse(req, error);
    if (error instanceof AppError) {
      return NextResponse.json(error.toJSON(), { status: error.statusCode });
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
