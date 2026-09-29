import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { sellerFulfillmentGroupService } from '@/features/fulfillment';
import { errorResponse } from '@/shared/api/error-response';
import { SystemRoleCode } from '@/features/identity/types';
import { AuthorizationError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

function assertAdmin(actor: any) {
  const isAdmin =
    actor.roles?.includes(SystemRoleCode.ADMIN) ||
    actor.roles?.includes(SystemRoleCode.SUPER_ADMIN);

  if (!isAdmin) {
    throw new AuthorizationError('Admin authority required to inspect fulfillment group.', {
      code: 'ADMIN_ACCESS_REQUIRED',
    });
  }
}

/**
 * GET /api/v1/admin/fulfillment-groups/[id]
 * Admin retrieves single fulfillment group details.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = authenticateRequest(req);
    assertAdmin(actor);

    const { id } = await params;
    const group = await sellerFulfillmentGroupService.getGroupAdmin(id);

    return NextResponse.json({
      success: true,
      data: group,
    });
  } catch (error) {
    return errorResponse(req, error);
  }
}
