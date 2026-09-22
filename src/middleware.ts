/**
 * AlifWorld Global Security & HTTP Request Middleware
 * 
 * Intercepts all incoming traffic to enforce:
 * 1. Request correlation tracking (x-request-id injection)
 * 2. Cross-Origin Resource Sharing (CORS) preflight & origin verification
 * 3. Cross-Site Request Forgery (CSRF) validation on state-modifying requests
 * 4. Automatic anti-CSRF token cookie provisioning for browser clients
 * 5. Strict HTTP security headers (CSP, HSTS, X-Frame-Options, Permissions-Policy)
 * 
 * Invariants: ADR-0003, ADR-0006, ADR-0022, Phase 05 Milestone 048
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  evaluateCors,
  createPreflightResponse,
  applyCorsHeaders,
} from '@/shared/security/cors';
import {
  verifyRequestCsrfEdge,
  generateCsrfTokenEdge,
  getCsrfCookieOptionsEdge,
  CSRF_COOKIE_NAME,
} from '@/shared/security/csrf-edge';
import {
  buildSecurityHeaders,
  applySecurityHeaders,
} from '@/shared/security/headers';
import { logEdgeSecurityEvent } from '@/shared/audit/edge-audit';
import {
  resolveLocaleFromRequest,
  extractLocaleFromPath,
} from '@/i18n/locale-resolver';
import { LOCALE_COOKIE_NAME } from '@/i18n/config';

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const pathname = req.nextUrl.pathname;
  const requestId = req.headers.get('x-request-id') || `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  // 1. Evaluate CORS Policy
  const corsResult = evaluateCors(req);

  // If this is a preflight OPTIONS request, respond immediately
  if (corsResult.isPreflight) {
    if (req.headers.get('origin') && !corsResult.isOriginAllowed) {
      // Log security event using an Edge-safe structured logger.
      logEdgeSecurityEvent({
        action: 'CORS_VIOLATION_DETECTED',
        request: req,
        requestId,
        metadata: {
          origin: req.headers.get('origin') || undefined,
          requestedMethod: req.headers.get('access-control-request-method') || 'UNKNOWN',
        },
      });

      // Disallowed cross-origin preflight: reject with 403
      const forbiddenRes = new NextResponse(
        JSON.stringify({
          success: false,
          error: {
            code: 'CORS_ORIGIN_DENIED',
            message: 'Cross-origin request denied by CORS policy',
          },
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
      applySecurityHeaders(forbiddenRes.headers, pathname);
      forbiddenRes.headers.set('x-request-id', requestId);
      return forbiddenRes;
    }

    const preflightRes = createPreflightResponse(corsResult);
    applySecurityHeaders(preflightRes.headers, pathname);
    preflightRes.headers.set('x-request-id', requestId);
    return preflightRes;
  }

  // 2. Validate CSRF Protection for state-modifying requests
  const csrfResult = await verifyRequestCsrfEdge(req);
  if (!csrfResult.valid) {
    // Log security event using an Edge-safe structured logger.
    logEdgeSecurityEvent({
      action: 'CSRF_VIOLATION_DETECTED',
      request: req,
      requestId,
      metadata: {
        code: csrfResult.code,
        reason: csrfResult.reason,
      },
    });

    const errorResponse = NextResponse.json(
      {
        success: false,
        error: {
          code: csrfResult.code,
          message: csrfResult.reason,
        },
      },
      { status: 403 }
    );

    applySecurityHeaders(errorResponse.headers, pathname);
    applyCorsHeaders(errorResponse, corsResult);
    errorResponse.headers.set('x-request-id', requestId);
    return errorResponse;
  }

  // 3. Negotiate Authoritative Locale (BCP 47 & Regional Tagging)
  const resolvedLocale = resolveLocaleFromRequest(req);
  const pathLocaleInfo = extractLocaleFromPath(pathname);

  // 4. Continue Request Execution Downstream (Rewrite localized paths or pass through)
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-request-id', requestId);
  requestHeaders.set('x-locale', resolvedLocale.locale);
  requestHeaders.set('x-locale-short', resolvedLocale.shortCode);
  requestHeaders.set('x-locale-source', resolvedLocale.source);

  let response: NextResponse;

  // Handle URL localized prefix routing (e.g. /bn-BD/products -> rewrite to /products)
  // API routes (/api/*) and admin/seller operational consoles are not rewritten
  const shouldRewrite =
    Boolean(pathLocaleInfo.locale) &&
    !pathname.startsWith('/api/') &&
    !pathname.startsWith('/admin') &&
    !pathname.startsWith('/seller');

  if (shouldRewrite) {
    const rewriteUrl = new URL(pathLocaleInfo.pathnameWithoutLocale, req.url);
    // Preserve existing search params
    rewriteUrl.search = req.nextUrl.search;
    response = NextResponse.rewrite(rewriteUrl, {
      request: {
        headers: requestHeaders,
      },
    });
  } else {
    response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // 5. Provision anti-CSRF token cookie if absent (for browser clients)
  const existingCsrfCookie = req.cookies.get(CSRF_COOKIE_NAME)?.value;
  if (!existingCsrfCookie) {
    const newToken = await generateCsrfTokenEdge();
    const cookieOpts = getCsrfCookieOptionsEdge(newToken);
    response.cookies.set({
      name: cookieOpts.name,
      value: cookieOpts.value,
      httpOnly: cookieOpts.httpOnly,
      secure: cookieOpts.secure,
      sameSite: cookieOpts.sameSite,
      path: cookieOpts.path,
      maxAge: cookieOpts.maxAge,
    });
  }

  // 6. Synchronize Locale Cookie (aw_locale)
  const existingLocaleCookie = req.cookies.get(LOCALE_COOKIE_NAME)?.value;
  if (existingLocaleCookie !== resolvedLocale.locale) {
    response.cookies.set({
      name: LOCALE_COOKIE_NAME,
      value: resolvedLocale.locale,
      path: '/',
      maxAge: 365 * 24 * 60 * 60, // 1 year
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: false, // Accessible to client scripts
    });
  }

  // 7. Apply Security Headers, CORS Headers, Correlation ID & Locale Headers
  applySecurityHeaders(response.headers, pathname);
  applyCorsHeaders(response, corsResult);
  response.headers.set('x-request-id', requestId);
  response.headers.set('x-locale', resolvedLocale.locale);
  response.headers.set('Content-Language', resolvedLocale.locale);

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static assets)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - static public files (svg, png, jpg, jpeg, gif, webp)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
