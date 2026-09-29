import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { customerOrderService } from '@/features/orders';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/customer/orders/[id]
 * Retrieves single unified parent customer order by ID or orderNumber.
 * Enforces customer self-ownership at query boundary.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = authenticateRequest(req);
    const { id } = await params;

    const order = await customerOrderService.getCustomerOrder(id, actor.userId);

    return NextResponse.json(
      {
        success: true,
        data: order,
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(req, error);
  }
}
