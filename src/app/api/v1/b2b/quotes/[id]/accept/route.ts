import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse } from '@/shared/api/error-response';
import { b2bCommerceService } from '@/features/customers/services/b2b-commerce.service';
import { AcceptQuoteSchema } from '@/features/customers/validators/b2b.validators';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/b2b/quotes/[id]/accept
 * Buyer accepts a negotiated quote before expiration.
 */
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const actor = authenticateRequest(req);
    const { id } = await props.params;

    const body = await req.json().catch(() => ({}));
    const validatedInput = AcceptQuoteSchema.parse(body);

    const accepted = await b2bCommerceService.acceptQuote(id, actor.userId, validatedInput);

    return NextResponse.json(
      {
        success: true,
        data: accepted,
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(req, error);
  }
}
