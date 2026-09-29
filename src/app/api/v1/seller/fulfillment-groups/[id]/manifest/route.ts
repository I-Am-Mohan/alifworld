import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { sellerFulfillmentGroupService } from '@/features/fulfillment';
import { errorResponse } from '@/shared/api/error-response';
import { AuthorizationError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

function resolveSellerId(actor: any): string {
  if (actor.sellerId) {
    return actor.sellerId;
  }
  throw new AuthorizationError('Seller authority required to view packing slip manifest.', {
    code: 'SELLER_ACCESS_REQUIRED',
  });
}

/**
 * GET /api/v1/seller/fulfillment-groups/[id]/manifest
 * Retrieves printable packing slip and warehouse manifest data for a seller fulfillment group.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = authenticateRequest(req);
    const { id } = await params;
    const sellerId = resolveSellerId(actor);

    const manifest = await sellerFulfillmentGroupService.getPackingSlipManifest(id, sellerId);

    return NextResponse.json({
      success: true,
      data: manifest,
    });
  } catch (error) {
    return errorResponse(req, error);
  }
}
