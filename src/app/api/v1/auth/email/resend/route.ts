import { NextRequest, NextResponse } from 'next/server';
import { resendVerificationSchema } from '@/validators/auth.validator';
import { EmailVerificationService } from '@/services/email-verification.service';
import { ValidationError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

const verificationService = new EmailVerificationService();

/**
 * POST /api/v1/auth/email/resend
 * 
 * Resends a 6-digit email verification code with a 60-second cooldown
 * and a strict limit of 3 resends per hour to prevent spam and abuse.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parseResult = resendVerificationSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Invalid resend payload',
            details: parseResult.error.flatten(),
          },
        },
        { status: 422 }
      );
    }

    const { email } = parseResult.data;
    const result = await verificationService.resendVerificationCode(email);

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 200 }
    );
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RESEND_COOLDOWN_ACTIVE',
            message: error.message,
            details: error.details,
          },
        },
        { status: 429 } // Rate limited / cooldown active
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Resend request failed',
        },
      },
      { status: 500 }
    );
  }
}
