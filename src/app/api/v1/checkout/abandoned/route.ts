import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/shared/authz';
import { abandonedCheckoutRecoveryService } from '@/features/checkout/services/abandoned-checkout-recovery.service';
import { QueryAbandonedCheckoutsSchema } from '@/features/checkout/validators/abandoned-checkout.validators';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { SystemRoleCode } from '@/features/identity/types';
import { AuthorizationError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

function assertAdmin(actor: any) {
  const isAdmin =
    actor.roles?.includes(SystemRoleCode.ADMIN) ||
    actor.roles?.includes(SystemRoleCode.SUPER_ADMIN);

  if (!isAdmin) {
    throw new AuthorizationError('Admin authority required to inspect abandoned checkouts.', {
      code: 'ADMIN_ACCESS_REQUIRED',
    });
  }
}

/**
 * GET /api/v1/checkout/abandoned
 * Admin lists abandoned checkouts with filtering (status, minTotalPoisha, date range) and pagination.
 */
export async function GET(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    assertAdmin(actor);

    const searchParams = req.nextUrl.searchParams;

    const queryInput = QueryAbandonedCheckoutsSchema.parse({
      status: searchParams.get('status') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
      minTotalPoisha: searchParams.get('minTotalPoisha') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
    });

    const result = await abandonedCheckoutRecoveryService.listAbandonedCheckouts(queryInput);

    return NextResponse.json({
      success: true,
      data: result.items,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationErrorResponse(req, error);
    }
    return errorResponse(req, error);
  }
}
