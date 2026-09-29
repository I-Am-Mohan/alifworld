import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { courierDispatchService } from '@/features/shipping';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/shipping/consignments/[consignmentId]/cancel
 * Cancels a courier consignment before collection.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ consignmentId: string }> }
) {
  try {
    const actor = authenticateRequest(req);
    const { consignmentId } = await params;

    let reason: string | undefined;
    try {
      const body = await req.json();
      reason = body.reason;
    } catch {
      // Body is optional
    }

    const result = await courierDispatchService.cancelConsignment(
      consignmentId,
      reason,
      actor.userId
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return errorResponse(req, error);
  }
}
