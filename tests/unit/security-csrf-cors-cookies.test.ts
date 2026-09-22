/**
 * Unit Tests: CSRF, CORS, Security Headers, and Cookie Policies
 * 
 * Verifies:
 * 1. CSRF cryptographic token generation, HMAC verification, and expiration
 * 2. CSRF request evaluation (safe methods, mobile Bearer bypass, webhook exemption, double-submit validation)
 * 3. CORS origin whitelisting, production subdomain resolution, and credential protection
 * 4. CORS preflight OPTIONS response generation
 * 5. Security header construction across storefront vs operational consoles (X-Frame-Options, CSP, HSTS, Permissions-Policy)
 * 6. Standardized cookie security attributes across tokens, sessions, locales, and CSRF cookies
 * 
 * Invariants: ADR-0003, ADR-0006, ADR-0022, Phase 05 Milestone 048
 */

import { describe, it, expect } from 'bun:test';
import { NextRequest } from 'next/server';
import {
  generateCsrfToken,
  verifyCsrfTokenSignature,
  getCsrfCookieOptions,
  extractCsrfHeader,
  verifyOriginAndReferer,
  verifyRequestCsrf,
  CSRF_COOKIE_NAME,
} from '@/shared/security/csrf';
import {
  isOriginAllowed,
  resolveAllowedOrigins,
  evaluateCors,
  createPreflightResponse,
  DEFAULT_ALLOWED_ORIGINS,
} from '@/shared/security/cors';
import {
  buildSecurityHeaders,
  buildContentSecurityPolicy,
  PERMISSIONS_POLICY_DIRECTIVES,
} from '@/shared/security/headers';
import {
  getStandardCookieOptions,
  buildClearCookieOptions,
  COOKIE_NAMES,
} from '@/shared/security/cookies';
import { TOKEN_POLICIES } from '@/shared/auth/token-policy';

describe('CSRF, CORS, Security Headers & Cookies Unit Tests (Milestone 048)', () => {
  // ── 1. CSRF Token Cryptography ──────────────────────────────────────────────

  describe('1. CSRF Token Cryptography & Verification', () => {
    it('generates a 3-part HMAC-SHA256 signed token', () => {
      const token = generateCsrfToken();
      expect(typeof token).toBe('string');

      const parts = token.split('.');
      expect(parts.length).toBe(3);
      expect(parts[0].length).toBe(48); // 24 bytes hex = 48 chars
      expect(parseInt(parts[1], 10)).toBeGreaterThan(0);
      expect(parts[2].length).toBe(64); // SHA-256 hex = 64 chars
    });

    it('verifies an authentic CSRF token signature', () => {
      const token = generateCsrfToken();
      expect(verifyCsrfTokenSignature(token)).toBe(true);
    });

    it('rejects tampered entropy in CSRF token', () => {
      const token = generateCsrfToken();
      const parts = token.split('.');
      const tampered = `tampered_entropy_value_here.${parts[1]}.${parts[2]}`;
      expect(verifyCsrfTokenSignature(tampered)).toBe(false);
    });

    it('rejects tampered timestamp in CSRF token', () => {
      const token = generateCsrfToken();
      const parts = token.split('.');
      const tampered = `${parts[0]}.${Date.now() - 5000}.${parts[2]}`;
      expect(verifyCsrfTokenSignature(tampered)).toBe(false);
    });

    it('rejects tampered HMAC signature in CSRF token', () => {
      const token = generateCsrfToken();
      const parts = token.split('.');
      const tampered = `${parts[0]}.${parts[1]}.0000000000000000000000000000000000000000000000000000000000000000`;
      expect(verifyCsrfTokenSignature(tampered)).toBe(false);
    });

    it('rejects expired CSRF token older than 24 hours', () => {
      const expiredTimestamp = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago
      const secret = 'test_secret_for_expiry_check_min_32_chars';
      const crypto = require('crypto');
      const entropy = '0123456789abcdef0123456789abcdef0123456789abcdef';
      const payload = `${entropy}.${expiredTimestamp}`;
      const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
      const expiredToken = `${payload}.${sig}`;

      expect(verifyCsrfTokenSignature(expiredToken, secret)).toBe(false);
    });

    it('getCsrfCookieOptions sets httpOnly: false for double-submit accessibility', () => {
      const cookieOpts = getCsrfCookieOptions('test_token', true);
      expect(cookieOpts.name).toBe(CSRF_COOKIE_NAME);
      expect(cookieOpts.httpOnly).toBe(false); // Accessible to JavaScript
      expect(cookieOpts.secure).toBe(true);
      expect(cookieOpts.sameSite).toBe('lax');
      expect(cookieOpts.path).toBe('/');
      expect(cookieOpts.maxAge).toBe(86400);
    });
  });

  // ── 2. CSRF Request Verification ────────────────────────────────────────────

  describe('2. CSRF Request Evaluation & Bypasses', () => {
    it('skips CSRF verification for safe HTTP methods (GET, HEAD, OPTIONS)', () => {
      const getReq = new NextRequest('http://localhost:3000/api/v1/orders', { method: 'GET' });
      const headReq = new NextRequest('http://localhost:3000/api/v1/orders', { method: 'HEAD' });
      const optReq = new NextRequest('http://localhost:3000/api/v1/orders', { method: 'OPTIONS' });

      expect(verifyRequestCsrf(getReq).code).toBe('CSRF_SKIPPED');
      expect(verifyRequestCsrf(headReq).code).toBe('CSRF_SKIPPED');
      expect(verifyRequestCsrf(optReq).code).toBe('CSRF_SKIPPED');
    });

    it('skips CSRF for payment gateway webhook endpoints', () => {
      const webhookReq = new NextRequest('http://localhost:3000/api/v1/payments/webhooks/bkash', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
      });
      const result = verifyRequestCsrf(webhookReq);
      expect(result.valid).toBe(true);
      expect(result.code).toBe('CSRF_SKIPPED');
      expect(result.reason).toContain('webhook');
    });

    it('skips CSRF for mobile Flutter clients using pure Bearer authorization without cookies', () => {
      const mobileReq = new NextRequest('http://localhost:3000/api/v1/cart/checkout', {
        method: 'POST',
        headers: {
          authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
          'content-type': 'application/json',
        },
      });

      const result = verifyRequestCsrf(mobileReq);
      expect(result.valid).toBe(true);
      expect(result.code).toBe('CSRF_SKIPPED');
      expect(result.reason).toContain('Bearer');
    });

    it('denies state-modifying request when origin does not match allowed hosts (CSRF_ORIGIN_INVALID)', () => {
      const crossSiteReq = new NextRequest('http://localhost:3000/api/v1/cart/checkout', {
        method: 'POST',
        headers: {
          origin: 'https://malicious-phishing-site.com',
          cookie: `${TOKEN_POLICIES.ACCESS_TOKEN_COOKIE_NAME}=session_token`,
        },
      });

      const result = verifyRequestCsrf(crossSiteReq, { allowedOrigins: ['https://alifworld.com'] });
      expect(result.valid).toBe(false);
      expect(result.code).toBe('CSRF_ORIGIN_INVALID');
    });

    it('denies state-modifying request when auth cookie is present but CSRF header is missing', () => {
      const token = generateCsrfToken();
      const req = new NextRequest('http://localhost:3000/api/v1/orders/123/cancel', {
        method: 'POST',
        headers: {
          host: 'localhost:3000',
          origin: 'http://localhost:3000',
          cookie: `${TOKEN_POLICIES.ACCESS_TOKEN_COOKIE_NAME}=session_token; ${CSRF_COOKIE_NAME}=${token}`,
        },
      });

      const result = verifyRequestCsrf(req);
      expect(result.valid).toBe(false);
      expect(result.code).toBe('CSRF_TOKEN_MISSING');
      expect(result.reason).toContain('header (x-csrf-token) is missing');
    });

    it('denies state-modifying request when CSRF header does not match CSRF cookie (CSRF_TOKEN_INVALID)', () => {
      const validCookieToken = generateCsrfToken();
      const differentHeaderToken = generateCsrfToken();

      const req = new NextRequest('http://localhost:3000/api/v1/orders/123/cancel', {
        method: 'POST',
        headers: {
          host: 'localhost:3000',
          origin: 'http://localhost:3000',
          cookie: `${TOKEN_POLICIES.ACCESS_TOKEN_COOKIE_NAME}=session_token; ${CSRF_COOKIE_NAME}=${validCookieToken}`,
          'x-csrf-token': differentHeaderToken,
        },
      });

      const result = verifyRequestCsrf(req);
      expect(result.valid).toBe(false);
      expect(result.code).toBe('CSRF_TOKEN_INVALID');
      expect(result.reason).toContain('does not match anti-CSRF cookie value');
    });

    it('approves state-modifying request when valid signed token matches in both header and cookie', () => {
      const token = generateCsrfToken();

      const req = new NextRequest('http://localhost:3000/api/v1/orders/123/cancel', {
        method: 'POST',
        headers: {
          host: 'localhost:3000',
          origin: 'http://localhost:3000',
          cookie: `${TOKEN_POLICIES.ACCESS_TOKEN_COOKIE_NAME}=session_token; ${CSRF_COOKIE_NAME}=${token}`,
          'x-csrf-token': token,
        },
      });

      const result = verifyRequestCsrf(req);
      expect(result.valid).toBe(true);
      expect(result.code).toBe('CSRF_VALID');
    });
  });

  // ── 3. CORS Policy & Whitelisting ───────────────────────────────────────────

  describe('3. CORS Origin Validation & Evaluation', () => {
    it('allows exact default allowed origins', () => {
      expect(isOriginAllowed('http://localhost:3000')).toBe(true);
      expect(isOriginAllowed('https://alifworld.com')).toBe(true);
      expect(isOriginAllowed('https://seller.alifworld.com')).toBe(true);
      expect(isOriginAllowed('https://admin.alifworld.com')).toBe(true);
    });

    it('allows trusted alifworld.com subdomains', () => {
      expect(isOriginAllowed('https://checkout.alifworld.com')).toBe(true);
      expect(isOriginAllowed('https://partner.alifworld.com')).toBe(true);
    });

    it('strictly denies untrusted third-party origins', () => {
      expect(isOriginAllowed('https://evil-hacker.com')).toBe(false);
      expect(isOriginAllowed('http://alifworld.com.attacker.com')).toBe(false);
      expect(isOriginAllowed('null')).toBe(false);
      expect(isOriginAllowed(undefined)).toBe(false);
    });

    it('evaluateCors sets credentials: true and exact origin for whitelisted origin', () => {
      const req = new NextRequest('http://localhost:3000/api/v1/cart', {
        method: 'GET',
        headers: { origin: 'https://seller.alifworld.com' },
      });

      const cors = evaluateCors(req);
      expect(cors.isOriginAllowed).toBe(true);
      expect(cors.headers['Access-Control-Allow-Origin']).toBe('https://seller.alifworld.com');
      expect(cors.headers['Access-Control-Allow-Credentials']).toBe('true');
      expect(cors.headers['Vary']).toBe('Origin');
      expect(cors.headers['Access-Control-Allow-Origin']).not.toBe('*'); // Never wildcard with credentials!
    });

    it('evaluateCors omits Access-Control-Allow-Origin for unauthorized origin', () => {
      const req = new NextRequest('http://localhost:3000/api/v1/cart', {
        method: 'GET',
        headers: { origin: 'https://unauthorized-domain.com' },
      });

      const cors = evaluateCors(req);
      expect(cors.isOriginAllowed).toBe(false);
      expect(cors.headers['Access-Control-Allow-Origin']).toBeUndefined();
    });

    it('createPreflightResponse sets 204 status with max-age and allowed methods', () => {
      const req = new NextRequest('http://localhost:3000/api/v1/orders', {
        method: 'OPTIONS',
        headers: {
          origin: 'http://localhost:3000',
          'access-control-request-method': 'POST',
        },
      });

      const cors = evaluateCors(req);
      expect(cors.isPreflight).toBe(true);
      expect(cors.headers['Access-Control-Max-Age']).toBe('86400');
      expect(cors.headers['Access-Control-Allow-Methods']).toContain('POST');

      const preflightRes = createPreflightResponse(cors);
      expect(preflightRes.status).toBe(204);
      expect(preflightRes.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
    });
  });

  // ── 4. Security Headers ─────────────────────────────────────────────────────

  describe('4. Security Headers & CSP Construction', () => {
    it('sets X-Frame-Options: SAMEORIGIN for storefront routes', () => {
      const headers = buildSecurityHeaders('/products/walton-primo-s8');
      expect(headers['X-Frame-Options']).toBe('SAMEORIGIN');
      expect(headers['Content-Security-Policy']).toContain("frame-ancestors 'self'");
    });

    it('sets X-Frame-Options: DENY for administrative consoles (clickjacking defense)', () => {
      const adminHeaders = buildSecurityHeaders('/admin/users');
      expect(adminHeaders['X-Frame-Options']).toBe('DENY');
      expect(adminHeaders['Content-Security-Policy']).toContain("frame-ancestors 'none'");

      const sellerHeaders = buildSecurityHeaders('/seller/settings');
      expect(sellerHeaders['X-Frame-Options']).toBe('DENY');
      expect(sellerHeaders['Content-Security-Policy']).toContain("frame-ancestors 'none'");
    });

    it('includes nosniff, X-XSS-Protection, and restrictive Permissions-Policy', () => {
      const headers = buildSecurityHeaders('/');
      expect(headers['X-Content-Type-Options']).toBe('nosniff');
      expect(headers['X-XSS-Protection']).toBe('1; mode=block');
      expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
      expect(headers['Permissions-Policy']).toContain('camera=()');
      expect(headers['Permissions-Policy']).toContain('microphone=()');
      expect(headers['Permissions-Policy']).toContain('geolocation=(self)');
    });

    it('sets Cross-Origin-Resource-Policy: cross-origin on API routes for mobile Flutter integration', () => {
      const apiHeaders = buildSecurityHeaders('/api/v1/orders');
      expect(apiHeaders['Cross-Origin-Resource-Policy']).toBe('cross-origin');

      const pageHeaders = buildSecurityHeaders('/about');
      expect(pageHeaders['Cross-Origin-Resource-Policy']).toBe('same-origin');
    });

    it('enforces Strict-Transport-Security in production mode', () => {
      const prodHeaders = buildSecurityHeaders('/', { isProduction: true });
      expect(prodHeaders['Strict-Transport-Security']).toBe(
        'max-age=63072000; includeSubDomains; preload'
      );
    });
  });

  // ── 5. Standardized Cookie Policies ─────────────────────────────────────────

  describe('5. Standardized Cookie Security Attributes', () => {
    it('sets HttpOnly, SameSite: lax on ACCESS_TOKEN cookie', () => {
      const opts = getStandardCookieOptions('ACCESS_TOKEN', 'token_val', true);
      expect(opts.name).toBe(COOKIE_NAMES.ACCESS_TOKEN);
      expect(opts.httpOnly).toBe(true);
      expect(opts.secure).toBe(true);
      expect(opts.sameSite).toBe('lax');
      expect(opts.path).toBe('/');
      expect(opts.maxAge).toBe(TOKEN_POLICIES.ACCESS_TOKEN_TTL_SECONDS);
    });

    it('sets HttpOnly, SameSite: strict, and path: /api/v1/auth on REFRESH_TOKEN cookie', () => {
      const opts = getStandardCookieOptions('REFRESH_TOKEN', 'refresh_val', true);
      expect(opts.name).toBe(COOKIE_NAMES.REFRESH_TOKEN);
      expect(opts.httpOnly).toBe(true);
      expect(opts.secure).toBe(true);
      expect(opts.sameSite).toBe('strict'); // Strict isolation
      expect(opts.path).toBe('/api/v1/auth'); // Scoped to auth endpoints
      expect(opts.maxAge).toBe(TOKEN_POLICIES.WEB_REFRESH_TOKEN_TTL_SECONDS);
    });

    it('sets httpOnly: false on CSRF_TOKEN so client JavaScript can read it', () => {
      const opts = getStandardCookieOptions('CSRF_TOKEN', 'csrf_val', true);
      expect(opts.name).toBe(COOKIE_NAMES.CSRF_TOKEN);
      expect(opts.httpOnly).toBe(false);
      expect(opts.sameSite).toBe('lax');
      expect(opts.maxAge).toBe(86400);
    });

    it('buildClearCookieOptions generates maxAge: 0 with empty value', () => {
      const clear = buildClearCookieOptions('aw_access_token', '/');
      expect(clear.name).toBe('aw_access_token');
      expect(clear.value).toBe('');
      expect(clear.maxAge).toBe(0);
      expect(clear.path).toBe('/');
    });
  });
});
