import { NextRequest, NextResponse } from 'next/server';
import { PasswordSecurityService } from '@/services/password-security.service';
import { resetPasswordSchema } from '@/validators/auth.validator';
import { AppError, RateLimitError } from '@/shared/errors/app-error';
import { clearAuthCookies } from '@/shared/auth/token-policy';
import { assertRateLimit, applyRateLimitHeaders, getRateLimitPolicies } from '@/shared/rate-limit';
import { AuditService } from '@/shared/audit';

export const dynamic = 'force-dynamic';

const passwordService = new PasswordSecurityService();
const policies = getRateLimitPolicies();

export async function POST(req: NextRequest) {
  const reqMeta = AuditService.extractRequestMeta(req);

  try {
    const parsed = resetPasswordSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Invalid password reset payload.',
            details: parsed.error.flatten(),
          },
        },
        { status: 422 }
      );
    }

    // 1. Enforce rate limiting on password reset token consumption
    const rateLimitResult = await assertRateLimit(
      req,
      policies.AUTH_PASSWORD_RESET_SUBMIT,
      parsed.data.email
    );

    const result = await passwordService.resetPassword(
      parsed.data.email,
      parsed.data.token,
      parsed.data.newPassword,
      {
        ipAddress: reqMeta.ipAddress,
        userAgent: reqMeta.userAgent,
      }
    );

    const response = NextResponse.json({ success: true, data: result }, { status: 200 });
    clearAuthCookies(response);
    applyRateLimitHeaders(response, rateLimitResult);
    return response;
  } catch (error: any) {
    if (error instanceof RateLimitError) {
      const rateLimitResponse = NextResponse.json(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
          },
        },
        { status: 429 }
      );
      rateLimitResponse.headers.set('Retry-After', String(error.retryAfterSeconds));
      return rateLimitResponse;
    }

    if (error instanceof AppError) {
      return NextResponse.json(error.toJSON(), { status: error.statusCode });
    }

    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Password reset failed.' },
      },
      { status: 500 }
    );
  }
}
