import { NextRequest, NextResponse } from 'next/server';
import { verifyEmailSchema } from '@/validators/auth.validator';
import { EmailVerificationService } from '@/services/email-verification.service';
import { ValidationError, NotFoundError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

const verificationService = new EmailVerificationService();

/**
 * POST /api/v1/auth/email/verify
 * 
 * Verifies a customer email address using a submitted 6-digit numeric OTP code.
 * Upon successful verification, marks user as email-verified in the database.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parseResult = verifyEmailSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Invalid verification payload',
            details: parseResult.error.flatten(),
          },
        },
        { status: 422 }
      );
    }

    const { email, code } = parseResult.data;
    const result = await verificationService.verifyEmail(email, code);

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 200 }
    );
  } catch (error: any) {
    if (error instanceof NotFoundError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: error.message,
          },
        },
        { status: 404 }
      );
    }

    if (error instanceof ValidationError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VERIFICATION_FAILED',
            message: error.message,
            details: error.details,
          },
        },
        { status: 422 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Email verification processing failed',
        },
      },
      { status: 500 }
    );
  }
}
