/**
 * AlifWorld HTTP Security Headers Configuration
 * 
 * Enforces Content-Security-Policy (CSP), Strict-Transport-Security (HSTS),
 * anti-clickjacking frame controls, and restrictive Permissions-Policy.
 * 
 * Invariants: ADR-0003, ADR-0022, OWASP Secure Headers Project, Milestone 048
 */

import { SecurityHeadersConfig } from './security.types';

export const PERMISSIONS_POLICY_DIRECTIVES = [
  'camera=()',
  'microphone=()',
  'geolocation=(self)',
  'payment=(self)',
  'usb=()',
  'screen-wake-lock=()',
  'accelerometer=()',
  'gyroscope=()',
  'magnetometer=()',
].join(', ');

/**
 * Builds the Content-Security-Policy header value tailored for Next.js SSR and API boundaries.
 */
export function buildContentSecurityPolicy(
  frameOptions: 'DENY' | 'SAMEORIGIN' = 'SAMEORIGIN',
  isProduction: boolean = process.env.NODE_ENV === 'production'
): string {
  const frameAncestors = frameOptions === 'DENY' ? "'none'" : "'self'";

  // S3/MinIO and Meilisearch endpoints allowed for media and search assets
  const mediaOrigins = [
    "'self'",
    'data:',
    'blob:',
    'https:',
    'http://localhost:9000',
    'http://127.0.0.1:9000',
  ].join(' ');

  const appUrl = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').trim().replace(/\/$/, '');

  const connectOrigins = [
    "'self'",
    appUrl,
    'https://*.alifworld.com',
    'https://api.alifworld.com',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:9000',
    'http://localhost:7700',
  ].join(' ');

  const directives = [
    "default-src 'self'",
    // Next.js requires 'unsafe-eval' for development; 'unsafe-inline' for hydration styles
    isProduction
      ? "script-src 'self' 'unsafe-inline'"
      : "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    `img-src ${mediaOrigins}`,
    "font-src 'self' data:",
    `connect-src ${connectOrigins}`,
    `frame-ancestors ${frameAncestors}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];

  return directives.join('; ');
}

/**
 * Generates the complete set of HTTP response security headers for a given request path.
 */
export function buildSecurityHeaders(
  pathname: string = '/',
  customConfig?: Partial<SecurityHeadersConfig>
): Record<string, string> {
  const isProduction = customConfig?.isProduction ?? process.env.NODE_ENV === 'production';

  // Admin and Seller consoles strictly deny framing (clickjacking defense)
  const isOperationalPortal =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/seller') ||
    pathname.startsWith('/api/v1/iam');

  const frameOptions: 'DENY' | 'SAMEORIGIN' =
    customConfig?.frameOptions || (isOperationalPortal ? 'DENY' : 'SAMEORIGIN');

  const csp =
    customConfig?.contentSecurityPolicy ||
    buildContentSecurityPolicy(frameOptions, isProduction);

  const headers: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': frameOptions,
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': PERMISSIONS_POLICY_DIRECTIVES,
    'Content-Security-Policy': csp,
    'Cross-Origin-Opener-Policy': 'same-origin',
  };

  // Cross-Origin-Resource-Policy: allow cross-origin for REST APIs consumed by Flutter clients
  if (pathname.startsWith('/api/')) {
    headers['Cross-Origin-Resource-Policy'] = 'cross-origin';
  } else {
    headers['Cross-Origin-Resource-Policy'] = 'same-origin';
  }

  // HSTS: Enforced in production or over HTTPS
  if (isProduction || process.env.ENABLE_HSTS === 'true') {
    headers['Strict-Transport-Security'] = 'max-age=63072000; includeSubDomains; preload';
  }

  return headers;
}

/**
 * Applies security headers to an HTTP Headers instance.
 */
export function applySecurityHeaders(
  headers: Headers,
  pathname: string = '/',
  customConfig?: Partial<SecurityHeadersConfig>
): void {
  const securityHeaders = buildSecurityHeaders(pathname, customConfig);
  for (const [key, value] of Object.entries(securityHeaders)) {
    headers.set(key, value);
  }
}
