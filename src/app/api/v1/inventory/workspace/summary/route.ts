import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse } from '@/shared/api/error-response';
import { InventoryService } from '@/features/inventory/services/inventory-service';

export const dynamic = 'force-dynamic';

const inventoryService = new InventoryService();

/**
 * GET /api/v1/inventory/workspace/summary
 * Retrieves high-level inventory workspace summary metrics (total SKUs, stock balances, alerts, pending approvals).
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
    let sellerId = searchParams.get('sellerId') ?? undefined;

    // Enforce tenant containment for seller actors
    if (actor && actor.sellerId) {
      sellerId = actor.sellerId;
    }

    const summary = await inventoryService.getWorkspaceSummary({ sellerId });

    return NextResponse.json(
      {
        success: true,
        data: summary,
        meta: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(req, error);
  }
}
