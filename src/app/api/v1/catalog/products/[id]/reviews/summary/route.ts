import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '@/shared/api/error-response';
import { productReviewService } from '@/features/reviews';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/catalog/products/[id]/reviews/summary
 * Public aggregate star rating, review count, and star distribution summary.
 */
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;

    const summary = await productReviewService.getProductRatingSummary(id);

    return NextResponse.json(
      {
        success: true,
        data: summary,
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(req, error);
  }
}
