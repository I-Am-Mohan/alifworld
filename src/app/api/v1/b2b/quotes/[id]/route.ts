import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse } from '@/shared/api/error-response';
import { b2bCommerceService } from '@/features/customers/services/b2b-commerce.service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/b2b/quotes/[id]
 * Retrieves single quote details with full version and item snapshots.
 */
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const actor = authenticateRequest(req);
    const { id } = await props.params;

    const quote = await b2bCommerceService.getQuoteById(
      id,
      actor.userId,
      actor.sellerId || undefined
    );

    return NextResponse.json(
      {
        success: true,
        data: quote,
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(req, error);
  }
}
