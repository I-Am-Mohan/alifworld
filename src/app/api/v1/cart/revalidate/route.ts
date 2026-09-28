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
 * POST /api/v1/cart/revalidate
 * Revalidates prices and available inventory for all line items in the active cart.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, guestCartToken } = extractActorOrGuest(req);

    const result = await cartService.revalidateCart(userId, guestCartToken);

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(req, error);
  }
}
