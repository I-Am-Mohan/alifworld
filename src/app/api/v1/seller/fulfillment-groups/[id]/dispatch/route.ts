import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/shared/authz';
import { sellerFulfillmentGroupService } from '@/features/fulfillment';
import { DispatchGroupToCourierSchema } from '@/features/fulfillment/validators/fulfillment-group.validators';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { AuthorizationError, ValidationError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

function resolveSellerId(actor: any): string {
  if (actor.sellerId) {
    return actor.sellerId;
  }
  throw new AuthorizationError('Seller authority required to dispatch fulfillment group.', {
    code: 'SELLER_ACCESS_REQUIRED',
  });
}

/**
 * POST /api/v1/seller/fulfillment-groups/[id]/dispatch
 * Dispatches a seller fulfillment group package to the selected courier.
 */
export async function POST(
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

    const validatedInput = DispatchGroupToCourierSchema.parse(payload);
    const sellerId = resolveSellerId(actor);

    const result = await sellerFulfillmentGroupService.dispatchGroupToCourier(
      id,
      sellerId,
      validatedInput,
      actor.userId
    );

    return NextResponse.json(
      {
        success: true,
        data: result,
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
