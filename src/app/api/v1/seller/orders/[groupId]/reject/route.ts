import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/shared/authz';
import { sellerFulfillmentOrderService } from '@/features/orders/services/seller-fulfillment-order.service';
import {
  RejectFulfillmentOrderSchema,
  TransitionIdempotencyKeySchema,
} from '@/features/orders/validators/order.validators';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { AuthorizationError, ValidationError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

function resolveSellerId(actor: any): string {
  if (actor.sellerId) {
    return actor.sellerId;
  }
  throw new AuthorizationError('Seller authority required to manage fulfillment orders.', {
    code: 'SELLER_ACCESS_REQUIRED',
  });
}

function verifySellerOrderAuthority(actor: any): void {
  if (
    !actor.roles.some((role: string) =>
      ['SUPER_ADMIN', 'ADMIN', 'SELLER', 'SELLER_OWNER', 'SELLER_STAFF'].includes(role)
    )
  ) {
    throw new AuthorizationError('Seller authority required.');
  }
  if (
    !actor.roles.includes('SUPER_ADMIN') &&
    !actor.permissions?.some((permission: string) =>
      ['orders:manage', 'seller:orders:manage', 'seller.orders.write'].includes(permission)
    )
  ) {
    throw new AuthorizationError('Order management permission required.');
  }
}

/**
 * POST /api/v1/seller/orders/[groupId]/reject
 * Merchant workflow action: Reject fulfillment order (PENDING -> REJECTED).
 * Requires mandatory reason of at least 5 characters.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const actor = authenticateRequest(req);
    verifySellerOrderAuthority(actor);
    const sellerId = resolveSellerId(actor);
    const { groupId } = await params;

    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    const input = RejectFulfillmentOrderSchema.parse(payload);
    const idempotencyKey = TransitionIdempotencyKeySchema.parse(req.headers.get('idempotency-key'));
    const actorRole = actor.roles.some((role: string) => ['SUPER_ADMIN', 'ADMIN'].includes(role))
      ? 'ADMIN'
      : 'SELLER';

    const result = await sellerFulfillmentOrderService.rejectFulfillmentOrder(
      groupId,
      sellerId,
      input,
      {
        actorId: actor.userId,
        actorRole,
        idempotencyKey,
      }
    );

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationErrorResponse(req, error);
    }
    return errorResponse(req, error);
  }
}
