import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse } from '@/shared/api/error-response';
import { b2bCommerceService } from '@/features/customers/services/b2b-commerce.service';
import { NegotiateQuoteSchema } from '@/features/customers/validators/b2b.validators';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/b2b/quotes/[id]/negotiate
 * Submits a counter-offer or revision to a quote (increments version).
 */
export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const actor = authenticateRequest(req);
    const { id } = await props.params;

    const body = await req.json();
    const validatedInput = NegotiateQuoteSchema.parse(body);

    const proposedBy: 'BUYER' | 'SELLER' = actor.sellerId ? 'SELLER' : 'BUYER';

    const updated = await b2bCommerceService.negotiateQuote(
      id,
      actor.userId,
      proposedBy,
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
