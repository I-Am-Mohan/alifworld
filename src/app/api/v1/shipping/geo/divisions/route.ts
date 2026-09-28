import { NextRequest, NextResponse } from 'next/server';
import { deliveryServiceabilityService } from '@/features/shipping';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/shipping/geo/divisions
 * Lists the 8 canonical administrative divisions of Bangladesh.
 */
export async function GET(req: NextRequest) {
  try {
    const divisions = await deliveryServiceabilityService.listDivisions();

    return NextResponse.json(
      {
        success: true,
        data: divisions,
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(req, error);
  }
}
