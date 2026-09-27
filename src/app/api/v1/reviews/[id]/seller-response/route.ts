import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse } from '@/shared/api/error-response';
import { AuthorizationError } from '@/shared/errors/app-error';
import { productReviewService } from '@/features/reviews';
import { SellerResponseReviewSchema } from '@/features/reviews/validators/review.validators';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/reviews/[id]/seller-response
 * Adds or updates an official seller response to a review on their product.
 * Enforces seller tenant isolation.
 */
export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const actor = authenticateRequest(req);
    if (!actor.sellerId) {
      throw new AuthorizationError('Only registered sellers can respond to customer reviews.');
    }

    const { id } = await props.params;
    const body = await req.json();
    const validatedInput = SellerResponseReviewSchema.parse(body);

    const updated = await productReviewService.sellerRespondToReview(
      id,
      actor.userId,
      actor.sellerId,
      validatedInput
    );

    return NextResponse.json(
      {
        success: true,
        data: updated,
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(req, error);
  }
}
