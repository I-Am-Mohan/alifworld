/**
 * Edge-runtime CSRF primitives for Next.js middleware.
 *
 * This module intentionally uses Web Crypto only. Keep the synchronous
 * Node.js implementation in csrf.ts for Route Handlers and server tests.
 */

import type { NextRequest } from 'next/server';
import { TOKEN_POLICIES } from '@/shared/auth/token-policy';
import type { CsrfVerificationResult, CookieSecurityOptions } from './security.types';

export const CSRF_COOKIE_NAME = 'aw_csrf';
export const CSRF_HEADER_NAMES = ['x-csrf-token', 'x-xsrf-token'] as const;
export const CSRF_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function getCsrfSecret(): string {
  return (
    process.env.SESSION_SECRET ||
    process.env.JWT_SECRET ||
    'change_me_to_a_secure_random_string_in_production_min_32_chars'
  );
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function signPayload(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return bytesToHex(new Uint8Array(signature));
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let difference = 0;
  for (let index = 0; index < a.length; index += 1) {
    difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return difference === 0;
}

export async function generateCsrfTokenEdge(secret: string = getCsrfSecret()): Promise<string> {
  const entropyBytes = new Uint8Array(24);
  crypto.getRandomValues(entropyBytes);
  const entropy = bytesToHex(entropyBytes);
  const timestamp = Date.now().toString();
  const payload = `${entropy}.${timestamp}`;
  const signature = await signPayload(payload, secret);
  return `${payload}.${signature}`;
}

export async function verifyCsrfTokenSignatureEdge(
  token: string,
  secret: string = getCsrfSecret()
): Promise<boolean> {
  if (!token || typeof token !== 'string') return false;

  const parts = token.split('.');
  if (parts.length !== 3) return false;

  const [entropy, timestampStr, providedSignature] = parts;
  if (!entropy || !timestampStr || !providedSignature) return false;

  const timestamp = Number.parseInt(timestampStr, 10);
  if (Number.isNaN(timestamp)) return false;

  const now = Date.now();
  if (now - timestamp > CSRF_TOKEN_TTL_MS || timestamp > now + 60_000) return false;

  const expectedSignature = await signPayload(`${entropy}.${timestampStr}`, secret);
  return safeEqual(providedSignature, expectedSignature);
}

export function getCsrfCookieOptionsEdge(
  value: string,
  isProduction: boolean = process.env.NODE_ENV === 'production'
): CookieSecurityOptions {
  return {
    name: CSRF_COOKIE_NAME,
    value,
    httpOnly: false,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 24 * 60 * 60,
  };
}

function extractCsrfHeader(req: NextRequest): string | null {
  for (const headerName of CSRF_HEADER_NAMES) {
    const value = req.headers.get(headerName);
    if (value) return value.trim();
  }
  return null;
}

function verifyOriginAndReferer(req: NextRequest, allowedOrigins: string[] = []): boolean {
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  const host = req.headers.get('host');

  if (origin) {
    try {
      const originUrl = new URL(origin);
      if (host && (originUrl.host === host || originUrl.hostname === host.split(':')[0])) return true;
      return allowedOrigins.some((allowed) => allowed === origin || allowed === originUrl.origin);
    } catch {
      return false;
    }
  }

  if (referer) {
    try {
      const refererUrl = new URL(referer);
      if (host && (refererUrl.host === host || refererUrl.hostname === host.split(':')[0])) return true;
      return allowedOrigins.some((allowed) => allowed === refererUrl.origin);
    } catch {
      return false;
    }
  }

  return true;
}

export async function verifyRequestCsrfEdge(
  req: NextRequest,
  options: { allowedOrigins?: string[]; secret?: string } = {}
): Promise<CsrfVerificationResult> {
  const method = req.method.toUpperCase();

  if (['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(method)) {
    return { valid: true, code: 'CSRF_SKIPPED', reason: 'Safe HTTP read-only method' };
  }

  const pathname = req.nextUrl?.pathname || new URL(req.url).pathname;
  if (pathname.startsWith('/api/v1/payments/webhooks/')) {
    return { valid: true, code: 'CSRF_SKIPPED', reason: 'Payment gateway webhook endpoint' };
  }

  const hasAuthHeader = Boolean(req.headers.get('authorization')?.startsWith('Bearer '));
  const hasAccessCookie = Boolean(req.cookies.get(TOKEN_POLICIES.ACCESS_TOKEN_COOKIE_NAME)?.value);
  const hasRefreshCookie = Boolean(req.cookies.get(TOKEN_POLICIES.REFRESH_TOKEN_COOKIE_NAME)?.value);
  const hasCookieAuth = hasAccessCookie || hasRefreshCookie;

  if (hasAuthHeader && !hasCookieAuth) {
    return { valid: true, code: 'CSRF_SKIPPED', reason: 'Non-browser Bearer token API client' };
  }

  if (!verifyOriginAndReferer(req, options.allowedOrigins)) {
    return {
      valid: false,
      code: 'CSRF_ORIGIN_INVALID',
      reason: 'Request Origin or Referer does not match authorized application hosts',
    };
  }

  const cookieToken = req.cookies.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = extractCsrfHeader(req);

  if (!hasCookieAuth && !cookieToken) {
    return { valid: true, code: 'CSRF_SKIPPED', reason: 'Unauthenticated initial public interaction' };
  }

  if (!headerToken || !cookieToken) {
    return {
      valid: false,
      code: 'CSRF_TOKEN_MISSING',
      reason: !headerToken
        ? 'Required anti-CSRF token header (x-csrf-token) is missing'
        : 'Required anti-CSRF token cookie (aw_csrf) is missing',
    };
  }

  if (!safeEqual(headerToken, cookieToken)) {
    return {
      valid: false,
      code: 'CSRF_TOKEN_INVALID',
      reason: 'Anti-CSRF header does not match anti-CSRF cookie value',
    };
  }

  if (!(await verifyCsrfTokenSignatureEdge(headerToken, options.secret || getCsrfSecret()))) {
    return {
      valid: false,
      code: 'CSRF_TOKEN_INVALID',
      reason: 'Anti-CSRF token has an invalid signature or has expired',
    };
  }

  return { valid: true, code: 'CSRF_VALID', reason: 'Anti-CSRF token and origin verified successfully' };
}
