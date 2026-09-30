import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse } from '@/shared/api/error-response';
import { productReviewService } from '@/features/reviews';
import { UpdateProductReviewSchema } from '@/features/reviews/validators/review.validators';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/v1/reviews/[id]
 * Updates an existing review by author.
 */
export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const actor = authenticateRequest(req);
    const { id } = await props.params;

    const body = await req.json();
    const validatedInput = UpdateProductReviewSchema.parse(body);

    const updated = await productReviewService.updateReview(id, actor.userId, validatedInput);

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

/**
 * DELETE /api/v1/reviews/[id]
 * Deletes a review (author or admin).
 */
export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const actor = authenticateRequest(req);
    const { id } = await props.params;

    const isAdmin = actor.roles.includes('ADMIN') || actor.roles.includes('SUPER_ADMIN');

    await productReviewService.deleteReview(id, actor.userId, isAdmin);

    return NextResponse.json(
      {
        success: true,
        message: 'Review deleted successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(req, error);
  }
}
