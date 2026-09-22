import { NextResponse } from 'next/server';
import { TOKEN_POLICIES, PASSWORD_POLICY } from '@/shared/auth/token-policy';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/auth/token/policy
 * 
 * Public discovery endpoint for clients (web browsers, mobile Flutter apps)
 * defining token lifetimes, cookie policies, and password complexity constraints.
 */
export async function GET() {
  return NextResponse.json(
    {
      success: true,
      data: {
        tokenPolicies: {
          accessTokenTtlSeconds: TOKEN_POLICIES.ACCESS_TOKEN_TTL_SECONDS,
          webRefreshTokenTtlSeconds: TOKEN_POLICIES.WEB_REFRESH_TOKEN_TTL_SECONDS,
          mobileRefreshTokenTtlSeconds: TOKEN_POLICIES.MOBILE_REFRESH_TOKEN_TTL_SECONDS,
          sessionInactivityTimeoutSeconds: TOKEN_POLICIES.SESSION_INACTIVITY_TIMEOUT_SECONDS,
          maxActiveSessionsPerUser: TOKEN_POLICIES.MAX_ACTIVE_SESSIONS_PER_USER,
          otpTokenTtlSeconds: TOKEN_POLICIES.OTP_TOKEN_TTL_SECONDS,
          maxOtpAttempts: TOKEN_POLICIES.MAX_OTP_ATTEMPTS,
        },
        cookieSettings: {
          accessTokenCookie: TOKEN_POLICIES.ACCESS_TOKEN_COOKIE_NAME,
          refreshTokenCookie: TOKEN_POLICIES.REFRESH_TOKEN_COOKIE_NAME,
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
        },
        passwordRequirements: {
          minLength: PASSWORD_POLICY.MIN_LENGTH,
          maxLength: PASSWORD_POLICY.MAX_LENGTH,
          rules: PASSWORD_POLICY.REQUIREMENTS,
        },
        supportedClientTypes: ['WEB', 'MOBILE_FLUTTER', 'POS', 'ADMIN_PORTAL'],
        supportedTokenTypes: ['Bearer'],
      },
    },
    { status: 200 }
  );
}
