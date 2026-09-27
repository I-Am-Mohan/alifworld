import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse } from '@/shared/api/error-response';
import { b2bCommerceService } from '@/features/customers/services/b2b-commerce.service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/b2b/rfqs/[id]
 * Retrieves details of a single RFQ.
 */
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const actor = authenticateRequest(req);
    const { id } = await props.params;

    const rfq = await b2bCommerceService.getRfqById(
      id,
      actor.userId,
      actor.sellerId || undefined
    );

    return NextResponse.json(
      {
        success: true,
        data: rfq,
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(req, error);
  }
}

/**
 * DELETE /api/v1/b2b/rfqs/[id]
 * Cancels an open RFQ by the buyer organization.
 */
export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const actor = authenticateRequest(req);
    const { id } = await props.params;

    const rfq = await b2bCommerceService.cancelRfq(id, actor.userId);

    return NextResponse.json(
      {
        success: true,
        data: rfq,
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(req, error);
  }
}
