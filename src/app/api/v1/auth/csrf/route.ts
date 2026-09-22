/**
 * CSRF Token Provisioning API Route
 * 
 * Generates an authentic cryptographically signed anti-CSRF token,
 * sets the standard aw_csrf client cookie, and returns token metadata.
 * 
 * Invariants: ADR-0003, ADR-0022, OWASP ASVS v4.0, Milestone 048
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateCsrfToken, getCsrfCookieOptions } from '@/shared/security/csrf';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/auth/csrf
 * Provisions an authentic CSRF token for web clients.
 */
export async function GET(req: NextRequest) {
  const token = generateCsrfToken();
  const cookieOpts = getCsrfCookieOptions(token);

  const response = NextResponse.json(
    {
      success: true,
      data: {
        csrfToken: token,
        headerName: 'x-csrf-token',
        expiresInSeconds: 86400,
      },
    },
    { status: 200 }
  );

  response.cookies.set({
    name: cookieOpts.name,
    value: cookieOpts.value,
    httpOnly: cookieOpts.httpOnly,
    secure: cookieOpts.secure,
    sameSite: cookieOpts.sameSite,
    path: cookieOpts.path,
    maxAge: cookieOpts.maxAge,
  });

  return response;
}
