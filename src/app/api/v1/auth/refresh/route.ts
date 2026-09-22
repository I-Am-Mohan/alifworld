import { NextRequest, NextResponse } from 'next/server';
import { refreshTokenSchema } from '@/validators/auth.validator';
import { AuthTokenService } from '@/services/auth-token.service';
import { TOKEN_POLICIES } from '@/shared/auth/token-policy';
import { extractBearerToken } from '@/shared/auth/jwt';
import { AppError, RateLimitError, TokenReuseDetectedError } from '@/shared/errors/app-error';
import { assertRateLimit, applyRateLimitHeaders, getRateLimitPolicies } from '@/shared/rate-limit';

export const dynamic = 'force-dynamic';

const authTokenService = new AuthTokenService();
const policies = getRateLimitPolicies();

/**
 * POST /api/v1/auth/refresh
 * 
 * Rotates a single-use refresh token within an authenticated token family.
 * Validates family lineage and detects token replay/reuse attacks.
 * 
 * Rate-limited to 30 requests per minute.
 */
export async function POST(req: NextRequest) {
  let requestedClientType: 'WEB' | 'MOBILE_FLUTTER' | 'POS' | 'ADMIN_PORTAL' = 'WEB';

  try {
    // 1. Enforce rate limiting on token rotation
    const rateLimitResult = await assertRateLimit(req, policies.AUTH_TOKEN_REFRESH);

    const body = await req.json().catch(() => ({}));
    const parseResult = refreshTokenSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Invalid refresh parameters',
            details: parseResult.error.flatten(),
          },
        },
        { status: 422 }
      );
    }

    requestedClientType = parseResult.data.clientType;

    // 2. Extract token: check payload first, then HttpOnly cookie, then Authorization header
    let token = parseResult.data.refreshToken || null;

    if (!token) {
      token = req.cookies.get(TOKEN_POLICIES.REFRESH_TOKEN_COOKIE_NAME)?.value || null;
    }

    if (!token) {
      token = extractBearerToken(req.headers.get('authorization'));
    }

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Refresh token is required (via cookie or refreshToken parameter)',
          },
        },
        { status: 422 }
      );
    }

    // 3. Perform atomic single-use rotation and reuse detection
    const result = await authTokenService.rotateRefreshToken(token, requestedClientType);

    const response = NextResponse.json(
      {
        success: true,
        data: {
          tokens: {
            accessToken: result.accessToken,
            refreshToken:
              requestedClientType === 'MOBILE_FLUTTER' || requestedClientType === 'POS'
                ? result.refreshToken
                : undefined,
            tokenType: result.tokenType,
            expiresIn: result.expiresIn,
            refreshExpiresIn: result.refreshExpiresIn,
          },
          user: result.user,
          sessionId: result.sessionId,
        },
      },
      { status: 200 }
    );

    // 4. Set secure HttpOnly cookies for web browsers
    if (requestedClientType === 'WEB') {
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

    const errorResponse = NextResponse.json(
      {
        success: false,
        error: {
          code: error instanceof AppError ? error.code : 'UNAUTHORIZED',
          message: error.message || 'Token refresh failed',
          details: error instanceof AppError ? error.details : undefined,
        },
      },
      { status: error instanceof AppError ? error.statusCode : 401 }
    );

    // If reuse detected or session is unauthenticated, wipe browser cookies immediately
    if (
      requestedClientType === 'WEB' &&
      (error instanceof TokenReuseDetectedError ||
        (error instanceof AppError && error.statusCode === 401) ||
        !error.statusCode)
    ) {
      errorResponse.cookies.set({
        name: TOKEN_POLICIES.ACCESS_TOKEN_COOKIE_NAME,
        value: '',
        httpOnly: true,
        path: '/',
        maxAge: 0,
      });
      errorResponse.cookies.set({
        name: TOKEN_POLICIES.REFRESH_TOKEN_COOKIE_NAME,
        value: '',
        httpOnly: true,
        path: '/api/v1/auth',
        maxAge: 0,
      });
    }

    return errorResponse;
  }
}
