/**
 * Customer Cart Checkout API Route
 * 
 * Enforces strict object-level cart ownership, preventing any customer
 * from checking out another user's cart.
 * 
 * Invariants: ADR-0003, ADR-0010, ADR-0022, ADR-0027, Milestone 047
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, defaultObjectAuthzService } from '@/shared/authz';
import { CartRepository } from '@/repositories/cart.repository';
import { OrderFulfillmentService } from '@/services/order-fulfillment.service';
import { CheckoutInputSchema } from '@/validators/order.validator';
import { AppError, ValidationError } from '@/shared/errors/app-error';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const cartRepo = new CartRepository();
const orderFulfillmentService = new OrderFulfillmentService();

const CartCheckoutPayloadSchema = z.object({
  cartId: z.string().min(1, 'Cart ID is required'),
  checkout: CheckoutInputSchema,
});

/**
 * POST /api/v1/cart/checkout
 * Performs atomic checkout for the customer's owned cart.
 */
export async function POST(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);

    let body: any;
    try {
      body = await req.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    const parseResult = CartCheckoutPayloadSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Invalid checkout parameters',
            details: parseResult.error.format(),
          },
        },
        { status: 422 }
      );
    }

    const { cartId, checkout } = parseResult.data;

    // 1. Object-level ownership check: Fetch and verify cart ownership
    const cart = await cartRepo.findOwnedById(cartId, actor);

    // 2. Execute authoritative checkout transaction
    const order = await orderFulfillmentService.processCheckout(cart.id, actor.userId, checkout);

    return NextResponse.json(
      {
        success: true,
        data: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          totalPoisha: order.totalPoisha.toString(),
          totalProductPoints: order.totalProductPoints,
          currency: order.currency,
          fulfillmentGroupsCount: order.fulfillmentGroups?.length || 0,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toJSON(), { status: error.statusCode });
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
