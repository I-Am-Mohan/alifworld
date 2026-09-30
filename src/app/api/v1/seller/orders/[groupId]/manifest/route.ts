import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { sellerFulfillmentOrderService } from '@/features/orders/services/seller-fulfillment-order.service';
import { errorResponse } from '@/shared/api/error-response';
import { AuthorizationError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

function resolveSellerId(actor: any): string {
  if (actor.sellerId) {
    return actor.sellerId;
  }
  throw new AuthorizationError('Seller authority required to view packing slip manifest.', {
    code: 'SELLER_ACCESS_REQUIRED',
  });
}

function verifySellerOrderReadAuthority(actor: any): void {
  if (
    !actor.roles.some((role: string) =>
      ['SUPER_ADMIN', 'ADMIN', 'SELLER', 'SELLER_OWNER', 'SELLER_STAFF'].includes(role)
    )
  ) {
    throw new AuthorizationError('Seller authority required.');
  }
  if (
    !actor.roles.includes('SUPER_ADMIN') &&
    !actor.permissions?.some((permission: string) =>
      [
        'orders:read',
        'orders:manage',
        'seller:orders:read',
        'seller:orders:manage',
        'seller.orders.read',
        'seller.orders.write',
      ].includes(permission)
    )
  ) {
    throw new AuthorizationError('Order read permission required.');
  }
}

/**
 * GET /api/v1/seller/orders/[groupId]/manifest
 * Retrieves printable packing slip and warehouse manifest data for a seller fulfillment order.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  try {
    const actor = authenticateRequest(req);
    verifySellerOrderReadAuthority(actor);
    const sellerId = resolveSellerId(actor);
    const { groupId } = await params;

    const manifest = await sellerFulfillmentOrderService.getPackingSlipManifest(groupId, sellerId);

    return NextResponse.json({
      success: true,
      data: manifest,
    });
  } catch (error) {
    return errorResponse(req, error);
  }
}
