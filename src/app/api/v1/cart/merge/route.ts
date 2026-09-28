import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { cartService } from '@/features/cart/services/cart.service';
import { MergeGuestCartSchema } from '@/features/cart/validators/cart.validators';
import { errorResponse } from '@/shared/api/error-response';
import { ValidationError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/cart/merge
 * Merges an active guest shopping cart into the authenticated customer's cart upon login/registration.
 * Invariant: Deduplicates items, caps at available stock, re-snapshots live price/points, and marks guest cart MERGED.
 */
export async function POST(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);

    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    const validatedInput = MergeGuestCartSchema.parse(payload);

    const result = await cartService.mergeGuestCart(
      actor.userId,
      validatedInput.guestCartToken
    );

    const response = NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 200 }
    );

    // Clear guest cart cookie upon successful merge
    response.cookies.delete('alifworld_guest_cart');

    return response;
  } catch (error) {
    return errorResponse(req, error);
  }
}
