/**
 * Customer Shopping Cart API Route
 * 
 * Enforces customer self-ownership at the cart boundary.
 * 
 * Invariants: ADR-0003, ADR-0027, Milestone 047
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, defaultObjectAuthzService } from '@/shared/authz';
import { CartRepository } from '@/repositories/cart.repository';
import { AddCartItemSchema } from '@/validators/order.validator';
import { serializeBigInt } from '@/shared/utils/currency';
import { AppError, ValidationError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

const cartRepo = new CartRepository();

export async function POST(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }
    const parsed = AddCartItemSchema.safeParse(payload);
    if (!parsed.success) {
      throw new ValidationError('Invalid cart item', { issues: parsed.error.flatten() });
    }
    const result = await cartRepo.addPublishedVariant(actor.userId, parsed.data.variantId, parsed.data.quantity);
    return NextResponse.json({ success: true, data: serializeBigInt(result) }, { status: 201 });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toJSON(), { status: error.statusCode });
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Unable to add cart item' } },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/cart
 * Retrieves the authenticated customer's active shopping cart.
 */
export async function GET(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);

    // Fetch active cart strictly scoped to authenticated user
    const cart = await cartRepo.findActiveCartByUserId(actor.userId);

    if (cart) {
      // Assert object ownership
      cartRepo.assertCartOwnership(cart, actor);
    }

    return NextResponse.json(
      {
        success: true,
        data: cart ? {
          id: cart.id,
          userId: cart.userId,
          currency: cart.currency,
          status: cart.status,
          items: cart.items.map((item: any) => ({
            id: item.id,
            sellerId: item.sellerId,
            seller: { businessName: item.seller?.businessName },
            variantId: item.variantId,
            variant: {
              sku: item.variant?.sku,
              title: item.variant?.title,
              imageUrl: item.variant?.imageUrl,
              product: { title: item.variant?.product?.title },
            },
            pricePoisha: item.pricePoisha.toString(),
            productPoint: item.productPoint,
            quantity: item.quantity,
          })),
        } : { id: null, items: [], status: 'ACTIVE', currency: 'BDT' },
      },
      { status: 200 }
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
