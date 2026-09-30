import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse } from '@/shared/api/error-response';
import { AuthorizationError } from '@/shared/errors/app-error';
import { productQnaService } from '@/features/qna';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/seller/questions
 * Seller operational route to list pre-sale questions across their products.
 * Invariant: sellerId scope applied inside query.
 */
export async function GET(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    if (!actor.sellerId) {
      throw new AuthorizationError(
        'Only registered sellers can access the seller questions portal.'
      );
    }

    const { searchParams } = new URL(req.url);
    const answeredParam = searchParams.get('answered');
    const pageParam = parseInt(searchParams.get('page') || '1', 10);
    const limitParam = parseInt(searchParams.get('limit') || '10', 10);

    const answered =
      answeredParam === 'true' ? true : answeredParam === 'false' ? false : undefined;

    const result = await productQnaService.listSellerQuestions(actor.sellerId, {
      answered,
      page: pageParam,
      limit: limitParam,
    });

    return NextResponse.json(
      {
        success: true,
        data: result.questions,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(req, error);
  }
}
