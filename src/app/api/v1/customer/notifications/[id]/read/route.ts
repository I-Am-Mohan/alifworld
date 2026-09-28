import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { customerDashboardService } from '@/features/customers';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/v1/customer/notifications/[id]/read
 * Marks a single notification as read.
 */
export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const actor = authenticateRequest(req);
    const { id } = await props.params;

    await customerDashboardService.markNotificationRead(actor.userId, id);

    return NextResponse.json(
      {
        success: true,
        message: 'Notification marked as read',
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(req, error);
  }
}
