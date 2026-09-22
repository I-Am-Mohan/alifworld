/**
 * AlifWorld Standardized Cookie Security Policies & Helpers
 * 
 * Enforces OWASP-compliant security attributes: HttpOnly, Secure (HTTPS),
 * SameSite scoping, path isolation, and clean session clearing.
 * 
 * Invariants: ADR-0003, ADR-0022, OWASP ASVS v4.0, Milestone 048
 */

import { TOKEN_POLICIES } from '@/shared/auth/token-policy';
import { CSRF_COOKIE_NAME } from './csrf';
import { CookieSecurityOptions } from './security.types';

export const COOKIE_NAMES = {
  ACCESS_TOKEN: TOKEN_POLICIES.ACCESS_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN: TOKEN_POLICIES.REFRESH_TOKEN_COOKIE_NAME,
  CSRF_TOKEN: CSRF_COOKIE_NAME,
  LOCALE: 'aw_locale',
  SESSION_ID: 'aw_session_id',
} as const;

export type StandardCookieType = keyof typeof COOKIE_NAMES;

/**
 * Returns security-hardened attributes for a given cookie category.
 */
export function getStandardCookieOptions(
  type: StandardCookieType,
  value: string,
  isProduction: boolean = process.env.NODE_ENV === 'production'
): CookieSecurityOptions {
  switch (type) {
    case 'ACCESS_TOKEN':
      return {
        name: COOKIE_NAMES.ACCESS_TOKEN,
        value,
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
        maxAge: TOKEN_POLICIES.ACCESS_TOKEN_TTL_SECONDS,
      };

    case 'REFRESH_TOKEN':
      return {
        name: COOKIE_NAMES.REFRESH_TOKEN,
        value,
        httpOnly: true,
        secure: isProduction,
        sameSite: 'strict', // Strict isolation for refresh tokens
        path: '/api/v1/auth', // Path-isolated to auth endpoints
        maxAge: TOKEN_POLICIES.WEB_REFRESH_TOKEN_TTL_SECONDS,
      };

    case 'CSRF_TOKEN':
      return {
        name: COOKIE_NAMES.CSRF_TOKEN,
        value,
        httpOnly: false, // Must be readable by client JavaScript for double submit pattern
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
        maxAge: 24 * 60 * 60, // 24 hours
      };

    case 'LOCALE':
      return {
        name: COOKIE_NAMES.LOCALE,
        value,
        httpOnly: false,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
        maxAge: 365 * 24 * 60 * 60, // 1 year
      };

    case 'SESSION_ID':
      return {
        name: COOKIE_NAMES.SESSION_ID,
        value,
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
        maxAge: TOKEN_POLICIES.WEB_REFRESH_TOKEN_TTL_SECONDS,
      };
  }
}

/**
 * Generates an expired cookie option object to invalidate a specific cookie on the client.
 */
export function buildClearCookieOptions(
  name: string,
  path: string = '/'
): CookieSecurityOptions {
  return {
    name,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path,
    maxAge: 0,
  };
}

/**
 * Invalidate all AlifWorld authentication and session cookies on a response object.
 */
export function clearAllSecurityCookies(
  response: { cookies: { set: (options: any) => void } }
): void {
  response.cookies.set(buildClearCookieOptions(COOKIE_NAMES.ACCESS_TOKEN, '/'));
  response.cookies.set(buildClearCookieOptions(COOKIE_NAMES.REFRESH_TOKEN, '/api/v1/auth'));
  response.cookies.set(buildClearCookieOptions(COOKIE_NAMES.SESSION_ID, '/'));
  response.cookies.set(buildClearCookieOptions(COOKIE_NAMES.CSRF_TOKEN, '/'));
}
