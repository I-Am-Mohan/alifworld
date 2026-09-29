import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { codFraudRiskService } from '@/features/checkout';
import { VerifyCodOtpSchema } from '@/features/checkout/validators/cod-risk.validators';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { ValidationError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/checkout/cod/verify-otp
 * Verifies recipient phone OTP and returns a single-use verification token for checkout.
 */
export async function POST(req: NextRequest) {
  try {
    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    const validatedInput = VerifyCodOtpSchema.parse(payload);

    const result = await codFraudRiskService.verifyCodOtp(
      validatedInput.recipientPhone,
      validatedInput.otp
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
