import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { customerAccountService } from '@/features/customers/services/customer-account.service';
import { ChangePasswordSchema } from '@/features/customers/validators';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/customer/security
 * Retrieves account security overview (2FA status, verified email/phone, active session count).
 */
export async function GET(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    const security = await customerAccountService.getAccountSecurity(actor.userId);

    return NextResponse.json(
      {
        success: true,
        data: security,
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(req, error);
  }
}

/**
 * POST /api/v1/customer/security
 * Changes customer account password and invalidates existing sessions.
 */
export async function POST(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    const body = await req.json();
    const validatedInput = ChangePasswordSchema.parse(body);

    const result = await customerAccountService.changePassword(
      actor.userId,
      validatedInput
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          message: 'Password changed successfully. Existing sessions have been invalidated.',
          tokenVersion: result.tokenVersion,
        },
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
