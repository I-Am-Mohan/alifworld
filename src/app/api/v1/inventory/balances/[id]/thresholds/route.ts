import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { InventoryService } from '@/features/inventory/services/inventory-service';
import { UpdateStockThresholdsSchema } from '@/features/inventory/validators';

export const dynamic = 'force-dynamic';

const inventoryService = new InventoryService();

/**
 * PUT /api/v1/inventory/balances/[id]/thresholds
 * Configures lowStockThreshold and reorderPoint settings for a stock balance.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let actor;
    try {
      actor = authenticateRequest(req);
    } catch {
      actor = undefined;
    }

    const { id } = await params;
    const body = await req.json();

    const validatedInput = UpdateStockThresholdsSchema.parse({
      stockBalanceId: id,
      ...body,
    });

    const updatedBalance = await inventoryService.updateStockThresholds(
      validatedInput,
      actor?.userId
    );

    return NextResponse.json(
      {
        success: true,
        data: updatedBalance,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationErrorResponse(req, error);
    }
    return errorResponse(req, error);
  }
}
