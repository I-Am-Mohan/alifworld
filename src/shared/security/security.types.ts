/**
 * AlifWorld Web Security Contracts & Interfaces
 * 
 * Formalizes types for CSRF validation, CORS origin management,
 * cookie security attributes, and HTTP response security headers.
 * 
 * Invariants: ADR-0003, ADR-0006, ADR-0022, Phase 05 Milestone 048
 */

export interface CorsConfig {
  /** Whitelisted allowed origins */
  allowedOrigins: string[];
  /** Allowed HTTP methods */
  allowedMethods: string[];
  /** Allowed request headers */
  allowedHeaders: string[];
  /** Response headers exposed to client scripts */
  exposedHeaders: string[];
  /** Whether to allow credentials (cookies, auth headers). Must NEVER be true with wildcard '*' */
  allowCredentials: boolean;
  /** Access-Control-Max-Age cache duration in seconds */
  maxAgeSeconds: number;
}

export interface CorsEvaluationResult {
  /** Whether request is a CORS preflight OPTIONS request */
  isPreflight: boolean;
  /** Whether the origin is permitted */
  isOriginAllowed: boolean;
  /** The validated origin string or null if disallowed */
  origin: string | null;
  /** CORS response headers to set */
  headers: Record<string, string>;
}

export type CsrfDecisionCode =
  | 'CSRF_VALID'
  | 'CSRF_TOKEN_MISSING'
  | 'CSRF_TOKEN_INVALID'
  | 'CSRF_ORIGIN_INVALID'
  | 'CSRF_SKIPPED';

export interface CsrfVerificationResult {
  /** Whether the request passes CSRF verification */
  valid: boolean;
  /** Standardized decision code */
  code: CsrfDecisionCode;
  /** Human-readable explanation */
  reason: string;
}

export interface SecurityHeadersConfig {
  /** Whether running in production mode (enforces HTTPS/HSTS) */
  isProduction: boolean;
  /** Frame options: 'DENY' for operational consoles, 'SAMEORIGIN' for public storefront */
  frameOptions: 'DENY' | 'SAMEORIGIN';
  /** Custom Content-Security-Policy override if specified */
  contentSecurityPolicy?: string;
  /** Nonce string for CSP inline script hashing */
  scriptNonce?: string;
}

export interface CookieSecurityOptions {
  name: string;
  value: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  path: string;
  maxAge?: number;
  domain?: string;
}
