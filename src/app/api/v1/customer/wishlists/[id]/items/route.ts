import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { wishlistService } from '@/features/customers/services/wishlist.service';
import { AddWishlistItemSchema } from '@/features/customers/validators';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/customer/wishlists/[id]/items
 * Adds a catalog product variant to a customer wishlist.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = authenticateRequest(req);
    const { id } = await params;
    const body = await req.json();
    const validatedInput = AddWishlistItemSchema.parse(body);

    const result = await wishlistService.addItemToWishlist(actor.userId, id, validatedInput);

    return NextResponse.json(
      {
        success: true,
        data: result,
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
