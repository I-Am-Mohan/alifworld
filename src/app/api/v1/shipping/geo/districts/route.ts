import { NextRequest, NextResponse } from 'next/server';
import { deliveryServiceabilityService } from '@/features/shipping';
import { GeoDistrictsQuerySchema } from '@/features/shipping/validators/serviceability.validators';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/shipping/geo/districts
 * Lists districts, optionally filtered by administrative division.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = GeoDistrictsQuerySchema.parse(Object.fromEntries(searchParams.entries()));

    const districts = await deliveryServiceabilityService.listDistricts(query.divisionCode);

    return NextResponse.json(
      {
        success: true,
        data: districts,
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(req, error);
  }
}
