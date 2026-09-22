import { NextRequest, NextResponse } from 'next/server';
import { getBangladeshUpazilas, getBangladeshDistrict } from '@/shared/geo/bangladesh-geo';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/geo/upazilas?district=dhaka
 * 
 * Returns the commercial and administrative upazilas/thanas of Bangladesh,
 * optionally filtered by district ID or name.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const districtQuery = searchParams.get('district') || undefined;

  if (districtQuery) {
    const district = getBangladeshDistrict(districtQuery);
    if (!district) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_DISTRICT',
            message: `Unknown or unsupported district: '${districtQuery}'.`,
          },
        },
        { status: 400 }
      );
    }
  }

  const upazilas = getBangladeshUpazilas(districtQuery);

  return NextResponse.json({
    success: true,
    data: upazilas,
    meta: {
      total: upazilas.length,
      filter: districtQuery ? { district: districtQuery } : null,
      country: 'BD',
    },
  });
}
