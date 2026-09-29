import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/shared/authz';
import { sellerFulfillmentGroupService } from '@/features/fulfillment';
import { TransitionGroupStatusSchema } from '@/features/fulfillment/validators/fulfillment-group.validators';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { SystemRoleCode } from '@/features/identity/types';
import { AuthorizationError, ValidationError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

function resolveSellerId(actor: any): string {
  const isSuperAdmin = actor.roles?.includes(SystemRoleCode.SUPER_ADMIN);
  const isPlatformAdmin = actor.roles?.includes(SystemRoleCode.ADMIN);

  if (isSuperAdmin || isPlatformAdmin) {
    return actor.sellerId || '';
  }

  if (actor.sellerId) {
    return actor.sellerId;
  }

  throw new AuthorizationError('Seller authority required to transition fulfillment group.', {
    code: 'SELLER_ACCESS_REQUIRED',
  });
}

/**
 * PATCH /api/v1/seller/fulfillment-groups/[id]/status
 * Transitions a seller fulfillment group through the state machine within tenant boundaries.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = authenticateRequest(req);
    const { id } = await params;

    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    const validatedInput = TransitionGroupStatusSchema.parse(payload);
    const sellerId = resolveSellerId(actor);

    const updated = await sellerFulfillmentGroupService.transitionGroupStatus(
      id,
      sellerId,
      validatedInput.status,
      {
        actorId: actor.userId,
        reason: validatedInput.reason || undefined,
      }
    );

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationErrorResponse(req, error);
    }
    return errorResponse(req, error);
  }
}
