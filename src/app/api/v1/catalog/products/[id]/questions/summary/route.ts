import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '@/shared/api/error-response';
import { productQnaService } from '@/features/qna';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/catalog/products/[id]/questions/summary
 * Returns total, answered, and unanswered question counts for a product.
 */
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;

    const summary = await productQnaService.getProductQnaSummary(id);

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
