import { NextRequest, NextResponse } from 'next/server';
import { AuthTokenService } from '@/services/auth-token.service';
import { AppError } from '@/shared/errors/app-error';
import { clearAuthCookies } from '@/shared/auth/token-policy';

export const dynamic = 'force-dynamic';

const authTokenService = new AuthTokenService();

/**
 * POST /api/v1/auth/sessions/revoke-all
 * 
 * Globally terminates ALL active sessions and devices for the authenticated user,
 * increments the user's global `tokenVersion` (invalidating all outstanding JWTs),
 * clears authentication cookies, and requires re-authentication everywhere.
 * 
 * Invariants: ADR-0022, ADR-0031
 */
export async function POST(req: NextRequest) {
  const ipAddress = req.headers.get('x-forwarded-for') || (req as any).ip || null;
  const userAgent = req.headers.get('user-agent') || null;

  try {
    const auth = await authTokenService.authenticateRequest(req);

    const newTokenVersion = await authTokenService.revokeAllSessionsForUser({
      userId: auth.user.id,
      reason: 'USER_INITIATED_GLOBAL_LOGOUT',
      ipAddress,
      userAgent,
    });

    const response = NextResponse.json(
      {
        success: true,
        data: {
          message: 'All sessions terminated everywhere. Please sign in again.',
          tokenVersion: newTokenVersion,
        },
      },
      { status: 200 }
    );

    clearAuthCookies(response);
    return response;
  } catch (error: any) {
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
          code: 'UNAUTHORIZED',
          message: error.message || 'Authentication required',
        },
      },
      { status: 401 }
    );
  }
}
