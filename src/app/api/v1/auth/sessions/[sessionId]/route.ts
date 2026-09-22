import { NextRequest, NextResponse } from 'next/server';
import { AuthTokenService } from '@/services/auth-token.service';
import { AppError } from '@/shared/errors/app-error';
import { clearAuthCookies } from '@/shared/auth/token-policy';

export const dynamic = 'force-dynamic';

const authTokenService = new AuthTokenService();

/**
 * DELETE /api/v1/auth/sessions/:sessionId
 * 
 * Revokes a specific authenticated session/device belonging to the caller.
 * If the revoked session is the caller's current session, clears auth cookies as well.
 * 
 * Invariants: ADR-0022, ADR-0031
 */
export async function DELETE(
  req: NextRequest,
  context: { params: { sessionId: string } }
) {
  const ipAddress = req.headers.get('x-forwarded-for') || req.ip || null;
  const userAgent = req.headers.get('user-agent') || null;

  try {
    const auth = await authTokenService.authenticateRequest(req);
    const { sessionId } = await Promise.resolve(context.params);

    if (!sessionId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Session ID parameter is required',
          },
        },
        { status: 422 }
      );
    }

    await authTokenService.revokeSessionForUser({
      userId: auth.user.id,
      sessionId,
      reason: 'USER_REVOKED_DEVICE',
      ipAddress,
      userAgent,
    });

    const isCurrent = sessionId === auth.session.id;

    const response = NextResponse.json(
      {
        success: true,
        data: {
          message: isCurrent
            ? 'Current session logged out successfully'
            : 'Session revoked successfully',
          sessionId,
          isCurrent,
        },
      },
      { status: 200 }
    );

    if (isCurrent) {
      clearAuthCookies(response);
    }

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
