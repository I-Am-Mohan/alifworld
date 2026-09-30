import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { finalOrderReviewService } from '@/features/checkout';
import { GenerateOrderReviewSchema } from '@/features/checkout/validators/order-review.validators';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { ValidationError } from '@/shared/errors/app-error';
import { authenticateRequest } from '@/shared/authz';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/checkout/review
 * Generates comprehensive pre-placement order review:
 * - Multi-vendor seller fulfillment packages
 * - Authoritative financial totals & discrete Product Points
 * - Selected payment method instructions and readiness
 * - Mandatory regulatory consents (Terms, Privacy, Returns, COD Agreement)
 * - Cryptographic review fingerprint
 */
export async function POST(req: NextRequest) {
  try {
    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    const validatedInput = GenerateOrderReviewSchema.parse(payload);

    // Optional customer authentication
    let customerId: string | null = null;
    try {
      const actor = authenticateRequest(req);
      customerId = actor?.userId || null;
    } catch {
      // Guest calculation session
    }

    const review = await finalOrderReviewService.generateOrderReview(validatedInput, customerId);

    return NextResponse.json(
      {
        success: true,
        data: review,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationErrorResponse(req, error);
    }
    return errorResponse(req, error);
  }
}
