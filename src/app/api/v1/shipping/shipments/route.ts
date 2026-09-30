import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/shared/authz';
import { courierDispatchService } from '@/features/shipping';
import { QueryShipmentsSchema } from '@/features/shipping/validators/courier.validators';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
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
    throw new AuthorizationError('Seller authority required to list shipments.', {
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
 * GET /api/v1/shipping/shipments
 * Lists shipments scoped to merchant tenant (or platform-wide for administrators).
 */
export async function GET(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    const administrator = requireShipmentReadAuthority(actor);

    const searchParams = req.nextUrl.searchParams;
    const filters = QueryShipmentsSchema.parse(Object.fromEntries(searchParams));

    if (!administrator && filters.sellerId && filters.sellerId !== actor.sellerId) {
      throw new AuthorizationError(
        'Tenant access violation: cannot query shipments for another merchant.',
        { code: 'TENANT_VIOLATION' }
      );
    }

    const sellerId = administrator ? filters.sellerId || null : actor.sellerId!;

    const result = await courierDispatchService.listShipments({
      sellerId,
      status: filters.status,
      courierProvider: filters.courierProvider,
      page: filters.page,
      limit: filters.limit,
    });

    return NextResponse.json({
      success: true,
      data: result.items,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationErrorResponse(req, error);
    }
    return errorResponse(req, error);
  }
}
