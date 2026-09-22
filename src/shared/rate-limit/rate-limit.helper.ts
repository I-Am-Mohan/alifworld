/**
 * Rate Limiting Route Handler Helper
 * 
 * Coordinates rate limiting checks, audit logging on breaches,
 * standard rate limit headers, and localized 429 exceptions.
 * 
 * Invariants: ADR-0022, ADR-0031, Milestone 040
 */

import { NextRequest, NextResponse } from 'next/server';
import { RateLimitPolicy, RateLimitResult } from './rate-limiter.interface';
import { rateLimiter } from './rate-limiter';
import { RateLimitError } from '@/shared/errors/app-error';
import { auditService, AuditService } from '@/shared/audit/audit.service';
import { AUDIT_ACTIONS } from '@/shared/audit/audit.interface';

/**
 * Asserts that the incoming request complies with the specified rate limit policy.
 * Throws RateLimitError (HTTP 429) and logs an audit security event if exceeded.
 */
export async function assertRateLimit(
  req: NextRequest,
  policy: RateLimitPolicy,
  customIdentifier?: string
): Promise<RateLimitResult> {
  const ipAddress =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1';

  // Key composition incorporates identifier (e.g. phone or email) if provided
  const targetKey = customIdentifier
    ? `${customIdentifier.trim().toLowerCase()}:${ipAddress}`
    : ipAddress;

  const result = await rateLimiter.consume(targetKey, policy);

  if (!result.isAllowed) {
    const meta = AuditService.extractRequestMeta(req);

    // Asynchronously log rate limit violation without blocking
    auditService
      .log({
        actorId: customIdentifier || null,
        actorRole: 'ANONYMOUS',
        action: AUDIT_ACTIONS.AUTH_RATE_LIMIT_EXCEEDED,
        resource: 'RateLimit',
        resourceId: policy.keyPrefix,
        requestId: meta.requestId,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        metadata: {
          keyPrefix: policy.keyPrefix,
          limit: result.limit,
          retryAfterSeconds: result.retryAfterSeconds,
          identifier: customIdentifier || null,
        },
      })
      .catch(() => {});

    throw new RateLimitError(
      `Rate limit exceeded. Please retry after ${result.retryAfterSeconds} seconds.`,
      result.retryAfterSeconds,
      {
        retryAfterSeconds: result.retryAfterSeconds,
        limit: result.limit,
        remaining: result.remaining,
      }
    );
  }

  return result;
}

/**
 * Applies standard RFC rate-limiting headers to an outgoing NextResponse.
 */
export function applyRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult
): NextResponse {
  response.headers.set('X-RateLimit-Limit', String(result.limit));
  response.headers.set('X-RateLimit-Remaining', String(result.remaining));
  response.headers.set(
    'X-RateLimit-Reset',
    String(Math.ceil(result.resetMs / 1000))
  );

  if (!result.isAllowed && result.retryAfterSeconds > 0) {
    response.headers.set('Retry-After', String(result.retryAfterSeconds));
  }

  return response;
}
