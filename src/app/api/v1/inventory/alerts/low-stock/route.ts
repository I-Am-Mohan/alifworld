import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse } from '@/shared/api/error-response';
import { InventoryService } from '@/features/inventory/services/inventory-service';

export const dynamic = 'force-dynamic';

const inventoryService = new InventoryService();

/**
 * GET /api/v1/inventory/alerts/low-stock
 * Lists stock balances currently triggering low-stock alerts (available <= lowStockThreshold).
 * Enforces seller-tenant scoping for seller actors.
 */
export async function GET(req: NextRequest) {
  try {
    let actor;
    try {
      actor = authenticateRequest(req);
    } catch {
      actor = undefined;
    }

    const { searchParams } = new URL(req.url);
    const warehouseId = searchParams.get('warehouseId') ?? undefined;
    let sellerId = searchParams.get('sellerId') ?? undefined;

    // Enforce tenant scoping for seller actors
    if (actor && actor.sellerId) {
      sellerId = actor.sellerId;
    }

    const lowStockAlerts = await inventoryService.listLowStockAlerts({
      warehouseId,
      sellerId,
    });

    return NextResponse.json(
      {
        success: true,
        data: lowStockAlerts,
        meta: {
          count: lowStockAlerts.length,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(req, error);
  }
}
