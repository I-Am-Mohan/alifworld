import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Root Route Handler for AlifWorld REST API v1
 * Spec: docs/architecture/single-application-modular-monolith.md
 */
export async function GET() {
  return NextResponse.json(
    {
      success: true,
      data: {
        platform: 'AlifWorld Modular Monolith API',
        version: 'v1',
        currency: 'BDT',
        minorUnit: 'poisha (1 BDT = 100 poisha)',
        timezone: 'Asia/Dhaka',
        locales: ['bn-BD', 'en-BD'],
        endpoints: {
          healthLive: '/api/health/live',
          healthReady: '/api/health/ready',
          openapi: '/api/v1/openapi.json',
        },
      },
    },
    { status: 200 }
  );
}
