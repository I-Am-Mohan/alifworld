import { NextRequest, NextResponse } from 'next/server';
import { deliveryServiceabilityService } from '@/features/shipping';
import { ValidateAddressServiceabilitySchema } from '@/features/shipping/validators/serviceability.validators';
import { errorResponse } from '@/shared/api/error-response';
import { ValidationError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/shipping/serviceability
 * Validates a Bangladesh delivery address, evaluates courier serviceability,
 * calculates delivery promise timeline, and determines Cash on Delivery (COD) eligibility.
 */
export async function POST(req: NextRequest) {
  try {
    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    const validatedInput = ValidateAddressServiceabilitySchema.parse(payload);

    const result = await deliveryServiceabilityService.checkAddressServiceability(
      validatedInput
    );

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(req, error);
  }
}
