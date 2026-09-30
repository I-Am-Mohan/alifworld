import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/shared/authz';
import { orderTransitionService } from '@/features/orders/state-machines/order-transition.service';
import {
  TransitionFulfillmentGroupStatusSchema,
  TransitionIdempotencyKeySchema,
} from '@/features/orders/validators/order.validators';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { AuthorizationError, ValidationError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

function resolveSellerId(actor: any): string {
  if (actor.sellerId) {
    return actor.sellerId;
  }
  throw new AuthorizationError('Seller authority required to manage fulfillment groups.', {
    code: 'SELLER_ACCESS_REQUIRED',
  });
}

/**
 * PATCH /api/v1/seller/orders/[groupId]/status
 * Transitions a seller fulfillment group through the explicit state machine.
 * Seller-only endpoint with strict tenant isolation.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const actor = authenticateRequest(req);
    if (
      !actor.roles.some((role) =>
        ['SUPER_ADMIN', 'ADMIN', 'SELLER', 'SELLER_OWNER', 'SELLER_STAFF'].includes(role)
      )
    ) {
      throw new AuthorizationError('Seller authority required.');
    }
    const sellerId = resolveSellerId(actor);
    const { groupId } = await params;

    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    const input = TransitionFulfillmentGroupStatusSchema.parse(payload);
    if (
      !actor.roles.includes('SUPER_ADMIN') &&
      !actor.permissions.some((permission) =>
        ['orders:manage', 'seller:orders:manage'].includes(permission)
      )
    ) {
      throw new AuthorizationError('Order management permission required.');
    }

    const actorRole = actor.roles.some((role) => ['SUPER_ADMIN', 'ADMIN'].includes(role))
      ? 'ADMIN'
      : 'SELLER';

    const idempotencyKey = TransitionIdempotencyKeySchema.parse(req.headers.get('idempotency-key'));
    const result = await orderTransitionService.transitionFulfillmentGroupStatus({
      groupId,
      sellerId,
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
