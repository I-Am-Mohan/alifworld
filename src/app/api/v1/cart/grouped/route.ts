import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { cartService } from '@/features/cart/services/cart.service';
import { errorResponse } from '@/shared/api/error-response';

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
 * GET /api/v1/cart/grouped
 * Retrieves the active shopping cart partitioned into multi-vendor seller fulfillment packages
 * with shipping fees, free shipping qualifications, lead times, and fulfillment constraints.
 */
export async function GET(req: NextRequest) {
  try {
    const { userId, guestCartToken } = extractActorOrGuest(req);
    const { searchParams } = new URL(req.url);
    const division = searchParams.get('division') || 'DHAKA';

    const groupedCart = await cartService.getGroupedCart(
      userId,
      guestCartToken,
      division
    );

    return NextResponse.json(
      {
        success: true,
        data: groupedCart,
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(req, error);
  }
}
