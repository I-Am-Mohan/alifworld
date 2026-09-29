import { NextRequest, NextResponse } from 'next/server';
import { courierDispatchService } from '@/features/shipping';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/shipping/couriers
 * Lists all registered Bangladesh courier providers (Pathao, Steadfast, RedX, Paperfly, In-House),
 * their readiness/configuration status, supported zones, and COD thresholds.
 */
export async function GET(req: NextRequest) {
  try {
    const couriers = courierDispatchService.listCouriers();

    return NextResponse.json({
      success: true,
      data: couriers,
    });
  } catch (error) {
    return errorResponse(req, error);
  }
}
