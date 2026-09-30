import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { serverCheckoutCalculationService } from '@/features/checkout';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/checkout/tax-breakdown/[orderId]
 * Returns authoritative NBR Mushak-6.3 tax breakdown and line snapshots for an order.
 * Enforces customer self-ownership and seller tenant authorization.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const actor = authenticateRequest(req);
    const { orderId } = await params;

    const data = await serverCheckoutCalculationService.getOrderTaxBreakdown(orderId, actor);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    return errorResponse(req, error);
  }
}
