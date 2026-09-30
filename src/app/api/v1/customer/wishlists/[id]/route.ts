import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { wishlistService } from '@/features/customers/services/wishlist.service';
import { UpdateWishlistSchema } from '@/features/customers/validators';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/customer/wishlists/[id]
 * Retrieves a customer wishlist by ID with self-service ownership assertion.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = authenticateRequest(req);
    const { id } = await params;

    const wishlist = await wishlistService.getWishlistById(actor.userId, id);

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

/**
 * PUT /api/v1/customer/wishlists/[id]
 * Updates wishlist attributes (title, description, visibility).
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = authenticateRequest(req);
    const { id } = await params;
    const body = await req.json();
    const validatedInput = UpdateWishlistSchema.parse(body);

    const updated = await wishlistService.updateWishlist(actor.userId, id, validatedInput);

    return NextResponse.json(
      {
        success: true,
        data: updated,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationErrorResponse(req, error);
    }
    return errorResponse(req, error);
  }
}

/**
 * DELETE /api/v1/customer/wishlists/[id]
 * Deletes a custom customer wishlist. (Primary default wishlist cannot be deleted).
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = authenticateRequest(req);
    const { id } = await params;

    const result = await wishlistService.deleteWishlist(actor.userId, id);

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
