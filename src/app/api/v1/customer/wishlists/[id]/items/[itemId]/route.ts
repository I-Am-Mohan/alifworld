import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse } from '@/shared/api/error-response';
import { wishlistService } from '@/features/customers/services/wishlist.service';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/v1/customer/wishlists/[id]/items/[itemId]
 * Removes an item from a customer wishlist.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const actor = authenticateRequest(req);
    const { id, itemId } = await params;

    const wishlist = await wishlistService.removeItemFromWishlist(actor.userId, id, itemId);

    return NextResponse.json(
      {
        success: true,
        data: wishlist,
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(req, error);
  }
}
