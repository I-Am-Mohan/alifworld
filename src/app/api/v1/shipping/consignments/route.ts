import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/shared/authz';
import { courierDispatchService, shipmentRepository } from '@/features/shipping';
import {
  CreateConsignmentSchema,
  ListConsignmentsSchema,
} from '@/features/shipping/validators/courier.validators';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { AuthorizationError, ValidationError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

function requireShipmentAuthority(actor: ReturnType<typeof authenticateRequest>) {
  const administrator = actor.roles.some((role) => ['ADMIN', 'SUPER_ADMIN'].includes(role));
  const seller = actor.roles.some((role) =>
    ['SELLER', 'SELLER_OWNER', 'SELLER_STAFF'].includes(role)
  );
  if ((!administrator && !seller) || (!administrator && !actor.sellerId)) {
    throw new AuthorizationError('Seller or administrator shipment authority required.');
  }
  if (
    !actor.roles.includes('SUPER_ADMIN') &&
    !actor.permissions.some((permission) =>
      ['orders:manage', 'seller:orders:manage', 'shipments:manage', 'shipments.manage'].includes(
        permission
      )
    )
  ) {
    throw new AuthorizationError('Shipment management permission required.');
  }
  return administrator;
}

/**
 * GET /api/v1/shipping/consignments
 * Lists shipments and courier consignments scoped to the caller's tenant.
 */
export async function GET(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    const administrator = requireShipmentAuthority(actor);
    const searchParams = req.nextUrl.searchParams;
    const filters = ListConsignmentsSchema.parse(Object.fromEntries(searchParams));
    if (!administrator && filters.sellerId && filters.sellerId !== actor.sellerId) {
      throw new AuthorizationError('Shipment seller tenant mismatch.');
    }
    const sellerId = administrator ? filters.sellerId : actor.sellerId!;

    const result = await shipmentRepository.listShipments({
      ...filters,
      sellerId,
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

/**
 * POST /api/v1/shipping/consignments
 * Dispatches a seller fulfillment package and creates a consignment with the selected courier.
 * Normalizes recipient phone number to canonical Bangladesh E.164 (+8801XXXXXXXXX).
 */
export async function POST(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    requireShipmentAuthority(actor);

    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    const validatedInput = CreateConsignmentSchema.parse(payload);

    const result = await courierDispatchService.createConsignment(validatedInput, actor.userId);

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationErrorResponse(req, error);
    }
    return errorResponse(req, error);
  }
}
