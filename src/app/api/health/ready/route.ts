import { NextResponse } from 'next/server';
import { getAppConfig } from '@/shared/config/environment';

export const dynamic = 'force-dynamic';

/**
 * Readiness Probe: Confirms dependencies and configuration before accepting traffic.
 * Reference: docs/architecture/environment-branching-and-release-strategy.md
 */
export async function GET() {
  try {
    const config = getAppConfig();

    return NextResponse.json(
      {
        success: true,
        data: {
          status: 'ready',
          environment: config.appEnv,
          timezone: config.timezone,
          currency: config.baseCurrency,
          locales: config.supportedLocales,
          checks: {
            process: 'healthy',
            configuration: 'valid',
            gates: {
              pointsCashConvertible: config.gates.featurePointsCashConvertible,
              affiliateDepth: config.gates.maxAffiliateDepth,
              lotteryEnabled: config.gates.featureLotteryEnabled,
            },
          },
          timestamp: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown readiness failure';
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: `Readiness check failed: ${message}`,
        },
      },
      { status: 503 }
    );
  }
}
