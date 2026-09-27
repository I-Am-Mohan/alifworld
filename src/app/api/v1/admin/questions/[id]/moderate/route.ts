import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse } from '@/shared/api/error-response';
import { AuthorizationError } from '@/shared/errors/app-error';
import { productQnaService } from '@/features/qna';
import { AdminModerateQnaSchema } from '@/features/qna/validators/qna.validators';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/admin/questions/[id]/moderate
 * Platform Admin moderates product question status.
 */
export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const actor = authenticateRequest(req);
    if (!actor.roles.includes('ADMIN') && !actor.roles.includes('SUPER_ADMIN')) {
      throw new AuthorizationError('Only AlifWorld Platform Admins can moderate product questions.');
    }

    const { id } = await props.params;
    const body = await req.json();
    const validatedInput = AdminModerateQnaSchema.parse(body);

    const updated = await productQnaService.adminModerateQuestion(
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
