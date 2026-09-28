/**
 * Customer Shopping Cart API Route
 * 
 * Supports both authenticated users and guest shopping carts with token isolation.
 * 
 * Invariants: ADR-0003, ADR-0027, Milestone 127
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { cartService } from '@/features/cart/services/cart.service';
import { AddCartItemSchema } from '@/features/cart/validators/cart.validators';
import { errorResponse } from '@/shared/api/error-response';
import { ValidationError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

function extractActorOrGuest(req: NextRequest): {
  userId?: string;
  guestCartToken?: string;
} {
  let userId: string | undefined;
  try {
    const actor = authenticateRequest(req);
    userId = actor.userId;
  } catch {
    // Guest request
  }

  const guestCartToken =
    req.headers.get('x-guest-cart-token') ||
    req.cookies.get('alifworld_guest_cart')?.value ||
    new URL(req.url).searchParams.get('guestCartToken') ||
    undefined;

  return { userId, guestCartToken };
}

/**
 * GET /api/v1/cart
 * Retrieves the active shopping cart for an authenticated customer or guest session.
 */
export async function GET(req: NextRequest) {
  try {
    const { userId, guestCartToken } = extractActorOrGuest(req);

    const cart = await cartService.getCart(userId, guestCartToken);

    const response = NextResponse.json(
      {
        success: true,
        data: cart,
      },
      { status: 200 }
    );

    if (cart.isGuest && cart.guestCartToken) {
      response.headers.set('x-guest-cart-token', cart.guestCartToken);
      response.cookies.set('alifworld_guest_cart', cart.guestCartToken, {
        path: '/',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        httpOnly: false,
        sameSite: 'lax',
      });
    }

    return response;
  } catch (error) {
    return errorResponse(req, error);
  }
}

/**
 * POST /api/v1/cart
 * Adds an item to the active user or guest cart.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, guestCartToken } = extractActorOrGuest(req);

    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    const validatedInput = AddCartItemSchema.parse(payload);

    const result = await cartService.addItem(
      validatedInput,
      userId,
      guestCartToken || validatedInput.guestCartToken || undefined
    );

    const response = NextResponse.json(
      {
        success: true,
        data: result.cart,
      },
      { status: 201 }
    );

    if (result.guestCartToken) {
      response.headers.set('x-guest-cart-token', result.guestCartToken);
      response.cookies.set('alifworld_guest_cart', result.guestCartToken, {
        path: '/',
        maxAge: 30 * 24 * 60 * 60,
        httpOnly: false,
        sameSite: 'lax',
      });
    }

    return response;
  } catch (error) {
    return errorResponse(req, error);
  }
}

/**
 * DELETE /api/v1/cart
 * Clears all items from the active shopping cart.
 */
export async function DELETE(req: NextRequest) {
  try {
    const { userId, guestCartToken } = extractActorOrGuest(req);

    const cart = await cartService.clearCart(userId, guestCartToken);

    return NextResponse.json(
      {
        success: true,
        data: cart,
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(req, error);
  }
}

