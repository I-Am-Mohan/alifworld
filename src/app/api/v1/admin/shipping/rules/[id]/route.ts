import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/shared/authz';
import { shippingRateService } from '@/features/shipping';
import { UpdateShippingRateRuleSchema } from '@/features/shipping/validators/shipping-rate.validators';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { SystemRoleCode } from '@/features/identity/types';
import { AuthorizationError, ValidationError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

function assertAdmin(actor: any) {
  const isAdmin =
    actor.roles.includes(SystemRoleCode.ADMIN) || actor.roles.includes(SystemRoleCode.SUPER_ADMIN);

  if (!isAdmin) {
    throw new AuthorizationError('Admin or Super Admin authority required.', {
      code: 'ADMIN_ACCESS_REQUIRED',
    });
  }
}

/**
 * GET /api/v1/admin/shipping/rules/[id]
 * Retrieves shipping rate rule by ID.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = authenticateRequest(req);
    assertAdmin(actor);

    const { id } = await params;
    const rule = await shippingRateService.getRuleById(id);

    return NextResponse.json({
      success: true,
      data: rule,
    });
  } catch (error) {
    return errorResponse(req, error);
  }
}

/**
 * PATCH /api/v1/admin/shipping/rules/[id]
 * Updates an existing shipping rate rule.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = authenticateRequest(req);
    assertAdmin(actor);

    const { id } = await params;

    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    const validatedInput = UpdateShippingRateRuleSchema.parse({
      ...(payload as any),
      id,
    });

    const updated = await shippingRateService.updateRule(id, validatedInput, actor.userId);

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationErrorResponse(req, error);
    }
    return errorResponse(req, error);
  }
}

/**
 * DELETE /api/v1/admin/shipping/rules/[id]
 * Soft deletes a shipping rate rule.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = authenticateRequest(req);
    assertAdmin(actor);

    const { id } = await params;
    await shippingRateService.deleteRule(id, actor.userId);

    return NextResponse.json({
      success: true,
      data: { message: `Shipping rate rule '${id}' archived successfully.` },
    });
  } catch (error) {
    return errorResponse(req, error);
  }
}
