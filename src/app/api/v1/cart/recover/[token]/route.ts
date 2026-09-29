import { NextRequest, NextResponse } from 'next/server';
import { abandonedCheckoutRecoveryService } from '@/features/checkout/services/abandoned-checkout-recovery.service';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/cart/recover/[token]
 * Restores an abandoned shopping cart from a recovery link token.
 * Performs live server-side stock balance, price, and merchant status revalidation.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const guestCartToken = req.headers.get('x-guest-cart-token');

    const result = await abandonedCheckoutRecoveryService.recoverCart(token, guestCartToken);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return errorResponse(req, error);
  }
}
