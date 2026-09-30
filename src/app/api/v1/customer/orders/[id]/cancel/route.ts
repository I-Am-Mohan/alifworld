import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/shared/authz';
import { customerOrderService } from '@/features/orders';
import {
  CancelOrderSchema,
  TransitionIdempotencyKeySchema,
} from '@/features/orders/validators/order.validators';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { AuthorizationError, ValidationError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/customer/orders/[id]/cancel
 * Customer cancels their order self-service before courier dispatch or packaging.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = authenticateRequest(req);
    if (!actor.roles.includes('CUSTOMER') || !actor.permissions.includes('orders:cancel')) {
      throw new AuthorizationError('Customer cancellation permission required.');
    }
    const { id } = await params;

    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    const validatedInput = CancelOrderSchema.parse(payload);
    const idempotencyKey = TransitionIdempotencyKeySchema.parse(req.headers.get('idempotency-key'));

    const cancelledOrder = await customerOrderService.cancelCustomerOrder(
      id,
      actor.userId,
      validatedInput,
      idempotencyKey
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
