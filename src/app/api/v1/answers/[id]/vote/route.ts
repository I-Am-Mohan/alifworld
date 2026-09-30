import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse } from '@/shared/api/error-response';
import { productQnaService } from '@/features/qna';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/answers/[id]/vote
 * Toggles an upvote on an answer.
 */
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const actor = authenticateRequest(req);
    const { id } = await props.params;

    const result = await productQnaService.voteAnswer(id, actor.userId);

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
