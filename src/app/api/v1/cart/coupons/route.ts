import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { cartService } from '@/features/cart/services/cart.service';
import { ApplyCouponSchema } from '@/features/cart/validators/cart.validators';
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
 * POST /api/v1/cart/coupons
 * Applies a coupon/discount code to the active cart and revalidates discounts.
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

    const validatedInput = ApplyCouponSchema.parse(payload);

    const result = await cartService.applyCoupon(
      validatedInput.couponCode,
      userId,
      guestCartToken || validatedInput.guestCartToken || undefined
    );

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

/**
 * DELETE /api/v1/cart/coupons
 * Removes the applied coupon from the active cart and re-evaluates totals.
 */
export async function DELETE(req: NextRequest) {
  try {
    const { userId, guestCartToken } = extractActorOrGuest(req);

    const result = await cartService.removeCoupon(userId, guestCartToken);

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
