import { NextRequest, NextResponse } from 'next/server';
import { AuthTokenService } from '@/services/auth-token.service';
import { AppError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

const authTokenService = new AuthTokenService();

/**
 * GET /api/v1/auth/sessions
 * 
 * Lists all active authenticated sessions and registered devices for the current user.
 * Flags the caller's active session with `isCurrent: true`.
 * 
 * Invariants: ADR-0022, ADR-0031
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await authTokenService.authenticateRequest(req);

    const sessions = await authTokenService.listUserSessions(auth.user.id, auth.session.id);

    return NextResponse.json(
      {
        success: true,
        data: {
          sessions,
          total: sessions.length,
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
