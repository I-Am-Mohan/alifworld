import { NextRequest, NextResponse } from 'next/server';
import { courierDispatchService } from '@/features/shipping';
import { CourierWebhookParamsSchema } from '@/features/shipping/validators/courier.validators';
import { errorResponse } from '@/shared/api/error-response';
import { ValidationError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/shipping/webhooks/[courier]
 * Ingests asynchronous webhook status updates from Bangladesh courier partners
 * (Pathao, Steadfast, RedX, Paperfly).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ courier: string }> }
) {
  try {
    const rawParams = await params;
    const validatedParams = CourierWebhookParamsSchema.parse({
      courier: rawParams.courier.toLowerCase(),
    });

    const rawBody = await req.text();
    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      throw new ValidationError('Invalid JSON webhook body.');
    }

    // Convert request headers to Record<string, string>
    const headerObj: Record<string, string> = {};
    req.headers.forEach((val, key) => {
      headerObj[key.toLowerCase()] = val;
    });

    const result = await courierDispatchService.handleCourierWebhook(
      validatedParams.courier.toUpperCase(),
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
