import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/shared/authz';
import { courierDispatchService } from '@/features/shipping';
import { AppendShipmentEventSchema } from '@/features/shipping/validators/courier.validators';
import { TransitionIdempotencyKeySchema } from '@/features/orders/validators/order.validators';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { AuthorizationError, ValidationError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

function requireShipmentWriteAuthority(actor: ReturnType<typeof authenticateRequest>) {
  const administrator = actor.roles.some((role) => ['ADMIN', 'SUPER_ADMIN'].includes(role));
  const seller = actor.roles.some((role) =>
    ['SELLER', 'SELLER_OWNER', 'SELLER_STAFF'].includes(role)
  );
  if (!administrator && !seller) {
    throw new AuthorizationError('Seller or administrator shipment authority required.');
  }
  if (!administrator && !actor.sellerId) {
    throw new AuthorizationError('Seller authority required to manage shipment events.', {
      code: 'SELLER_ACCESS_REQUIRED',
    });
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
 * POST /api/v1/shipping/shipments/[id]/events
 * Appends an immutable tracking event to a shipment and advances its status.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = authenticateRequest(req);
    const administrator = requireShipmentWriteAuthority(actor);
    const { id } = await params;

    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    const eventInput = AppendShipmentEventSchema.parse(payload);
    const idempotencyKey = TransitionIdempotencyKeySchema.parse(req.headers.get('idempotency-key'));

    const sellerId = administrator ? null : actor.sellerId;
    const actorRole = administrator ? 'ADMIN' : 'SELLER';

    const updatedShipment = await courierDispatchService.appendTrackingEvent(id, eventInput, {
      actorId: actor.userId,
      actorRole,
      sellerId,
    });

    return NextResponse.json(
      {
        success: true,
        data: updatedShipment,
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
