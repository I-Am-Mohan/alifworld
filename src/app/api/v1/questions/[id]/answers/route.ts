import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse } from '@/shared/api/error-response';
import { AuthorizationError } from '@/shared/errors/app-error';
import { productQnaService } from '@/features/qna';
import { CreateAnswerSchema } from '@/features/qna/validators/qna.validators';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/questions/[id]/answers
 * Posts an official seller response to a product question.
 * Enforces seller tenant scoping inside the repository query.
 */
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const actor = authenticateRequest(req);
    if (!actor.sellerId) {
      throw new AuthorizationError(
        'Only registered sellers can answer customer pre-sale questions.'
      );
    }

    const { id } = await props.params;
    const body = await req.json();
    const validatedInput = CreateAnswerSchema.parse(body);

    const answer = await productQnaService.answerQuestion(
      id,
      actor.userId,
      actor.sellerId,
      validatedInput
    );

    return NextResponse.json(
      {
        success: true,
        data: answer,
      },
      { status: 201 }
    );
  } catch (error) {
    return errorResponse(req, error);
  }
}
