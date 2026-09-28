import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { customerDashboardService } from '@/features/customers';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/customer/dashboard
 * Aggregates complete customer dashboard overview with metrics, order shortcuts,
 * Product Points, wallet balances, default address, and recent notification alerts.
 */
export async function GET(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    const overview = await customerDashboardService.getDashboardOverview(actor.userId);

    return NextResponse.json(
      {
        success: true,
        data: overview,
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(req, error);
  }
}
