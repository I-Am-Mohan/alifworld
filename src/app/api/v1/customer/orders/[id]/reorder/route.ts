import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { customerDashboardService } from '@/features/customers';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/customer/orders/[id]/reorder
 * Order Shortcut: 1-click reorders all items from a past order into the active cart.
 */
export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const actor = authenticateRequest(req);
    const { id } = await props.params;

    const result = await customerDashboardService.reorderPastOrder(
      actor.userId,
      id
    );

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(req, error);
  }
}
