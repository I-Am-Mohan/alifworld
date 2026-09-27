import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { customerAccountService } from '@/features/customers/services/customer-account.service';
import { UpdateConsentSchema } from '@/features/customers/validators';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/customer/consent
 * Retrieves current customer regulatory consent status (terms, privacy, marketing).
 */
export async function GET(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    const consent = await customerAccountService.getCustomerConsent(actor.userId);

    return NextResponse.json(
      {
        success: true,
        data: consent,
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(req, error);
  }
}

/**
 * PUT /api/v1/customer/consent
 * Updates regulatory consent records with version tracking.
 */
export async function PUT(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    const body = await req.json();
    const validatedInput = UpdateConsentSchema.parse(body);

    const updated = await customerAccountService.updateCustomerConsent(
      actor.userId,
      validatedInput
    );

    return NextResponse.json(
      {
        success: true,
        data: updated,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationErrorResponse(req, error);
    }
    return errorResponse(req, error);
  }
}
