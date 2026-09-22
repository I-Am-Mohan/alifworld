import { NextRequest, NextResponse } from 'next/server';
import { loginSchema } from '@/validators/auth.validator';
import { AuthLoginService } from '@/services/auth-login.service';
import { AppError, RateLimitError, UnauthorizedError } from '@/shared/errors/app-error';
import { assertRateLimit, applyRateLimitHeaders, getRateLimitPolicies } from '@/shared/rate-limit';
import { auditService, AuditService } from '@/shared/audit';
import { AUDIT_ACTIONS } from '@/shared/audit/audit.interface';

export const dynamic = 'force-dynamic';

const authLoginService = new AuthLoginService();
const policies = getRateLimitPolicies();

/**
 * POST /api/v1/auth/login
 * 
 * Authenticates user credentials (email or Bangladesh mobile number) and issues
 * access token and rotating refresh token.
 * 
 * Rate-limited via Redis sliding-window token bucket with automatic IP + identifier keying.
 * Audits every login attempt (success, failure, rate limit violation) with redaction guarantees.
 */
export async function POST(req: NextRequest) {
  const reqMeta = AuditService.extractRequestMeta(req);
  let attemptIdentifier: string | undefined;

  try {
    const body = await req.json().catch(() => ({}));
    const parseResult = loginSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Invalid login parameters',
            details: parseResult.error.flatten(),
          },
        },
        { status: 422 }
      );
    }

    attemptIdentifier = parseResult.data.identifier;

    // 1. Enforce distributed rate limiting
    const rateLimitResult = await assertRateLimit(
      req,
      policies.AUTH_LOGIN,
      attemptIdentifier
    );

    // 2. Perform authentication and session initialization
    const result = await authLoginService.login(parseResult.data, {
      ipAddress: reqMeta.ipAddress,
      userAgent: reqMeta.userAgent,
    });

    // 3. Security Audit Event for successful login
    await auditService.log({
      actorId: result.user.id,
      actorRole: result.user.roles[0] || 'CUSTOMER',
      action: AUDIT_ACTIONS.AUTH_LOGIN_SUCCESS,
      resource: 'User',
      resourceId: result.user.id,
      requestId: reqMeta.requestId,
      ipAddress: reqMeta.ipAddress,
      userAgent: reqMeta.userAgent,
      metadata: {
        clientType: parseResult.data.clientType,
        sessionId: result.sessionId,
        isEmailVerified: result.user.isEmailVerified,
        isPhoneVerified: result.user.isPhoneVerified,
      },
    });

    const response = NextResponse.json(
      {
        success: true,
        data: {
          user: result.user,
          tokens: result.tokens,
          sessionId: result.sessionId,
        },
      },
      { status: 200 }
    );

    // Set secure HttpOnly cookies for web browsers
    if (parseResult.data.clientType === 'WEB') {
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

    // Apply rate limit response headers
    applyRateLimitHeaders(response, rateLimitResult);

    return response;
  } catch (error: any) {
    // Audit failed login attempts for brute-force tracking
    if (error instanceof UnauthorizedError) {
      await auditService.log({
        actorId: attemptIdentifier || null,
        actorRole: 'ANONYMOUS',
        action: AUDIT_ACTIONS.AUTH_LOGIN_FAILED,
        resource: 'User',
        resourceId: attemptIdentifier || null,
        requestId: reqMeta.requestId,
        ipAddress: reqMeta.ipAddress,
        userAgent: reqMeta.userAgent,
        metadata: {
          identifier: attemptIdentifier,
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
          message: error.message || 'Authentication processing failed',
        },
      },
      { status: 500 }
    );
  }
}
