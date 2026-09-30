import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { courierDispatchService } from '@/features/shipping';
import { errorResponse } from '@/shared/api/error-response';
import { AuthorizationError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

function requireShipmentReadAuthority(actor: ReturnType<typeof authenticateRequest>) {
  const administrator = actor.roles.some((role) => ['ADMIN', 'SUPER_ADMIN'].includes(role));
  const seller = actor.roles.some((role) =>
    ['SELLER', 'SELLER_OWNER', 'SELLER_STAFF'].includes(role)
  );
  if (!administrator && !seller) {
    throw new AuthorizationError('Seller or administrator shipment authority required.');
  }
  if (!administrator && !actor.sellerId) {
    throw new AuthorizationError('Seller authority required.', {
      code: 'SELLER_ACCESS_REQUIRED',
    });
  }
  if (
    !actor.roles.includes('SUPER_ADMIN') &&
    !actor.permissions.some((permission) =>
      [
        'orders:read',
        'orders:manage',
        'seller:orders:read',
        'seller:orders:manage',
        'shipments:read',
        'shipments:manage',
        'shipments.manage',
      ].includes(permission)
    )
  ) {
    throw new AuthorizationError('Shipment view permission required.');
  }
  return administrator;
}

/**
 * GET /api/v1/shipping/shipments/[id]
 * Retrieves single shipment by ID or shipmentNumber with strict tenant scoping.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = authenticateRequest(req);
    const administrator = requireShipmentReadAuthority(actor);
    const { id } = await params;

    const sellerId = administrator ? null : actor.sellerId;
    const shipment = await courierDispatchService.getShipment(id, sellerId);

    return NextResponse.json({
      success: true,
      data: shipment,
    });
  } catch (error) {
    return errorResponse(req, error);
  }
}
