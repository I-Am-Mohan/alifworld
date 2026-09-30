import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { wishlistService } from '@/features/customers/services/wishlist.service';
import { ShareWishlistSchema } from '@/features/customers/validators';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/customer/wishlists/[id]/share
 * Generates or revokes a cryptographic share-safe link for a customer wishlist.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = authenticateRequest(req);
    const { id } = await params;
    const body = await req.json();
    const validatedInput = ShareWishlistSchema.parse(body);

    if (validatedInput.action === 'GENERATE') {
      const result = await wishlistService.generateShareLink(actor.userId, id);
      return NextResponse.json(
        {
          success: true,
          data: result,
        },
        { status: 200 }
      );
    } else {
      const result = await wishlistService.revokeShareLink(actor.userId, id);
      return NextResponse.json(
        {
          success: true,
          data: result,
        },
        { status: 200 }
      );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationErrorResponse(req, error);
    }
    return errorResponse(req, error);
  }
}
