import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/shared/authz';
import { courierDispatchService } from '@/features/shipping';
import { VerifyInHouseDeliverySchema } from '@/features/shipping/validators/courier.validators';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { ValidationError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/shipping/in-house/verify-delivery
 * Verifies doorstep delivery of an In-House parcel using a customer OTP / PIN code.
 * Requires authenticated rider or admin.
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

    const validatedInput = VerifyInHouseDeliverySchema.parse(payload);

    const result = await courierDispatchService.verifyInHouseDelivery(
      validatedInput,
      actor.userId
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationErrorResponse(req, error);
    }
    return errorResponse(req, error);
  }
}
