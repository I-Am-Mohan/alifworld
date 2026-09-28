import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { customerDashboardService } from '@/features/customers';
import { UpdateNotificationMatrixSchema } from '@/features/customers/validators/dashboard.validators';
import { errorResponse } from '@/shared/api/error-response';
import { ValidationError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/customer/notifications/preferences
 * Retrieves granular notification matrix across Email, SMS, Push, and WhatsApp.
 */
export async function GET(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    const matrix = await customerDashboardService.getNotificationPreferencesMatrix(
      actor.userId
    );

    return NextResponse.json(
      {
        success: true,
        data: matrix,
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(req, error);
  }
}

/**
 * PUT /api/v1/customer/notifications/preferences
 * Updates notification channel preferences while strictly enforcing mandatory security invariants.
 */
export async function PUT(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);

    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    const validatedInput = UpdateNotificationMatrixSchema.parse(payload);

    const updated = await customerDashboardService.updateNotificationPreferencesMatrix(
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
    return errorResponse(req, error);
  }
}
