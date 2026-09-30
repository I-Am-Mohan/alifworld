import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { sellerFulfillmentGroupService } from '@/features/fulfillment';
import { errorResponse } from '@/shared/api/error-response';
import { SystemRoleCode } from '@/features/identity/types';
import { AuthorizationError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

function resolveSellerId(actor: any): string {
  const isSuperAdmin = actor.roles?.includes(SystemRoleCode.SUPER_ADMIN);
  const isPlatformAdmin = actor.roles?.includes(SystemRoleCode.ADMIN);

  if (isSuperAdmin || isPlatformAdmin) {
    return actor.sellerId || '';
  }

  if (actor.sellerId) {
    return actor.sellerId;
  }

  throw new AuthorizationError('Seller authority required to view fulfillment group.', {
    code: 'SELLER_ACCESS_REQUIRED',
  });
}

/**
 * GET /api/v1/seller/fulfillment-groups/[id]
 * Retrieves single fulfillment group details scoped strictly by the seller's tenant ID.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = authenticateRequest(req);
    const { id } = await params;

    const isSuperAdmin = actor.roles?.includes(SystemRoleCode.SUPER_ADMIN);
    const isPlatformAdmin = actor.roles?.includes(SystemRoleCode.ADMIN);

    let group;
    if (isSuperAdmin || isPlatformAdmin) {
      group = await sellerFulfillmentGroupService.getGroupAdmin(id);
    } else {
      const sellerId = resolveSellerId(actor);
      group = await sellerFulfillmentGroupService.getGroupForSeller(id, sellerId);
    }

    return NextResponse.json({
      success: true,
      data: group,
    });
  } catch (error) {
    return errorResponse(req, error);
  }
}
