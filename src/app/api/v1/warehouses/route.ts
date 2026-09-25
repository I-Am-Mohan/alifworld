import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { WarehouseService } from '@/features/inventory/services/warehouse-service';
import { CreateWarehouseSchema } from '@/features/inventory/validators';

export const dynamic = 'force-dynamic';

const warehouseService = new WarehouseService();

/**
 * POST /api/v1/warehouses
 * Creates a new warehouse or fulfillment hub.
 */
export async function POST(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    const body = await req.json();
    const validatedInput = CreateWarehouseSchema.parse(body);

    const warehouse = await warehouseService.createWarehouse(validatedInput, actor);

    return NextResponse.json(
      {
        success: true,
        data: warehouse,
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

/**
 * GET /api/v1/warehouses
 * Lists warehouses and fulfillment hubs across Bangladesh divisions.
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
    const division = searchParams.get('division') || undefined;
    const isPlatformHubParam = searchParams.get('isPlatformHub');
    const isActiveParam = searchParams.get('isActive');
    const sellerId = searchParams.get('sellerId') || undefined;

    const options = {
      division,
      isPlatformHub: isPlatformHubParam !== null ? isPlatformHubParam === 'true' : undefined,
      isActive: isActiveParam !== null ? isActiveParam === 'true' : undefined,
      sellerId,
    };

    const warehouses = await warehouseService.listWarehouses(options, actor);

    return NextResponse.json({
      success: true,
      data: warehouses,
    });
  } catch (error) {
    return errorResponse(req, error);
  }
}
