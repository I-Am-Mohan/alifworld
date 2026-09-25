import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { WarehouseService } from '@/features/inventory/services/warehouse-service';
import { UpdateWarehouseSchema } from '@/features/inventory/validators';

export const dynamic = 'force-dynamic';

const warehouseService = new WarehouseService();

/**
 * GET /api/v1/warehouses/[id]
 * Retrieves a single warehouse by ID.
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
    const warehouse = await warehouseService.getWarehouse(id, actor);

    return NextResponse.json({
      success: true,
      data: warehouse,
    });
  } catch (error) {
    return errorResponse(req, error);
  }
}

/**
 * PUT /api/v1/warehouses/[id]
 * Updates an existing warehouse with optimistic concurrency version control.
 */
export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = authenticateRequest(req);
    const { id } = await context.params;
    const body = await req.json();

    const validatedInput = UpdateWarehouseSchema.parse(body);
    const updated = await warehouseService.updateWarehouse(id, validatedInput, actor);

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationErrorResponse(req, error);
    }
    return errorResponse(req, error);
  }
}

/**
 * DELETE /api/v1/warehouses/[id]
 * Soft deletes a warehouse.
 */
export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = authenticateRequest(req);
    const { id } = await context.params;

    await warehouseService.deleteWarehouse(id, actor);

    return NextResponse.json({
      success: true,
      data: { message: `Warehouse '${id}' deleted successfully.` },
    });
  } catch (error) {
    return errorResponse(req, error);
  }
}
