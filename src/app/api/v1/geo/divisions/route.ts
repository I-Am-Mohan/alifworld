import { NextResponse } from 'next/server';
import { getBangladeshDivisions } from '@/shared/geo/bangladesh-geo';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/geo/divisions
 * 
 * Returns the 8 administrative divisions of Bangladesh with bilingual metadata.
 * Flutter and Web client compatible.
 */
export async function GET() {
  const divisions = getBangladeshDivisions();

  return NextResponse.json({
    success: true,
    data: divisions,
    meta: {
      total: divisions.length,
      country: 'BD',
      currency: 'BDT',
      timezone: 'Asia/Dhaka',
    },
  });
}
