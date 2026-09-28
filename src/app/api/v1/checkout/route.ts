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
 * POST /api/v1/checkout
 * Authoritative checkout pipeline endpoint for mobile and web applications.
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
