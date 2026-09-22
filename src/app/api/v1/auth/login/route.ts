import { NextRequest, NextResponse } from 'next/server';
import { loginSchema } from '@/validators/auth.validator';
import { AuthLoginService } from '@/services/auth-login.service';
import { AppError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

const authLoginService = new AuthLoginService();

/**
 * POST /api/v1/auth/login
 * 
 * Authenticates user credentials (email or Bangladesh mobile number) and issues
 * access token and rotating refresh token.
 * 
 * For Web clients (clientType='WEB'):
 * Sets HttpOnly, Secure, SameSite=Lax cookies for both access and refresh tokens.
 * 
 * For Mobile Flutter clients (clientType='MOBILE_FLUTTER'):
 * Returns standard RFC 6749 Bearer tokens in the response JSON payload.
 */
export async function POST(req: NextRequest) {
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

    const ipAddress =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      null;
    const userAgent = req.headers.get('user-agent') || null;

    const result = await authLoginService.login(parseResult.data, {
      ipAddress,
      userAgent,
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
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Authentication processing failed',
        },
      },
      { status: 500 }
    );
  }
}
