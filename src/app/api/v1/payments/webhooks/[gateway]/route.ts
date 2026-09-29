import { NextRequest, NextResponse } from 'next/server';
import { paymentMethodDiscoveryService } from '@/features/payment';
import { errorResponse } from '@/shared/api/error-response';
import { ValidationError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/payments/webhooks/[gateway]
 * Receives payment gateway callbacks, cryptographically verifies signatures,
 * and deduplicates external event IDs against PaymentWebhookLog.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ gateway: string }> }
) {
  try {
    const { gateway } = await params;
    const rawBody = await req.text();

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      throw new ValidationError('Invalid JSON webhook body.');
    }

    const headerObj: Record<string, string> = {};
    req.headers.forEach((val, key) => {
      headerObj[key.toLowerCase()] = val;
    });

    const result = await paymentMethodDiscoveryService.handlePaymentWebhook(
      gateway,
      payload,
      rawBody,
      headerObj
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return errorResponse(req, error);
  }
}
