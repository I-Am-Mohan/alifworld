import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/shared/authz';
import { orderTransitionService } from '@/features/orders/state-machines/order-transition.service';
import {
  TransitionOrderStatusSchema,
  TransitionIdempotencyKeySchema,
} from '@/features/orders/validators/order.validators';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { AuthorizationError, ValidationError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/v1/orders/[id]/status
 * Transitions a parent order through the explicit state machine.
 * Requires ADMIN or SYSTEM role for most transitions.
 * CUSTOMER role permitted only for cancellation of eligible orders.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = authenticateRequest(req);
    if (
      !actor.roles.some((role) =>
        ['SUPER_ADMIN', 'ADMIN', 'CUSTOMER', 'SELLER', 'SELLER_OWNER', 'SELLER_STAFF'].includes(
          role
        )
      )
    ) {
      throw new AuthorizationError('Order authority required.');
    }
    const { id } = await params;

    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    const input = TransitionOrderStatusSchema.parse(payload);
    const permission = input.nextStatus === 'CANCELLED' ? 'orders:cancel' : 'orders:manage';
    if (!actor.roles.includes('SUPER_ADMIN') && !actor.permissions.includes(permission)) {
      throw new AuthorizationError(`Permission '${permission}' required.`);
    }

    // Determine actor role from auth context
    const actorRole = actor.roles?.some((role) => ['SUPER_ADMIN', 'ADMIN'].includes(role))
      ? 'ADMIN'
      : actor.roles?.some((role) => ['SELLER', 'SELLER_OWNER', 'SELLER_STAFF'].includes(role))
        ? 'SELLER'
        : 'CUSTOMER';

    const idempotencyKey = TransitionIdempotencyKeySchema.parse(req.headers.get('idempotency-key'));
    const result = await orderTransitionService.transitionOrderStatus({
      orderId: id,
      nextStatus: input.nextStatus,
      actorId: actor.userId,
      actorRole,
      reason: input.reason,
      metadata: input.metadata,
      idempotencyKey,
    });

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationErrorResponse(req, error);
    }
    return errorResponse(req, error);
  }
}
