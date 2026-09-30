import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/shared/authz';
import { sellerFulfillmentOrderService } from '@/features/orders';
import { QuerySellerOrdersSchema } from '@/features/orders/validators/order.validators';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { AuthorizationError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

function resolveSellerId(actor: any): string {
  if (actor.sellerId) {
    return actor.sellerId;
  }
  throw new AuthorizationError('Seller authority required to view fulfillment orders.', {
    code: 'SELLER_ACCESS_REQUIRED',
  });
}

/**
 * GET /api/v1/seller/orders
 * Retrieves fulfillment orders scoped strictly to the authenticated merchant tenant.
 */
export async function GET(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    const sellerId = resolveSellerId(actor);
    const searchParams = req.nextUrl.searchParams;

    const query = QuerySellerOrdersSchema.parse({
      status: searchParams.get('status') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
    });

    const result = await sellerFulfillmentOrderService.listSellerFulfillmentOrders(sellerId, query);

    return NextResponse.json(
      {
        success: true,
        data: result.items,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationErrorResponse(req, error);
    }
    return errorResponse(req, error);
  }
}
