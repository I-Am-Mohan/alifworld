import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serverCheckoutCalculationService } from '@/features/checkout';
import { CheckoutCalculationInputSchema } from '@/features/checkout/validators/calculation.validators';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { ValidationError } from '@/shared/errors/app-error';
import { authenticateRequest } from '@/shared/authz';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/checkout/quote
 * Calculates authoritative server-side checkout totals:
 * - Line item subtotal and price verification
 * - Automatic discounts and coupon code validation
 * - NBR Mushak-6.3 Value Added Tax (VAT) computation
 * - Multi-vendor parcel shipping rates & delivery promises
 * - Independent discrete Product Points snapshots
 * - Multi-vendor platform commission and seller payout splits
 */
export async function POST(req: NextRequest) {
  try {
    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    const validatedInput = CheckoutCalculationInputSchema.parse(payload);

    // Optional authentication check: if user has a valid Bearer token, extract customerId
    let customerId: string | null = null;
    try {
      const actor = authenticateRequest(req);
      customerId = actor?.userId || null;
    } catch {
      // Guest calculation session
    }

    const result = await serverCheckoutCalculationService.calculateCheckout(
      validatedInput,
      { customerId }
    );

    return NextResponse.json(
      {
        success: true,
        data: result,
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
