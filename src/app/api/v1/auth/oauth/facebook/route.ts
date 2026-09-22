import { NextRequest, NextResponse } from 'next/server';
import { OAuthService } from '@/features/auth/oauth/oauth.service';
import { oauthInitiateQuerySchema } from '@/validators/auth.validator';
import { AppError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

const oauthService = new OAuthService();

/**
 * GET /api/v1/auth/oauth/facebook
 * 
 * Initiates Facebook OAuth 2.0 authorization code flow.
 * Generates an HMAC-signed anti-CSRF state token and sets an HttpOnly nonce cookie.
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const query = {
      returnUrl: searchParams.get('returnUrl') || '/',
      clientType: searchParams.get('clientType') || 'WEB',
    };

    const parseResult = oauthInitiateQuerySchema.safeParse(query);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Invalid OAuth initiation query parameters',
            details: parseResult.error.flatten(),
          },
        },
        { status: 422 }
      );
    }

    const originUrl = req.nextUrl.origin;
    const result = oauthService.initiateAuth(
      'FACEBOOK',
      parseResult.data.returnUrl,
      originUrl
    );

    const response = NextResponse.redirect(result.authorizationUrl, 302);

    response.cookies.set({
      name: result.cookieOptions.name,
      value: result.cookieOptions.value,
      maxAge: result.cookieOptions.maxAge,
      httpOnly: result.cookieOptions.httpOnly,
      secure: result.cookieOptions.secure,
      sameSite: result.cookieOptions.sameSite,
      path: result.cookieOptions.path,
    });

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
          code: 'OAUTH_INIT_FAILED',
          message: error.message || 'Failed to initiate Facebook OAuth flow',
        },
      },
      { status: 500 }
    );
  }
}
