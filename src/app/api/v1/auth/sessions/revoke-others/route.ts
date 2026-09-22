import { NextRequest, NextResponse } from 'next/server';
import { AuthTokenService } from '@/services/auth-token.service';
import { AppError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

const authTokenService = new AuthTokenService();

/**
 * POST /api/v1/auth/sessions/revoke-others
 * 
 * Revokes all active sessions for the authenticated user EXCEPT the current session.
 * Allows a user to log out from all other devices without interrupting their current session.
 * 
 * Invariants: ADR-0022, ADR-0031
 */
export async function POST(req: NextRequest) {
  const ipAddress = req.headers.get('x-forwarded-for') || req.ip || null;
  const userAgent = req.headers.get('user-agent') || null;

  try {
    const auth = await authTokenService.authenticateRequest(req);

    const result = await authTokenService.revokeOtherSessionsForUser({
      userId: auth.user.id,
      currentSessionId: auth.session.id,
      ipAddress,
      userAgent,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          message: 'All other sessions have been logged out successfully',
          revokedCount: result.revokedCount,
          currentSessionId: auth.session.id,
        },
      },
      { status: 200 }
    );
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
