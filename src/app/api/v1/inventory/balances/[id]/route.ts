import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse } from '@/shared/api/error-response';
import { InventoryService } from '@/features/inventory/services/inventory-service';
import { InventoryPolicy } from '@/shared/authz/policies/inventory.policy';
import { AuthorizationError, NotFoundError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

const inventoryService = new InventoryService();

/**
 * GET /api/v1/inventory/balances/[id]
 * Retrieves a single stock balance record by ID.
 */
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    let actor;
    try {
      actor = authenticateRequest(req);
    } catch {
      actor = undefined;
    }

    const { id } = await context.params;
    const balances = await inventoryService.listBalances();
    const balance = balances.find((b) => b.id === id);

    if (!balance) {
      throw new NotFoundError(`Stock balance with id '${id}' not found.`);
    }

    const itemSellerId = balance.variant?.product?.sellerId;
    if (actor && !InventoryPolicy.canReadInventory(actor, { sellerId: itemSellerId })) {
      throw new AuthorizationError('Insufficient permissions to view this stock balance.');
    }

    return NextResponse.json({
      success: true,
      data: balance,
    });
  } catch (error) {
    return errorResponse(req, error);
  }
}
