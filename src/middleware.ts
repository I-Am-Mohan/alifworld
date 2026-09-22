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
  verifyRequestCsrf,
  generateCsrfToken,
  getCsrfCookieOptions,
  CSRF_COOKIE_NAME,
} from '@/shared/security/csrf';
import {
  buildSecurityHeaders,
  applySecurityHeaders,
} from '@/shared/security/headers';

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const pathname = req.nextUrl.pathname;
  const requestId = req.headers.get('x-request-id') || `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  // 1. Evaluate CORS Policy
  const corsResult = evaluateCors(req);

  // If this is a preflight OPTIONS request, respond immediately
  if (corsResult.isPreflight) {
    if (req.headers.get('origin') && !corsResult.isOriginAllowed) {
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
  const csrfResult = verifyRequestCsrf(req);
  if (!csrfResult.valid) {
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

  // 3. Continue Request Execution Downstream
  // Create request headers with propagated request-id
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-request-id', requestId);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // 4. Provision anti-CSRF token cookie if absent (for browser clients)
  const existingCsrfCookie = req.cookies.get(CSRF_COOKIE_NAME)?.value;
  if (!existingCsrfCookie) {
    const newToken = generateCsrfToken();
    const cookieOpts = getCsrfCookieOptions(newToken);
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

  // 5. Apply Security Headers, CORS Headers, and Correlation ID
  applySecurityHeaders(response.headers, pathname);
  applyCorsHeaders(response, corsResult);
  response.headers.set('x-request-id', requestId);

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
