import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { InventoryService } from '@/features/inventory/services/inventory-service';
import { ReceiveStockSchema } from '@/features/inventory/validators';
import { InventoryPolicy } from '@/shared/authz/policies/inventory.policy';
import { AuthorizationError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

const inventoryService = new InventoryService();

/**
 * POST /api/v1/inventory/intake
 * Receives incoming stock at a warehouse facility and appends an immutable RECEIVE movement.
 */
export async function POST(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    const body = await req.json();
    const validatedInput = ReceiveStockSchema.parse(body);

    if (!InventoryPolicy.canManageInventory(actor)) {
      throw new AuthorizationError('Insufficient permissions to receive stock intake.');
    }

    const result = await inventoryService.receiveStock(validatedInput, actor.userId);

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationErrorResponse(req, error);
    }
    return errorResponse(req, error);
  }
}
