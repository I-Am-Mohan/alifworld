import { NextRequest, NextResponse } from 'next/server';
import { deliveryServiceabilityService } from '@/features/shipping';
import { GeoUpazilasQuerySchema } from '@/features/shipping/validators/serviceability.validators';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/shipping/geo/upazilas
 * Lists upazilas / thanas, optionally filtered by district.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = GeoUpazilasQuerySchema.parse(
      Object.fromEntries(searchParams.entries())
    );

    const upazilas = await deliveryServiceabilityService.listUpazilas(
      query.districtId,
      query.districtName
    );

    return NextResponse.json(
      {
        success: true,
        data: upazilas,
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(req, error);
  }
}
