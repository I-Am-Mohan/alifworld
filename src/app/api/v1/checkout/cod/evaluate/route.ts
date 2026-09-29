import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { codFraudRiskService } from '@/features/checkout';
import { EvaluateCodEligibilitySchema } from '@/features/checkout/validators/cod-risk.validators';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { ValidationError } from '@/shared/errors/app-error';
import { authenticateRequest } from '@/shared/authz';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/checkout/cod/evaluate
 * Evaluates Cash on Delivery (COD) eligibility, calculates risk score (0-100),
 * and determines if SMS OTP verification or 100% digital prepayment is required.
 */
export async function POST(req: NextRequest) {
  try {
    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    const validatedInput = EvaluateCodEligibilitySchema.parse(payload);

    // Optional customer authentication
    let customerId: string | null = null;
    try {
      const actor = authenticateRequest(req);
      customerId = actor?.userId || null;
    } catch {
      // Guest calculation session
    }

    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      undefined;

    const evaluation = await codFraudRiskService.evaluateCodEligibility(
      {
        ...validatedInput,
        clientIp: validatedInput.clientIp || clientIp,
      },
      customerId
    );

    return NextResponse.json(
      {
        success: true,
        data: evaluation,
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
