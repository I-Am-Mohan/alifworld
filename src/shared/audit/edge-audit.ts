import type { NextRequest } from 'next/server';

/**
 * Edge-safe perimeter security logging for Next.js middleware.
 *
 * Middleware cannot import the Prisma-backed audit service because the Edge
 * runtime does not provide Node.js modules. Structured logs retain the event,
 * request correlation, and redacted security context for the platform logger.
 */
export function logEdgeSecurityEvent(input: {
  action: string;
  request: NextRequest;
  requestId: string;
  metadata: Record<string, string | undefined>;
}): void {
  const metadata = Object.fromEntries(
    Object.entries(input.metadata).filter(([, value]) => value !== undefined)
  );

  console.warn(
    JSON.stringify({
      source: 'edge-middleware',
      action: input.action,
      requestId: input.requestId,
      method: input.request.method,
      pathname: input.request.nextUrl.pathname,
      metadata,
    })
  );
}
