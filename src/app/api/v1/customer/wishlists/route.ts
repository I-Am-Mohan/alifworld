import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { wishlistService } from '@/features/customers/services/wishlist.service';
import { CreateWishlistSchema } from '@/features/customers/validators';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/customer/wishlists
 * Retrieves all wishlists belonging to authenticated customer (ensuring default list exists).
 */
export async function GET(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    const wishlists = await wishlistService.listCustomerWishlists(actor.userId);

    return NextResponse.json(
      {
        success: true,
        data: wishlists,
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(req, error);
  }
}

/**
 * POST /api/v1/customer/wishlists
 * Creates a new custom customer wishlist.
 */
export async function POST(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    const body = await req.json();
    const validatedInput = CreateWishlistSchema.parse(body);

    const wishlist = await wishlistService.createWishlist(actor.userId, validatedInput);

    return NextResponse.json(
      {
        success: true,
        data: wishlist,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationErrorResponse(req, error);
    }
    return errorResponse(req, error);
  }
}
