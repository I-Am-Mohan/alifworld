import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse } from '@/shared/api/error-response';
import { productReviewService } from '@/features/reviews';
import {
  CreateProductReviewSchema,
  ListProductReviewsQuerySchema,
} from '@/features/reviews/validators/review.validators';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/catalog/products/[id]/reviews
 * Public endpoint to list verified customer reviews for a product.
 * Redacts customer PII and returns star ratings, comments, and media.
 */
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const { searchParams } = new URL(req.url);

    const query = ListProductReviewsQuerySchema.parse(
      Object.fromEntries(searchParams.entries())
    );

    // Optional authentication to include currentUserVote if user is logged in
    let currentUserId: string | undefined;
    try {
      const actor = authenticateRequest(req);
      currentUserId = actor.userId;
    } catch {
      // Unauthenticated public request
    }

    const result = await productReviewService.getProductReviews(
      id,
      query,
      currentUserId
    );

    return NextResponse.json(
      {
        success: true,
        data: result.reviews,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(req, error);
  }
}

/**
 * POST /api/v1/catalog/products/[id]/reviews
 * Submits a verified-purchase review. Requires authenticated customer with a delivered purchase.
 */
export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const actor = authenticateRequest(req);
    const { id } = await props.params;

    const body = await req.json();
    const validatedInput = CreateProductReviewSchema.parse({
      ...body,
      productId: id,
    });

    const review = await productReviewService.createReview(
      actor.userId,
      validatedInput
    );

    return NextResponse.json(
      {
        success: true,
        data: review,
      },
      { status: 201 }
    );
  } catch (error) {
    return errorResponse(req, error);
  }
}
