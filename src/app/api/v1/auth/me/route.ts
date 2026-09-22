import { NextRequest, NextResponse } from 'next/server';
import { AuthLoginService } from '@/services/auth-login.service';
import { extractBearerToken } from '@/shared/auth/jwt';
import { TOKEN_POLICIES } from '@/shared/auth/token-policy';
import { AppError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

const authLoginService = new AuthLoginService();

/**
 * GET /api/v1/auth/me
 * 
 * Returns authenticated user profile, assigned roles, permissions, multi-wallets,
 * and loyalty point balances for the currently active session.
 * 
 * Accepts token via `Authorization: Bearer <token>` or `aw_access_token` cookie.
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Try Authorization header
    const authHeader = req.headers.get('authorization');
    let token = extractBearerToken(authHeader);

    // 2. Fall back to HttpOnly access token cookie
    if (!token) {
      token = req.cookies.get(TOKEN_POLICIES.ACCESS_TOKEN_COOKIE_NAME)?.value || null;
    }

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication credentials required',
          },
        },
        { status: 401 }
      );
    }

    const profile = await authLoginService.getCurrentUser(token);

    return NextResponse.json(
      {
        success: true,
        data: profile,
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
          message: error.message || 'Session invalid or expired',
        },
      },
      { status: 401 }
    );
  }
}
