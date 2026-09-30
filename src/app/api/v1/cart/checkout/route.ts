/**
 * Customer Cart Checkout API Route
 *
 * Enforces strict object-level cart ownership, idempotency key replay safety,
 * server-side recomputation, and multi-vendor seller fulfillment group partitioning.
 *
 * Invariants: ADR-0003, ADR-0010, ADR-0022, ADR-0027, Milestone 131
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { checkoutOrchestratorService } from '@/features/checkout';
import {
  CartCheckoutPayloadSchema,
  IdempotencyKeyHeaderSchema,
} from '@/features/checkout/validators/checkout.validators';
import { errorResponse } from '@/shared/api/error-response';
import { ValidationError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/cart/checkout
 * Performs atomic checkout for the customer's owned cart.
 */
export async function POST(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    const idempotencyKeyHeader = req.headers.get('Idempotency-Key');

    if (!idempotencyKeyHeader) {
      throw new ValidationError('Idempotency-Key header is required for checkout.');
    }

    const idempotencyKey = IdempotencyKeyHeaderSchema.parse(idempotencyKeyHeader);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    const parseResult = CartCheckoutPayloadSchema.parse(body);

    // Execute authoritative idempotent checkout transaction
    const order = await checkoutOrchestratorService.executeCheckout(actor.userId, {
      cartId: parseResult.cartId,
      checkout: parseResult.checkout,
      idempotencyKey,
      couponCode: parseResult.couponCode,
    });

    const status = order.isIdempotentReplay ? 200 : 201;

    return NextResponse.json(
      {
        success: true,
        data: order,
      },
      { status }
    );
  } catch (error) {
    return errorResponse(req, error);
  }
}
