import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse } from '@/shared/api/error-response';
import { productQnaService } from '@/features/qna';
import {
  CreateQuestionSchema,
  ListProductQuestionsQuerySchema,
} from '@/features/qna/validators/qna.validators';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/catalog/products/[id]/questions
 * Public endpoint to list approved questions and official answers for a product.
 * Redacts customer personal details for zero PII leakage.
 */
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const { searchParams } = new URL(req.url);

    const query = ListProductQuestionsQuerySchema.parse(
      Object.fromEntries(searchParams.entries())
    );

    let currentUserId: string | undefined;
    try {
      const actor = authenticateRequest(req);
      currentUserId = actor.userId;
    } catch {
      // Unauthenticated public request
    }

    const result = await productQnaService.getProductQuestions(
      id,
      query,
      currentUserId
    );

    return NextResponse.json(
      {
        success: true,
        data: result.questions,
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
 * POST /api/v1/catalog/products/[id]/questions
 * Submits a customer inquiry on a product.
 */
export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const actor = authenticateRequest(req);
    const { id } = await props.params;

    const body = await req.json();
    const validatedInput = CreateQuestionSchema.parse({
      ...body,
      productId: id,
    });

    const question = await productQnaService.createQuestion(
      actor.userId,
      validatedInput
    );

    return NextResponse.json(
      {
        success: true,
        data: question,
      },
      { status: 201 }
    );
  } catch (error) {
    return errorResponse(req, error);
  }
}
