import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { paymentMethodDiscoveryService } from '@/features/payment';
import { DiscoverPaymentMethodsSchema } from '@/features/payment/validators/payment-method.validators';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { ValidationError } from '@/shared/errors/app-error';
import { authenticateRequest } from '@/shared/authz';

export const dynamic = 'force-dynamic';

function extractCustomerId(req: NextRequest): string | null {
  try {
    const actor = authenticateRequest(req);
    return actor?.userId || null;
  } catch {
    return null;
  }
}

/**
 * GET /api/v1/checkout/payment-methods
 * Discovers available payment methods based on query parameters.
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const customerId = extractCustomerId(req);

    const orderTotalPoisha = searchParams.has('orderTotalPoisha')
      ? Number(searchParams.get('orderTotalPoisha'))
      : undefined;

    const validatedInput = DiscoverPaymentMethodsSchema.parse({
      orderTotalPoisha,
      cartId: searchParams.get('cartId') || undefined,
      clientPlatform: (searchParams.get('clientPlatform') as any) || 'WEB',
    });

    const result = await paymentMethodDiscoveryService.discoverPaymentMethods(
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

/**
 * POST /api/v1/checkout/payment-methods
 * Discovers available payment methods based on JSON body (including cart, address, and digital flags).
 */
export async function POST(req: NextRequest) {
  try {
    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    const validatedInput = DiscoverPaymentMethodsSchema.parse(payload);
    const customerId = extractCustomerId(req);

    const result = await paymentMethodDiscoveryService.discoverPaymentMethods(
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
