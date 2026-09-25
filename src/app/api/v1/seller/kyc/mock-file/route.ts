import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return NextResponse.json({
    success: true,
    data: {
      message: 'Mock document stored successfully in private object storage.',
      timestamp: new Date().toISOString(),
    },
  });
}
