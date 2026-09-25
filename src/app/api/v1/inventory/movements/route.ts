import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { InventoryService } from '@/features/inventory/services/inventory-service';
import { QueryStockMovementsSchema } from '@/features/inventory/validators';
import { InventoryPolicy } from '@/shared/authz/policies/inventory.policy';
import { AuthorizationError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

const inventoryService = new InventoryService();

/**
 * GET /api/v1/inventory/movements
 * Lists append-only, immutable inventory movement ledger records with pagination and filtering.
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
    const parsedQuery = QueryStockMovementsSchema.parse({
      warehouseId: searchParams.get('warehouseId') || undefined,
      variantId: searchParams.get('variantId') || undefined,
      stockBalanceId: searchParams.get('stockBalanceId') || undefined,
      sellerId: searchParams.get('sellerId') || undefined,
      movementType: searchParams.get('movementType') || undefined,
      sourceType: searchParams.get('sourceType') || undefined,
      sourceId: searchParams.get('sourceId') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
    });

    if (actor && !InventoryPolicy.canReadInventory(actor, { sellerId: parsedQuery.sellerId })) {
      throw new AuthorizationError('Insufficient permissions to view inventory movement ledger.');
    }

    const options = { ...parsedQuery };

    if (actor && !actor.roles.includes('ADMIN') && !actor.roles.includes('SUPER_ADMIN') && actor.sellerId) {
      options.sellerId = actor.sellerId;
    }

    const result = await inventoryService.listPaginatedMovements(options);

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
