import { NextRequest, NextResponse } from 'next/server';
import { courierDispatchService } from '@/features/shipping';
import { errorResponse } from '@/shared/api/error-response';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/shipping/track/[trackingNumber]
 * Public tracking endpoint for customers, merchants, and operations.
 * Returns full chronological timeline of logistics events with PII phone masking.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ trackingNumber: string }> }
) {
  try {
    const { trackingNumber } = await params;

    const trackingResult = await courierDispatchService.trackShipment(trackingNumber);

    return NextResponse.json({
      success: true,
      data: trackingResult,
    });
  } catch (error) {
    return errorResponse(req, error);
  }
}
