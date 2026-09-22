import { NextRequest, NextResponse } from 'next/server';
import { AuthTokenService } from '@/services/auth-token.service';
import { clearAuthCookies } from '@/shared/auth/token-policy';

export const dynamic = 'force-dynamic';

const authTokenService = new AuthTokenService();

/**
 * POST /api/v1/auth/logout
 * 
 * Logs out the caller's active session:
 * 1. Resolves caller's active session and user credentials.
 * 2. Marks the session revoked in the database (reason: 'USER_LOGOUT').
 * 3. Records a security audit event for the logout.
 * 4. Clears both `aw_access_token` and `aw_refresh_token` secure cookies.
 * 
 * Idempotent: If token is expired or absent, still clears cookies and returns 200.
 */
export async function POST(req: NextRequest) {
  const ipAddress = req.headers.get('x-forwarded-for') || req.ip || null;
  const userAgent = req.headers.get('user-agent') || null;

  try {
    const auth = await authTokenService.authenticateRequest(req).catch(() => null);

    if (auth?.session) {
      await authTokenService.logout({
        sessionId: auth.session.id,
        userId: auth.user.id,
        ipAddress,
        userAgent,
        reason: 'USER_LOGOUT',
      });
    }

    const response = NextResponse.json(
      {
        success: true,
        data: {
          message: 'Logged out successfully',
        },
      },
      { status: 200 }
    );

    clearAuthCookies(response);
    return response;
  } catch {
    const response = NextResponse.json(
      {
        success: true,
        data: {
          message: 'Logged out successfully',
        },
      },
      { status: 200 }
    );

    clearAuthCookies(response);
    return response;
  }
}
