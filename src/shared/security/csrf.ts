/**
 * AlifWorld Server-Side CSRF Protection Subsystem
 * 
 * Implements HMAC-SHA256 cryptographically signed Double Submit Cookie verification,
 * Origin/Referer header validation, safe API/mobile bypasses, and webhook exemptions.
 * 
 * Invariants: ADR-0003, ADR-0022, OWASP ASVS v4.0, Milestone 048
 */

import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { NextRequest } from 'next/server';
import { TOKEN_POLICIES } from '@/shared/auth/token-policy';
import { CsrfVerificationResult, CookieSecurityOptions } from './security.types';

export const CSRF_COOKIE_NAME = 'aw_csrf';
export const CSRF_HEADER_NAMES = ['x-csrf-token', 'x-xsrf-token'] as const;
export const CSRF_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Resolves the secret key used for signing and verifying CSRF tokens.
 */
function getCsrfSecret(): string {
  return (
    process.env.SESSION_SECRET ||
    process.env.JWT_SECRET ||
    'change_me_to_a_secure_random_string_in_production_min_32_chars'
  );
}

/**
 * Generates an HMAC-SHA256 signature for a token payload.
 */
function signPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Constant-time string comparison to prevent timing side-channel attacks.
 */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Generates a signed CSRF token composed of:
 * `<randomEntropy>.<timestamp>.<hmacSignature>`
 */
export function generateCsrfToken(secret: string = getCsrfSecret()): string {
  const entropy = randomBytes(24).toString('hex');
  const timestamp = Date.now().toString();
  const payload = `${entropy}.${timestamp}`;
  const signature = signPayload(payload, secret);
  return `${payload}.${signature}`;
}

/**
 * Verifies that a CSRF token has a valid format, is unexpired, and has an authentic signature.
 */
export function verifyCsrfTokenSignature(token: string, secret: string = getCsrfSecret()): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return false;
  }

  const [entropy, timestampStr, providedSignature] = parts;
  if (!entropy || !timestampStr || !providedSignature) {
    return false;
  }

  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) {
    return false;
  }

  // Check token expiration
  const now = Date.now();
  if (now - timestamp > CSRF_TOKEN_TTL_MS || timestamp > now + 60000) {
    return false;
  }

  const expectedPayload = `${entropy}.${timestampStr}`;
  const expectedSignature = signPayload(expectedPayload, secret);

  return safeEqual(providedSignature, expectedSignature);
}

/**
 * Returns security cookie attributes for the CSRF token.
 * Note: httpOnly is false so browser scripts can read the token and attach it to request headers.
 */
export function getCsrfCookieOptions(
  value: string,
  isProduction: boolean = process.env.NODE_ENV === 'production'
): CookieSecurityOptions {
  return {
    name: CSRF_COOKIE_NAME,
    value,
    httpOnly: false, // Required for Double-Submit Cookie pattern
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 24 * 60 * 60, // 24 hours
  };
}

/**
 * Extracts the client-submitted CSRF token from supported HTTP headers.
 */
export function extractCsrfHeader(req: NextRequest): string | null {
  for (const headerName of CSRF_HEADER_NAMES) {
    const value = req.headers.get(headerName);
    if (value) {
      return value.trim();
    }
  }
  return null;
}

/**
 * Validates Origin or Referer against the host for state-modifying requests.
 */
export function verifyOriginAndReferer(req: NextRequest, allowedOrigins: string[] = []): boolean {
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  const host = req.headers.get('host');

  // If Origin header is present, validate it
  if (origin) {
    try {
      const originUrl = new URL(origin);
      // Origin matches host
      if (host && (originUrl.host === host || originUrl.hostname === host.split(':')[0])) {
        return true;
      }
      // Origin matches allowed origins whitelist
      if (allowedOrigins.some((allowed) => allowed === origin || allowed === originUrl.origin)) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  // Fallback to Referer header if Origin is absent
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      if (host && (refererUrl.host === host || refererUrl.hostname === host.split(':')[0])) {
        return true;
      }
      if (allowedOrigins.some((allowed) => allowed === refererUrl.origin)) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  // If neither Origin nor Referer is present on browser requests, return true for non-browser tooling
  return true;
}

/**
 * Evaluates whether an incoming HTTP request passes CSRF security controls.
 */
export function verifyRequestCsrf(
  req: NextRequest,
  options: {
    allowedOrigins?: string[];
    secret?: string;
  } = {}
): CsrfVerificationResult {
  const method = req.method.toUpperCase();

  // 1. Safe HTTP methods do not mutate state and are exempt from CSRF
  if (['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(method)) {
    return { valid: true, code: 'CSRF_SKIPPED', reason: 'Safe HTTP read-only method' };
  }

  // 2. Gateway Webhooks: Verified via gateway HMAC signatures rather than browser CSRF
  const pathname = req.nextUrl?.pathname || new URL(req.url).pathname;
  if (pathname.startsWith('/api/v1/payments/webhooks/')) {
    return { valid: true, code: 'CSRF_SKIPPED', reason: 'Payment gateway webhook endpoint' };
  }

  // 3. Pure API / Mobile App Clients:
  // Native Flutter clients transmit Bearer tokens and do NOT utilize ambient cookies.
  // CSRF attacks target ambient browser cookies; Bearer-only requests cannot be forged cross-origin.
  const hasAuthHeader = Boolean(req.headers.get('authorization')?.startsWith('Bearer '));
  const hasAccessCookie = Boolean(req.cookies.get(TOKEN_POLICIES.ACCESS_TOKEN_COOKIE_NAME)?.value);
  const hasRefreshCookie = Boolean(req.cookies.get(TOKEN_POLICIES.REFRESH_TOKEN_COOKIE_NAME)?.value);
  const hasCookieAuth = hasAccessCookie || hasRefreshCookie;

  if (hasAuthHeader && !hasCookieAuth) {
    return { valid: true, code: 'CSRF_SKIPPED', reason: 'Non-browser Bearer token API client' };
  }

  // 4. Origin / Referer Validation (Defense-in-depth)
  if (!verifyOriginAndReferer(req, options.allowedOrigins)) {
    return {
      valid: false,
      code: 'CSRF_ORIGIN_INVALID',
      reason: 'Request Origin or Referer does not match authorized application hosts',
    };
  }

  // 5. If the client does not possess auth cookies and is performing a public mutation
  // (e.g. initial login, register, password reset request), enforce CSRF if token is supplied or cookie exists
  const cookieToken = req.cookies.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = extractCsrfHeader(req);

  // If no auth cookie AND no CSRF cookie exists yet (e.g. first visit to public auth endpoint), permit initiation
  if (!hasCookieAuth && !cookieToken) {
    return { valid: true, code: 'CSRF_SKIPPED', reason: 'Unauthenticated initial public interaction' };
  }

  // 6. Double Submit Cookie Verification
  if (!headerToken) {
    return {
      valid: false,
      code: 'CSRF_TOKEN_MISSING',
      reason: 'Required anti-CSRF token header (x-csrf-token) is missing',
    };
  }

  if (!cookieToken) {
    return {
      valid: false,
      code: 'CSRF_TOKEN_MISSING',
      reason: 'Required anti-CSRF token cookie (aw_csrf) is missing',
    };
  }

  // Check matching tokens
  if (!safeEqual(headerToken, cookieToken)) {
    return {
      valid: false,
      code: 'CSRF_TOKEN_INVALID',
      reason: 'Anti-CSRF header does not match anti-CSRF cookie value',
    };
  }

  // Check cryptographic signature and freshness
  const secret = options.secret || getCsrfSecret();
  if (!verifyCsrfTokenSignature(headerToken, secret)) {
    return {
      valid: false,
      code: 'CSRF_TOKEN_INVALID',
      reason: 'Anti-CSRF token has an invalid signature or has expired',
    };
  }

  return { valid: true, code: 'CSRF_VALID', reason: 'Anti-CSRF token and origin verified successfully' };
}
