import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { shippingRateService } from '@/features/shipping';
import { CalculateShippingRatesSchema } from '@/features/shipping/validators/shipping-rate.validators';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { ValidationError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/shipping/rates/quote
 * Calculates authoritative multi-vendor shipping rate quotes, package weight tiers,
 * free delivery qualifications, and delivery promise windows in 'Asia/Dhaka'.
 * Accessible to both guest carts and authenticated checkout sessions.
 */
export async function POST(req: NextRequest) {
  try {
    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    const validatedInput = CalculateShippingRatesSchema.parse(payload);

    const quote = await shippingRateService.calculateOrderShippingQuote(validatedInput);

    return NextResponse.json(
      {
        success: true,
        data: quote,
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
