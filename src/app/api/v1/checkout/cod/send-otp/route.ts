import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { codFraudRiskService } from '@/features/checkout';
import { SendCodOtpSchema } from '@/features/checkout/validators/cod-risk.validators';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { ValidationError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/checkout/cod/send-otp
 * Dispatches a 6-digit numeric SMS verification OTP to recipient's Bangladesh phone number.
 */
export async function POST(req: NextRequest) {
  try {
    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    const validatedInput = SendCodOtpSchema.parse(payload);

    const result = await codFraudRiskService.sendCodVerificationOtp(validatedInput.recipientPhone);

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
