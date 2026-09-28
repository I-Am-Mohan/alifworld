import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { customerDashboardService } from '@/features/customers';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/customer/notifications
 * Retrieves list of recent notifications delivered to the customer.
 */
export async function GET(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const notifications = await customerDashboardService.listCustomerNotifications(
      actor.userId,
      limit
    );

    return NextResponse.json(
      {
        success: true,
        data: notifications,
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(req, error);
  }
}
