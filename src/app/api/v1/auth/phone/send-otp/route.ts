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
 * POST /api/v1/auth/phone/send-otp
 * 
 * Generates and dispatches a 6-digit numeric OTP to a Bangladesh mobile number.
 * Supports purpose: 'LOGIN' | 'REGISTRATION'
 * 
 * Throttled to 3 OTP requests per hour per mobile number with sliding window.
 */
export async function POST(req: NextRequest) {
  const reqMeta = AuditService.extractRequestMeta(req);

  try {
    const body = await req.json().catch(() => ({}));
    const { phone, purpose = 'LOGIN' } = body;

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Phone number is required',
          },
        },
        { status: 422 }
      );
    }

    // 1. Enforce SMS rate limiting (max 3/hr per phone + IP)
    const rateLimitResult = await assertRateLimit(
      req,
      policies.AUTH_SMS_OTP,
      phone
    );

    // 2. Dispatch OTP
    const result =
      purpose === 'REGISTRATION'
        ? await phoneAuthService.sendRegisterOtp(phone)
        : await phoneAuthService.sendLoginOtp(phone);

    // 3. Security Audit Log
    await auditService.log({
      actorId: phone,
      actorRole: 'ANONYMOUS',
      action: AUDIT_ACTIONS.OTP_DISPATCHED,
      resource: 'PhoneOTP',
      resourceId: phone,
      requestId: reqMeta.requestId,
      ipAddress: reqMeta.ipAddress,
      userAgent: reqMeta.userAgent,
      metadata: {
        purpose,
        operator: result.operator,
      },
    });

    const response = NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 200 }
    );

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
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to send OTP code',
        },
      },
      { status: 500 }
    );
  }
}
