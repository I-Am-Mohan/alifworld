import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse } from '@/shared/api/error-response';
import { productReviewService } from '@/features/reviews';
import { VoteReviewSchema } from '@/features/reviews/validators/review.validators';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/reviews/[id]/vote
 * Casts a helpful or unhelpful vote on a review.
 */
export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const actor = authenticateRequest(req);
    const { id } = await props.params;

    const body = await req.json();
    const validatedInput = VoteReviewSchema.parse(body);

    const result = await productReviewService.voteReview(
      id,
      actor.userId,
      validatedInput.isHelpful
    );

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
