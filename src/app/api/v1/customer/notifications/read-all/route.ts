import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { customerDashboardService } from '@/features/customers';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/customer/notifications/read-all
 * Marks all notifications for customer as read.
 */
export async function POST(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);

    await customerDashboardService.markAllNotificationsRead(actor.userId);

    return NextResponse.json(
      {
        success: true,
        message: 'All notifications marked as read',
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(req, error);
  }
}
