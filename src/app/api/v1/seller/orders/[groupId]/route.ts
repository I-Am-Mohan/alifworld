import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { sellerFulfillmentOrderService } from '@/features/orders';
import { errorResponse } from '@/shared/api/error-response';
import { AuthorizationError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

function resolveSellerId(actor: any): string {
  if (actor.sellerId) {
    return actor.sellerId;
  }
  throw new AuthorizationError('Seller authority required to view fulfillment order.', {
    code: 'SELLER_ACCESS_REQUIRED',
  });
}

/**
 * GET /api/v1/seller/orders/[groupId]
 * Retrieves single fulfillment order scoped strictly to the merchant tenant.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const actor = authenticateRequest(req);
    const sellerId = resolveSellerId(actor);
    const { groupId } = await params;

    const fulfillmentOrder = await sellerFulfillmentOrderService.getSellerFulfillmentOrder(
      groupId,
      sellerId
    );

    return NextResponse.json(
      {
        success: true,
        data: fulfillmentOrder,
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(req, error);
  }
}
