import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/shared/authz';
import { placeOrderTransactionService } from '@/features/checkout';
import { PlaceOrderSchema } from '@/features/checkout/validators/order-review.validators';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { ValidationError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/checkout/place-order
 * Commits the atomic place-order transaction on the server:
 * - Enforces mandatory customer consent (Terms, Privacy, Returns, COD Agreement)
 * - Deterministic idempotency verification and replay detection
 * - Concurrent inventory revalidation and cart conversion
 * - Multi-vendor seller fulfillment group partitioning
 * - Immutable order item price & Product Point snapshots
 * - Append-only order status history logging
 * - Customer wallet deduction or payment gateway record creation
 */
export async function POST(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);

    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    // Allow idempotency key from header or payload
    const headerIdempotencyKey = req.headers.get('idempotency-key');
    const bodyObj = (payload || {}) as Record<string, any>;
    if (!bodyObj.idempotencyKey && headerIdempotencyKey) {
      bodyObj.idempotencyKey = headerIdempotencyKey;
    }

    const validatedInput = PlaceOrderSchema.parse(bodyObj);

    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      undefined;

    const result = await placeOrderTransactionService.placeOrder(
      validatedInput,
      actor.userId,
      clientIp
    );

    const statusCode = result.isIdempotentReplay ? 200 : 201;

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: statusCode }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationErrorResponse(req, error);
    }
    return errorResponse(req, error);
  }
}
