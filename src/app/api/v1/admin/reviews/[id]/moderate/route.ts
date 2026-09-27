import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse } from '@/shared/api/error-response';
import { AuthorizationError } from '@/shared/errors/app-error';
import { productReviewService } from '@/features/reviews';
import { AdminModerateReviewSchema } from '@/features/reviews/validators/review.validators';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/admin/reviews/[id]/moderate
 * Platform Admin moderates review status (APPROVED, REJECTED, FLAGGED).
 */
export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const actor = authenticateRequest(req);
    if (!actor.roles.includes('ADMIN') && !actor.roles.includes('SUPER_ADMIN')) {
      throw new AuthorizationError('Only AlifWorld Platform Admins can moderate reviews.');
    }

    const { id } = await props.params;
    const body = await req.json();
    const validatedInput = AdminModerateReviewSchema.parse(body);

    const updated = await productReviewService.adminModerateReview(
      id,
      actor.userId,
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
