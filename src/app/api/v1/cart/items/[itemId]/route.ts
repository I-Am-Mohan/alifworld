import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { CartRepository } from '@/repositories/cart.repository';
import { UpdateCartItemSchema } from '@/validators/order.validator';
import { serializeBigInt } from '@/shared/utils/currency';
import { AppError, ValidationError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

const cartRepository = new CartRepository();

function fail(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json(error.toJSON(), { status: error.statusCode });
  }
  return NextResponse.json(
    { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Unable to update cart item' } },
    { status: 500 }
  );
}

export async function PATCH(req: NextRequest, { params }: { params: { itemId: string } }) {
  try {
    const actor = authenticateRequest(req);
    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }
    const parsed = UpdateCartItemSchema.safeParse(payload);
    if (!parsed.success) {
      throw new ValidationError('Invalid cart item quantity', { issues: parsed.error.flatten() });
    }
    const item = await cartRepository.updateItemQuantity(params.itemId, parsed.data.quantity, actor.userId, actor.userId);
    return NextResponse.json({ success: true, data: serializeBigInt(item) });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { itemId: string } }) {
  try {
    const actor = authenticateRequest(req);
    await cartRepository.removeItem(params.itemId, actor.userId, actor.userId);
    return NextResponse.json({ success: true, data: { removed: true } });
  } catch (error) {
    return fail(error);
  }
}