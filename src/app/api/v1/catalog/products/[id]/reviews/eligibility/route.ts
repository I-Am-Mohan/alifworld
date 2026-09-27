import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse } from '@/shared/api/error-response';
import { productReviewService } from '@/features/reviews';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/catalog/products/[id]/reviews/eligibility
 * Checks if the authenticated customer is eligible to submit a verified review for this product.
 */
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const actor = authenticateRequest(req);
    const { id } = await props.params;

    const eligibility = await productReviewService.checkCustomerEligibility(
      actor.userId,
      id
    );

    return NextResponse.json(
      {
        success: true,
        data: eligibility,
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(req, error);
  }
}
