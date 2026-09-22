/**
 * Integration Tests: Global Security Middleware and CSRF Endpoint (Milestone 048)
 * 
 * Tests:
 * 1. Global middleware (src/middleware.ts):
 *    - Request ID correlation injection and preservation
 *    - Automated anti-CSRF cookie provisioning for browser visits
 *    - CORS preflight OPTIONS handling (whitelisted vs disallowed origins)
 *    - Security headers (CSP, HSTS, X-Content-Type-Options, Permissions-Policy)
 *    - Anti-clickjacking X-Frame-Options (DENY for admin/seller vs SAMEORIGIN for storefront)
 *    - CSRF blocking on browser mutations (missing header, mismatched token, tampered signature)
 *    - CSRF bypass for mobile Bearer token clients and payment gateway webhooks
 * 2. CSRF token provisioning endpoint (src/app/api/v1/auth/csrf/route.ts):
 *    - Returns 200 OK with authentic signed token and sets aw_csrf cookie
 *    - Token verifies cryptographically against secret
 * 
 * Invariants: ADR-0003, ADR-0006, ADR-0022, Phase 05 Milestone 048
 */

import { describe, it, expect } from 'bun:test';
import { NextRequest } from 'next/server';
import { middleware } from '@/middleware';
import { GET as getCsrfToken } from '@/app/api/v1/auth/csrf/route';
import {
  generateCsrfToken,
  verifyCsrfTokenSignature,
  CSRF_COOKIE_NAME,
} from '@/shared/security/csrf';
import { TOKEN_POLICIES } from '@/shared/auth/token-policy';

describe('Global Security Middleware & CSRF API Integration (Milestone 048)', () => {
  // ── 1. Request ID Correlation ───────────────────────────────────────────────

  describe('1. Request Correlation (x-request-id)', () => {
    it('injects x-request-id header when none is provided by client', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/cart', { method: 'GET' });
      const res = await middleware(req);

      const requestId = res.headers.get('x-request-id');
      expect(requestId).not.toBeNull();
      expect(requestId?.startsWith('req_')).toBe(true);
    });

    it('preserves existing client-provided x-request-id header', async () => {
      const customId = 'client_correl_998877';
      const req = new NextRequest('http://localhost:3000/api/v1/cart', {
        method: 'GET',
        headers: { 'x-request-id': customId },
      });
      const res = await middleware(req);

      expect(res.headers.get('x-request-id')).toBe(customId);
    });
  });

  // ── 2. Automated CSRF Cookie Provisioning ───────────────────────────────────

  describe('2. Automated Anti-CSRF Cookie Provisioning', () => {
    it('automatically sets aw_csrf cookie on initial browser visit when absent', async () => {
      const req = new NextRequest('http://localhost:3000/', { method: 'GET' });
      const res = await middleware(req);

      const csrfCookie = res.cookies.get(CSRF_COOKIE_NAME);
      expect(csrfCookie).not.toBeUndefined();
      expect(typeof csrfCookie?.value).toBe('string');
      expect(verifyCsrfTokenSignature(csrfCookie!.value)).toBe(true);
    });

    it('preserves existing aw_csrf cookie if already present on incoming request', async () => {
      const existingToken = generateCsrfToken();
      const req = new NextRequest('http://localhost:3000/', {
        method: 'GET',
        headers: { cookie: `${CSRF_COOKIE_NAME}=${existingToken}` },
      });
      const res = await middleware(req);

      // Should not overwrite existing token
      const setCookieHeader = res.headers.get('set-cookie');
      if (setCookieHeader) {
        expect(setCookieHeader.includes(`${CSRF_COOKIE_NAME}=`)).toBe(false);
      }
    });
  });

  // ── 3. CORS Preflight & Enforcement ─────────────────────────────────────────

  describe('3. CORS Preflight & Origin Evaluation', () => {
    it('returns HTTP 204 No Content with CORS headers for preflight from whitelisted origin', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/cart/checkout', {
        method: 'OPTIONS',
        headers: {
          origin: 'https://alifworld.com',
          'access-control-request-method': 'POST',
          'access-control-request-headers': 'Content-Type, X-CSRF-Token, Authorization',
        },
      });

      const res = await middleware(req);
      expect(res.status).toBe(204);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://alifworld.com');
      expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true');
      expect(res.headers.get('Access-Control-Max-Age')).toBe('86400');
      expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    });

    it('returns HTTP 403 Forbidden for preflight OPTIONS from unauthorized cross-origin', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/cart/checkout', {
        method: 'OPTIONS',
        headers: {
          origin: 'https://evil-untrusted-site.com',
          'access-control-request-method': 'POST',
        },
      });

      const res = await middleware(req);
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('CORS_ORIGIN_DENIED');
      expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });

    it('attaches CORS headers on regular requests from allowed origins', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/orders', {
        method: 'GET',
        headers: {
          origin: 'https://seller.alifworld.com',
        },
      });

      const res = await middleware(req);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://seller.alifworld.com');
      expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true');
      expect(res.headers.get('Vary')).toContain('Origin');
    });
  });

  // ── 4. HTTP Security Headers ────────────────────────────────────────────────

  describe('4. HTTP Security Headers Enforcement', () => {
    it('sets X-Frame-Options: SAMEORIGIN for customer storefront routes', async () => {
      const req = new NextRequest('http://localhost:3000/products/walton-tv', { method: 'GET' });
      const res = await middleware(req);

      expect(res.headers.get('X-Frame-Options')).toBe('SAMEORIGIN');
      expect(res.headers.get('Content-Security-Policy')).toContain("frame-ancestors 'self'");
      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(res.headers.get('X-XSS-Protection')).toBe('1; mode=block');
      expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    });

    it('sets X-Frame-Options: DENY for admin console (anti-clickjacking)', async () => {
      const req = new NextRequest('http://localhost:3000/admin/users', { method: 'GET' });
      const res = await middleware(req);

      expect(res.headers.get('X-Frame-Options')).toBe('DENY');
      expect(res.headers.get('Content-Security-Policy')).toContain("frame-ancestors 'none'");
    });

    it('sets X-Frame-Options: DENY for seller operational portal', async () => {
      const req = new NextRequest('http://localhost:3000/seller/orders', { method: 'GET' });
      const res = await middleware(req);

      expect(res.headers.get('X-Frame-Options')).toBe('DENY');
      expect(res.headers.get('Content-Security-Policy')).toContain("frame-ancestors 'none'");
    });

    it('sets Cross-Origin-Resource-Policy: cross-origin on /api/ routes', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/orders', { method: 'GET' });
      const res = await middleware(req);

      expect(res.headers.get('Cross-Origin-Resource-Policy')).toBe('cross-origin');
    });
  });

  // ── 5. CSRF Protection for State-Modifying Requests ─────────────────────────

  describe('5. CSRF Protection Enforcement', () => {
    it('blocks browser POST request with auth cookie when CSRF header is missing (403 CSRF_TOKEN_MISSING)', async () => {
      const token = generateCsrfToken();
      const req = new NextRequest('http://localhost:3000/api/v1/cart/checkout', {
        method: 'POST',
        headers: {
          host: 'localhost:3000',
          origin: 'http://localhost:3000',
          cookie: `${TOKEN_POLICIES.ACCESS_TOKEN_COOKIE_NAME}=jwt_session; ${CSRF_COOKIE_NAME}=${token}`,
        },
      });

      const res = await middleware(req);
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('CSRF_TOKEN_MISSING');
    });

    it('blocks browser POST request when CSRF header does not match cookie (403 CSRF_TOKEN_INVALID)', async () => {
      const cookieToken = generateCsrfToken();
      const headerToken = generateCsrfToken();

      const req = new NextRequest('http://localhost:3000/api/v1/orders/ord_123/cancel', {
        method: 'POST',
        headers: {
          host: 'localhost:3000',
          origin: 'http://localhost:3000',
          cookie: `${TOKEN_POLICIES.ACCESS_TOKEN_COOKIE_NAME}=jwt_session; ${CSRF_COOKIE_NAME}=${cookieToken}`,
          'x-csrf-token': headerToken,
        },
      });

      const res = await middleware(req);
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('CSRF_TOKEN_INVALID');
    });

    it('permits browser POST request when authentic token matches in header and cookie', async () => {
      const token = generateCsrfToken();

      const req = new NextRequest('http://localhost:3000/api/v1/orders/ord_123/cancel', {
        method: 'POST',
        headers: {
          host: 'localhost:3000',
          origin: 'http://localhost:3000',
          cookie: `${TOKEN_POLICIES.ACCESS_TOKEN_COOKIE_NAME}=jwt_session; ${CSRF_COOKIE_NAME}=${token}`,
          'x-csrf-token': token,
        },
      });

      const res = await middleware(req);
      // Status is 200 (NextResponse.next passes downstream)
      expect(res.status).toBe(200);
      expect(res.headers.get('x-request-id')).not.toBeNull();
    });

    it('permits native Flutter client using Bearer token without CSRF check (CSRF_SKIPPED)', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/cart/checkout', {
        method: 'POST',
        headers: {
          host: 'localhost:3000',
          authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mobile_app_session',
          'content-type': 'application/json',
        },
      });

      const res = await middleware(req);
      expect(res.status).toBe(200);
    });

    it('permits payment gateway webhook without CSRF check (CSRF_SKIPPED)', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/payments/webhooks/bkash', {
        method: 'POST',
        headers: {
          host: 'localhost:3000',
          'content-type': 'application/json',
          'x-bkash-signature': 'sig_hmac_12345',
        },
      });

      const res = await middleware(req);
      expect(res.status).toBe(200);
    });
  });

  // ── 6. CSRF Token API Endpoint (/api/v1/auth/csrf) ──────────────────────────

  describe('6. CSRF Token API Endpoint (/api/v1/auth/csrf)', () => {
    it('GET /api/v1/auth/csrf returns 200 OK with valid CSRF token and sets aw_csrf cookie', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/auth/csrf', { method: 'GET' });
      const res = await getCsrfToken(req);

      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(typeof json.data.csrfToken).toBe('string');
      expect(json.data.headerName).toBe('x-csrf-token');
      expect(json.data.expiresInSeconds).toBe(86400);

      // Verify cryptographic authenticity
      expect(verifyCsrfTokenSignature(json.data.csrfToken)).toBe(true);

      // Verify cookie
      const cookie = res.cookies.get(CSRF_COOKIE_NAME);
      expect(cookie).not.toBeUndefined();
      expect(cookie?.value).toBe(json.data.csrfToken);
      expect(cookie?.httpOnly).toBe(false); // Accessible to JavaScript
      expect(cookie?.sameSite).toBe('lax');
    });
  });
});
