import { NextRequest, NextResponse } from 'next/server';
import { getBangladeshDistricts, getBangladeshDivision } from '@/shared/geo/bangladesh-geo';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/geo/districts?division=DHAKA
 * 
 * Returns the administrative districts of Bangladesh, optionally filtered by division.
 * Returns 64 districts in total when unfiltered.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const divisionQuery = searchParams.get('division') || undefined;

  if (divisionQuery) {
    const division = getBangladeshDivision(divisionQuery);
    if (!division) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_DIVISION',
            message: `Unknown or unsupported division: '${divisionQuery}'. Valid divisions: Dhaka, Chattogram, Rajshahi, Khulna, Barishal, Sylhet, Rangpur, Mymensingh.`,
          },
        },
        { status: 400 }
      );
    }
  }

  const districts = getBangladeshDistricts(divisionQuery);

  return NextResponse.json({
    success: true,
    data: districts,
    meta: {
      total: districts.length,
      filter: divisionQuery ? { division: divisionQuery } : null,
      country: 'BD',
    },
  });
}
