/**
 * AlifWorld Cross-Origin Resource Sharing (CORS) Security Subsystem
 * 
 * Enforces explicit origin whitelisting, prevents insecure wildcard credential
 * reflections, handles preflight OPTIONS requests, and exposes standard API headers.
 * 
 * Invariants: ADR-0003, ADR-0006, W3C CORS, OWASP API Security, Milestone 048
 */

import { NextRequest, NextResponse } from 'next/server';
import { CorsConfig, CorsEvaluationResult } from './security.types';

export const DEFAULT_ALLOWED_ORIGINS: string[] = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'https://alifworld.com',
  'https://www.alifworld.com',
  'https://seller.alifworld.com',
  'https://admin.alifworld.com',
  'https://api.alifworld.com',
];

export const DEFAULT_ALLOWED_METHODS = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'OPTIONS',
  'HEAD',
];

export const DEFAULT_ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-Request-ID',
  'X-CSRF-Token',
  'X-XSRF-Token',
  'X-Locale',
  'X-Client-Type',
  'Idempotency-Key',
  'If-Match',
];

export const DEFAULT_EXPOSED_HEADERS = [
  'X-Request-ID',
  'X-RateLimit-Limit',
  'X-RateLimit-Remaining',
  'X-RateLimit-Reset',
  'Location',
  'Content-Disposition',
];

/**
 * Resolves the active list of allowed origins from environment configuration and defaults.
 */
export function resolveAllowedOrigins(): string[] {
  const envOrigins = process.env.CORS_ALLOWED_ORIGINS;
  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  const origins = [...DEFAULT_ALLOWED_ORIGINS];

  if (appUrl) {
    const normalizedAppUrl = appUrl.trim().replace(/\/$/, '');
    if (!origins.includes(normalizedAppUrl)) {
      origins.push(normalizedAppUrl);
    }
  }

  if (!envOrigins) {
    return origins;
  }

  const parsed = envOrigins
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);

  for (const o of parsed) {
    if (!origins.includes(o)) {
      origins.push(o);
    }
  }

  return origins;
}

/**
 * Checks if a candidate origin matches allowed origins or trusted alifworld.com subdomains.
 */
export function isOriginAllowed(origin: string | null | undefined, allowedOrigins: string[] = resolveAllowedOrigins()): boolean {
  if (!origin) {
    return false;
  }

  const normalized = origin.trim().replace(/\/$/, '');

  // Exact match
  if (allowedOrigins.includes(normalized)) {
    return true;
  }

  // Configured APP_URL hostname match
  const configuredAppUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (configuredAppUrl) {
    try {
      const configuredUrl = new URL(configuredAppUrl);
      const candidateUrl = new URL(normalized);
      if (candidateUrl.hostname === configuredUrl.hostname) {
        return true;
      }
    } catch {
      // Ignore URL parse failures
    }
  }

  // Trusted production subdomains match: https://*.alifworld.com
  try {
    const url = new URL(normalized);
    if (url.protocol === 'https:' && (url.hostname === 'alifworld.com' || url.hostname.endsWith('.alifworld.com'))) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

/**
 * Evaluates an incoming HTTP request against the CORS policy.
 */
export function evaluateCors(
  req: NextRequest,
  customConfig?: Partial<CorsConfig>
): CorsEvaluationResult {
  const config: CorsConfig = {
    allowedOrigins: customConfig?.allowedOrigins || resolveAllowedOrigins(),
    allowedMethods: customConfig?.allowedMethods || DEFAULT_ALLOWED_METHODS,
    allowedHeaders: customConfig?.allowedHeaders || DEFAULT_ALLOWED_HEADERS,
    exposedHeaders: customConfig?.exposedHeaders || DEFAULT_EXPOSED_HEADERS,
    allowCredentials: customConfig?.allowCredentials ?? true,
    maxAgeSeconds: customConfig?.maxAgeSeconds ?? 86400, // 24 hours
  };

  const isPreflight = req.method.toUpperCase() === 'OPTIONS';
  const origin = req.headers.get('origin');
  const headers: Record<string, string> = {};

  if (!origin) {
    // Non-CORS request
    return {
      isPreflight,
      isOriginAllowed: false,
      origin: null,
      headers,
    };
  }

  const allowed = isOriginAllowed(origin, config.allowedOrigins);

  if (allowed) {
    // Invariant: Never reflect wildcard '*' if credentials are true
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Vary'] = 'Origin';

    if (config.allowCredentials) {
      headers['Access-Control-Allow-Credentials'] = 'true';
    }

    if (config.exposedHeaders.length > 0) {
      headers['Access-Control-Expose-Headers'] = config.exposedHeaders.join(', ');
    }

    if (isPreflight) {
      headers['Access-Control-Allow-Methods'] = config.allowedMethods.join(', ');
      headers['Access-Control-Allow-Headers'] = config.allowedHeaders.join(', ');
      headers['Access-Control-Max-Age'] = config.maxAgeSeconds.toString();
    }
  }

  return {
    isPreflight,
    isOriginAllowed: allowed,
    origin: allowed ? origin : null,
    headers,
  };
}

/**
 * Creates an HTTP 204 No Content response for CORS preflight OPTIONS requests.
 */
export function createPreflightResponse(corsResult: CorsEvaluationResult): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: corsResult.headers,
  });
}

/**
 * Applies evaluated CORS headers to an existing response.
 */
export function applyCorsHeaders(response: NextResponse, corsResult: CorsEvaluationResult): NextResponse {
  for (const [key, value] of Object.entries(corsResult.headers)) {
    response.headers.set(key, value);
  }
  return response;
}
