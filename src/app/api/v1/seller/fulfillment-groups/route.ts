import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/shared/authz';
import { sellerFulfillmentGroupService } from '@/features/fulfillment';
import { FulfillmentGroupQuerySchema } from '@/features/fulfillment/validators/fulfillment-group.validators';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { SystemRoleCode } from '@/features/identity/types';
import { AuthorizationError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

function resolveSellerId(actor: any, requestedSellerId?: string | null): string {
  const isSuperAdmin = actor.roles?.includes(SystemRoleCode.SUPER_ADMIN);
  const isPlatformAdmin = actor.roles?.includes(SystemRoleCode.ADMIN);

  if ((isSuperAdmin || isPlatformAdmin) && requestedSellerId) {
    return requestedSellerId;
  }

  if (actor.sellerId) {
    if (requestedSellerId && requestedSellerId !== actor.sellerId) {
      throw new AuthorizationError(
        'Tenant access violation: you cannot access another merchant fulfillment data.',
        { code: 'TENANT_VIOLATION' }
      );
    }
    return actor.sellerId;
  }

  throw new AuthorizationError('Seller authority required to access fulfillment groups.', {
    code: 'SELLER_ACCESS_REQUIRED',
  });
}

/**
 * GET /api/v1/seller/fulfillment-groups
 * Lists fulfillment groups scoped strictly to the authenticated seller tenant.
 */
export async function GET(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    const searchParams = req.nextUrl.searchParams;

    const queryInput = FulfillmentGroupQuerySchema.parse({
      status: searchParams.get('status') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
      sellerId: searchParams.get('sellerId') || undefined,
    });

    const sellerId = resolveSellerId(actor, queryInput.sellerId);

    const result = await sellerFulfillmentGroupService.listGroupsForSeller(
      sellerId,
      queryInput
    );

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
