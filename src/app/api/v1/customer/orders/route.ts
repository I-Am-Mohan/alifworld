import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { customerDashboardService } from '@/features/customers';
import { ListCustomerOrdersQuerySchema } from '@/features/customers/validators/dashboard.validators';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/customer/orders
 * Retrieves paginated list of parent orders owned by the authenticated customer.
 */
export async function GET(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    const { searchParams } = new URL(req.url);

    const query = ListCustomerOrdersQuerySchema.parse(
      Object.fromEntries(searchParams.entries())
    );

    const result = await customerDashboardService.listCustomerOrders(
      actor.userId,
      query
    );

    return NextResponse.json(
      {
        success: true,
        data: result.orders,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(req, error);
  }
}
