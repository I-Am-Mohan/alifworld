import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/shared/authz';
import { customerOrderService } from '@/features/orders';
import { CancelOrderSchema } from '@/features/orders/validators/order.validators';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { ValidationError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/customer/orders/[id]/cancel
 * Customer cancels their order self-service before courier dispatch or packaging.
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

    const validatedInput = CancelOrderSchema.parse(payload);

    const cancelledOrder = await customerOrderService.cancelCustomerOrder(
      id,
      actor.userId,
      validatedInput
    );

    return NextResponse.json(
      {
        success: true,
        data: cancelledOrder,
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
