import { NextRequest, NextResponse } from 'next/server';
import { OAuthService } from '@/features/auth/oauth/oauth.service';
import { oauthCallbackQuerySchema } from '@/validators/auth.validator';
import { AppError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

const oauthService = new OAuthService();

/**
 * GET /api/v1/auth/oauth/facebook/callback
 * 
 * Handles browser redirect callback from Facebook OAuth 2.0.
 * Exchanges code for tokens, verifies state anti-CSRF token, links/creates user,
 * establishes session, issues HttpOnly cookies, and redirects to returnUrl.
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const providerError = searchParams.get('error') || searchParams.get('error_message');

    if (providerError) {
      const redirectUrl = new URL('/', req.nextUrl.origin);
      redirectUrl.searchParams.set('authError', providerError);
      return NextResponse.redirect(redirectUrl);
    }

    const query = {
      code: searchParams.get('code') || '',
      state: searchParams.get('state') || '',
    };

    const parseResult = oauthCallbackQuerySchema.safeParse(query);
    if (!parseResult.success) {
      const redirectUrl = new URL('/', req.nextUrl.origin);
      redirectUrl.searchParams.set('authError', 'missing_callback_parameters');
      return NextResponse.redirect(redirectUrl);
    }

    const storedNonce = req.cookies.get('alif_oauth_state_facebook')?.value || null;
    const ipAddress =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      null;
    const userAgent = req.headers.get('user-agent') || null;
    const originUrl = req.nextUrl.origin;

    const result = await oauthService.handleCallback(
      'FACEBOOK',
      parseResult.data.code,
      parseResult.data.state,
      storedNonce,
      { ipAddress, userAgent },
      originUrl
    );

    const targetUrl = new URL(result.returnUrl || '/', req.nextUrl.origin);
    const response = NextResponse.redirect(targetUrl, 302);

    if (result.cookies) {
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

    response.cookies.delete('alif_oauth_state_facebook');

    return response;
  } catch (error: any) {
    const redirectUrl = new URL('/', req.nextUrl.origin);
    redirectUrl.searchParams.set(
      'authError',
      error instanceof AppError ? error.code : 'oauth_callback_failed'
    );
    return NextResponse.redirect(redirectUrl);
  }
}
