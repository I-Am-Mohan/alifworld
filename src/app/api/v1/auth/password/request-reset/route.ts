import { NextRequest, NextResponse } from 'next/server';
import { PasswordSecurityService } from '@/services/password-security.service';
import { requestPasswordResetSchema } from '@/validators/auth.validator';
import { AppError, RateLimitError } from '@/shared/errors/app-error';
import { assertRateLimit, applyRateLimitHeaders, getRateLimitPolicies } from '@/shared/rate-limit';
import { AuditService } from '@/shared/audit';

export const dynamic = 'force-dynamic';

const passwordService = new PasswordSecurityService();
const policies = getRateLimitPolicies();

/**
 * POST /api/v1/auth/password/request-reset
 * Returns a neutral response to prevent account enumeration.
 * Rate-limited to 3 requests per hour per email/IP.
 */
export async function POST(req: NextRequest) {
  const reqMeta = AuditService.extractRequestMeta(req);

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

    // 1. Enforce rate limiting on password reset requests
    const rateLimitResult = await assertRateLimit(
      req,
      policies.AUTH_PASSWORD_RESET,
      parsed.data.email
    );

    const result = await passwordService.requestPasswordReset(
      parsed.data.email,
      parsed.data.locale,
      {
        ipAddress: reqMeta.ipAddress,
        userAgent: reqMeta.userAgent,
      }
    );

    const response = NextResponse.json({ success: true, data: result }, { status: 200 });
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
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
          },
        },
        { status: error.statusCode }
      );
    }

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
