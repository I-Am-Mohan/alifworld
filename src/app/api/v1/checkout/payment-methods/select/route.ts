import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { paymentMethodDiscoveryService } from '@/features/payment';
import { SelectPaymentMethodSchema } from '@/features/payment/validators/payment-method.validators';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { ValidationError } from '@/shared/errors/app-error';
import { authenticateRequest } from '@/shared/authz';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/checkout/payment-methods/select
 * Selects a payment method for checkout, checks eligibility, and returns payable totals and gateway actions.
 */
export async function POST(req: NextRequest) {
  try {
    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    const validatedInput = SelectPaymentMethodSchema.parse(payload);

    let customerId: string | null = null;
    try {
      const actor = authenticateRequest(req);
      customerId = actor?.userId || null;
    } catch {
      // Guest selection
    }

    const result = await paymentMethodDiscoveryService.selectPaymentMethod(
      validatedInput,
      customerId
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationErrorResponse(req, error);
    }
    return errorResponse(req, error);
  }
}
