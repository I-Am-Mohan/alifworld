import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { customerAccountService } from '@/features/customers/services/customer-account.service';
import { UpdatePreferencesSchema } from '@/features/customers/validators';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/customer/preferences
 * Retrieves customer notification and communication preferences.
 */
export async function GET(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    const preferences = await customerAccountService.getCustomerPreferences(actor.userId);

    return NextResponse.json(
      {
        success: true,
        data: preferences,
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(req, error);
  }
}

/**
 * PUT /api/v1/customer/preferences
 * Updates customer communication and marketing preferences.
 */
export async function PUT(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    const body = await req.json();
    const validatedInput = UpdatePreferencesSchema.parse(body);

    const updated = await customerAccountService.updateCustomerPreferences(
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
