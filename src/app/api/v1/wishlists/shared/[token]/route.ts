import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '@/shared/api/error-response';
import { wishlistService } from '@/features/customers/services/wishlist.service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/wishlists/shared/[token]
 * Public, share-safe endpoint to view a shared customer wishlist.
 * Invariant: Redacts all personal customer data (no email, phone, addresses, or internal IDs).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const sharedView = await wishlistService.getSharedWishlist(token);

    return NextResponse.json(
      {
        success: true,
        data: sharedView,
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(req, error);
  }
}
