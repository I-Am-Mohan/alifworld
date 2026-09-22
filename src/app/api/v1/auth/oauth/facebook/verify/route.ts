import { NextRequest, NextResponse } from 'next/server';
import { OAuthService } from '@/features/auth/oauth/oauth.service';
import { oauthVerifySchema } from '@/validators/auth.validator';
import { AppError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

const oauthService = new OAuthService();

/**
 * POST /api/v1/auth/oauth/facebook/verify
 * 
 * Verifies native Facebook user access token from Flutter/Mobile/SPA applications.
 * Issues RFC 6749 Bearer tokens and establishes customer session.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parseResult = oauthVerifySchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Invalid Facebook verification parameters',
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

    const result = await oauthService.verifyMobileToken(
      {
        provider: 'facebook',
        accessToken: parseResult.data.accessToken,
        idToken: parseResult.data.idToken,
        clientType: parseResult.data.clientType,
      },
      { ipAddress, userAgent }
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          user: result.user,
          tokens: result.tokens,
          sessionId: result.sessionId,
          isNewUser: result.isNewUser,
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
          code: 'OAUTH_VERIFICATION_FAILED',
          message: error.message || 'Failed to verify Facebook token credentials',
        },
      },
      { status: 500 }
    );
  }
}
