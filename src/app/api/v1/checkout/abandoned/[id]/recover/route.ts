import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/shared/authz';
import { abandonedCheckoutRecoveryService } from '@/features/checkout/services/abandoned-checkout-recovery.service';
import { TriggerRecoverySchema } from '@/features/checkout/validators/abandoned-checkout.validators';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { SystemRoleCode } from '@/features/identity/types';
import { AuthorizationError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

function assertAdmin(actor: any) {
  const isAdmin =
    actor.roles?.includes(SystemRoleCode.ADMIN) ||
    actor.roles?.includes(SystemRoleCode.SUPER_ADMIN);

  if (!isAdmin) {
    throw new AuthorizationError('Admin authority required to trigger recovery notification.', {
      code: 'ADMIN_ACCESS_REQUIRED',
    });
  }
}

/**
 * POST /api/v1/checkout/abandoned/[id]/recover
 * Admin triggers recovery notification dispatch (email/SMS) with optional promotional coupon.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = authenticateRequest(req);
    assertAdmin(actor);

    const { id } = await params;

    let payload: unknown = {};
    try {
      payload = await req.json();
    } catch {
      // Body is optional
    }

    const validatedInput = TriggerRecoverySchema.parse(payload);

    const result = await abandonedCheckoutRecoveryService.triggerRecoveryNotification(
      id,
      validatedInput,
      actor.userId
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
