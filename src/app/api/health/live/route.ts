import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Liveness Probe: Confirms the Next.js process is active and accepting HTTP connections.
 * Reference: docs/architecture/environment-branching-and-release-strategy.md
 */
export async function GET() {
  return NextResponse.json(
    {
      success: true,
      data: {
        status: 'alive',
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      },
    },
    { status: 200 }
  );
}
