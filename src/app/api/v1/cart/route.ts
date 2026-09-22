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
import { serializeBigInt } from '@/shared/utils/currency';
import { AppError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

const cartRepo = new CartRepository();

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
        data: serializeBigInt(cart) || { id: null, items: [], status: 'ACTIVE' },
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
