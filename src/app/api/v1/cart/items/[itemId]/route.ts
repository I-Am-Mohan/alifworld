import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { cartService } from '@/features/cart/services/cart.service';
import { UpdateCartItemSchema } from '@/features/cart/validators/cart.validators';
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

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ itemId: string }> }
) {
  try {
    const { userId, guestCartToken } = extractActorOrGuest(req);
    const { itemId } = await props.params;

    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    const parsed = UpdateCartItemSchema.parse(payload);

    const updatedCart = await cartService.updateItemQuantity(
      itemId,
      parsed.quantity,
      userId,
      guestCartToken || parsed.guestCartToken || undefined
    );

    return NextResponse.json({ success: true, data: updatedCart }, { status: 200 });
  } catch (error) {
    return errorResponse(req, error);
  }
}

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ itemId: string }> }
) {
  try {
    const { userId, guestCartToken } = extractActorOrGuest(req);
    const { itemId } = await props.params;

    const updatedCart = await cartService.removeItem(
      itemId,
      userId,
      guestCartToken
    );

    return NextResponse.json({ success: true, data: updatedCart }, { status: 200 });
  } catch (error) {
    return errorResponse(req, error);
  }
}
