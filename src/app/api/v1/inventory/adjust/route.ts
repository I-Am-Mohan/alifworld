import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { InventoryService } from '@/features/inventory/services/inventory-service';
import { AdjustStockSchema } from '@/features/inventory/validators';
import { InventoryPolicy } from '@/shared/authz/policies/inventory.policy';
import { AuthorizationError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

const inventoryService = new InventoryService();

/**
 * POST /api/v1/inventory/adjust
 * Performs a manual audit inventory adjustment (ADJUST, DAMAGE, WRITE_OFF).
 */
export async function POST(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    const body = await req.json();
    const validatedInput = AdjustStockSchema.parse(body);

    if (!InventoryPolicy.canManageInventory(actor)) {
      throw new AuthorizationError('Insufficient permissions to adjust stock balances.');
    }

    const result = await inventoryService.adjustStock(validatedInput, actor.userId);

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
