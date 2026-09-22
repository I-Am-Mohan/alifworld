import { NextRequest, NextResponse } from 'next/server';
import { PhoneAuthService } from '@/services/phone-auth.service';
import { AppError, RateLimitError } from '@/shared/errors/app-error';
import { assertRateLimit, applyRateLimitHeaders, getRateLimitPolicies } from '@/shared/rate-limit';
import { auditService, AuditService } from '@/shared/audit';
import { AUDIT_ACTIONS } from '@/shared/audit/audit.interface';

export const dynamic = 'force-dynamic';

const phoneAuthService = new PhoneAuthService();
const policies = getRateLimitPolicies();

/**
 * POST /api/v1/auth/phone/verify-login
 * 
 * Verifies the 6-digit OTP code sent to the phone, validates attempts,
 * and issues active session tokens with cookies for Web browsers.
 * 
 * Throttled to 5 verification attempts per 15 minutes.
 */
export async function POST(req: NextRequest) {
  const reqMeta = AuditService.extractRequestMeta(req);
  let attemptPhone: string | undefined;

  try {
    const body = await req.json().catch(() => ({}));
    const { phone, code, clientType = 'WEB' } = body;
    attemptPhone = phone;

    if (!phone || !code) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Phone number and verification code are required',
          },
        },
        { status: 422 }
      );
    }

    // 1. Enforce rate limiting on verification attempts
    const rateLimitResult = await assertRateLimit(
      req,
      policies.AUTH_PHONE_VERIFY,
      phone
    );

    const result = await phoneAuthService.verifyLoginOtp(phone, code, clientType, {
      ipAddress: reqMeta.ipAddress,
      userAgent: reqMeta.userAgent,
    });

    // 2. Audit log on successful verification
    await auditService.log({
      actorId: result.user.id,
      actorRole: result.user.roles[0] || 'CUSTOMER',
      action: AUDIT_ACTIONS.OTP_VERIFIED,
      resource: 'PhoneOTP',
      resourceId: phone,
      requestId: reqMeta.requestId,
      ipAddress: reqMeta.ipAddress,
      userAgent: reqMeta.userAgent,
      metadata: {
        userId: result.user.id,
        sessionId: result.sessionId,
      },
    });

    const response = NextResponse.json(
      {
        success: true,
        data: {
          user: result.user,
          tokens: result.tokens,
          sessionId: result.sessionId,
          message: result.message,
        },
      },
      { status: 200 }
    );

    // Set secure HttpOnly cookies for web browsers
    if (clientType === 'WEB' && result.cookies) {
      for (const cookieOpt of result.cookies) {
        response.cookies.set({
          name: cookieOpt.name,
          value: cookieOpt.value,
          httpOnly: cookieOpt.httpOnly,
          secure: cookieOpt.secure,
          sameSite: cookieOpt.sameSite,
          path: cookieOpt.path,
          maxAge: cookieOpt.maxAge,
        });
      }
    }

    applyRateLimitHeaders(response, rateLimitResult);
    return response;
  } catch (error: any) {
    if (attemptPhone) {
      await auditService.log({
        actorId: attemptPhone,
        actorRole: 'ANONYMOUS',
        action: AUDIT_ACTIONS.OTP_FAILED,
        resource: 'PhoneOTP',
        resourceId: attemptPhone,
        requestId: reqMeta.requestId,
        ipAddress: reqMeta.ipAddress,
        userAgent: reqMeta.userAgent,
        metadata: {
          reason: error.message,
        },
      });
    }

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
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'OTP verification failed',
        },
      },
      { status: 500 }
    );
  }
}
