import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { shippingRateService } from '@/features/shipping';
import { CalculateShippingPromiseSchema } from '@/features/shipping/validators/shipping-rate.validators';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { ValidationError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/shipping/promise
 * Evaluates delivery promise timelines, business calendar boundaries,
 * and daily order cutoff times in 'Asia/Dhaka'.
 */
export async function POST(req: NextRequest) {
  try {
    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    const validatedInput = CalculateShippingPromiseSchema.parse(payload);

    const promise = await shippingRateService.calculateDeliveryPromise(validatedInput);

    return NextResponse.json(
      {
        success: true,
        data: promise,
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
