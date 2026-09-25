import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { InventoryService } from '@/features/inventory/services/inventory-service';
import { QueryStockBalancesSchema } from '@/features/inventory/validators';
import { InventoryPolicy } from '@/shared/authz/policies/inventory.policy';
import { AuthorizationError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

const inventoryService = new InventoryService();

/**
 * GET /api/v1/inventory/balances
 * Lists warehouse stock balances with on-hand, reserved, available, damaged, and quarantine counts.
 * Scoped by seller tenant rules for seller roles.
 */
export async function GET(req: NextRequest) {
  try {
    let actor;
    try {
      actor = authenticateRequest(req);
    } catch {
      actor = undefined;
    }

    const searchParams = req.nextUrl.searchParams;
    const parsedQuery = QueryStockBalancesSchema.parse({
      warehouseId: searchParams.get('warehouseId') || undefined,
      variantId: searchParams.get('variantId') || undefined,
      sellerId: searchParams.get('sellerId') || undefined,
      lowStockOnly: searchParams.get('lowStockOnly') === 'true' ? true : undefined,
    });

    if (actor && !InventoryPolicy.canReadInventory(actor, { sellerId: parsedQuery.sellerId })) {
      throw new AuthorizationError('Insufficient permissions to view inventory stock balances.');
    }

    const options = { ...parsedQuery };

    if (actor && !actor.roles.includes('ADMIN') && !actor.roles.includes('SUPER_ADMIN') && actor.sellerId) {
      options.sellerId = actor.sellerId;
    }

    const balances = await inventoryService.listBalances(options);

    return NextResponse.json({
      success: true,
      data: balances,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationErrorResponse(req, error);
    }
    return errorResponse(req, error);
  }
}
