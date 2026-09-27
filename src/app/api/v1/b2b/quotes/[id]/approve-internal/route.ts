import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse } from '@/shared/api/error-response';
import { b2bCommerceService } from '@/features/customers/services/b2b-commerce.service';
import { InternalApproveQuoteSchema } from '@/features/customers/validators/b2b.validators';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/b2b/quotes/[id]/approve-internal
 * Organization Admin or Approver grants internal approval for a quote exceeding purchaser spending limits.
 */
export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const actor = authenticateRequest(req);
    const { id } = await props.params;

    const body = await req.json().catch(() => ({}));
    const validatedInput = InternalApproveQuoteSchema.parse(body);

    const approved = await b2bCommerceService.approveInternalQuote(
      id,
      actor.userId,
      validatedInput
    );

    return NextResponse.json(
      {
        success: true,
        data: approved,
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(req, error);
  }
}
