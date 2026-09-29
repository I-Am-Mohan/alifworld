import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/shared/authz';
import { sellerFulfillmentGroupService } from '@/features/fulfillment';
import { FulfillmentGroupQuerySchema } from '@/features/fulfillment/validators/fulfillment-group.validators';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { SystemRoleCode } from '@/features/identity/types';
import { AuthorizationError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

function assertAdmin(actor: any) {
  const isAdmin =
    actor.roles?.includes(SystemRoleCode.ADMIN) ||
    actor.roles?.includes(SystemRoleCode.SUPER_ADMIN);

  if (!isAdmin) {
    throw new AuthorizationError('Admin authority required to inspect all fulfillment groups.', {
      code: 'ADMIN_ACCESS_REQUIRED',
    });
  }
}

/**
 * GET /api/v1/admin/fulfillment-groups
 * Admin lists fulfillment groups across all sellers with filtering and pagination.
 */
export async function GET(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    assertAdmin(actor);

    const searchParams = req.nextUrl.searchParams;

    const queryInput = FulfillmentGroupQuerySchema.parse({
      status: searchParams.get('status') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
      sellerId: searchParams.get('sellerId') || undefined,
    });

    const result = await sellerFulfillmentGroupService.listGroupsAdmin(queryInput);

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
