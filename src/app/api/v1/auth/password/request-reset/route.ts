import { NextRequest, NextResponse } from 'next/server';
import { PasswordSecurityService } from '@/services/password-security.service';
import { requestPasswordResetSchema } from '@/validators/auth.validator';

export const dynamic = 'force-dynamic';

const passwordService = new PasswordSecurityService();

/**
 * POST /api/v1/auth/password/request-reset
 * Returns a neutral response to prevent account enumeration.
 */
export async function POST(req: NextRequest) {
  try {
    const parsed = requestPasswordResetSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Invalid password reset request.',
            details: parsed.error.flatten(),
          },
        },
        { status: 422 }
      );
    }

    const result = await passwordService.requestPasswordReset(
      parsed.data.email,
      parsed.data.locale,
      {
        ipAddress: req.headers.get('x-forwarded-for') || req.ip || null,
        userAgent: req.headers.get('user-agent'),
      }
    );
    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'PASSWORD_RESET_REQUEST_FAILED',
          message: 'Password reset instructions could not be queued. Please try again.',
        },
      },
      { status: 503 }
    );
  }
}
