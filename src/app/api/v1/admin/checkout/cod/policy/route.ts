import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/shared/authz';
import { codFraudRiskService } from '@/features/checkout';
import { UpdateCodPolicySchema } from '@/features/checkout/validators/cod-risk.validators';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { SystemRoleCode } from '@/features/identity/types';
import { AuthorizationError, ValidationError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

function assertAdmin(actor: any) {
  const isAdmin =
    actor.roles?.includes(SystemRoleCode.ADMIN) ||
    actor.roles?.includes(SystemRoleCode.SUPER_ADMIN);

  if (!isAdmin) {
    throw new AuthorizationError('Admin authority required to manage COD policy.', {
      code: 'ADMIN_ACCESS_REQUIRED',
    });
  }
}

/**
 * GET /api/v1/admin/checkout/cod/policy
 * Admin retrieves the current COD policy limits and thresholds.
 */
export async function GET(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    assertAdmin(actor);

    const config = await codFraudRiskService.getCodPolicyConfig();

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error) {
    return errorResponse(req, error);
  }
}

/**
 * PUT /api/v1/admin/checkout/cod/policy
 * Admin updates versioned COD risk policy thresholds.
 */
export async function PUT(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    assertAdmin(actor);

    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    const validatedInput = UpdateCodPolicySchema.parse(payload);
    const updated = await codFraudRiskService.getCodPolicyConfig();

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        ...validatedInput,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationErrorResponse(req, error);
    }
    return errorResponse(req, error);
  }
}
