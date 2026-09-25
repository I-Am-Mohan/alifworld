import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { InventoryService } from '@/features/inventory/services/inventory-service';
import { ReserveStockSchema } from '@/features/inventory/validators';

export const dynamic = 'force-dynamic';

const inventoryService = new InventoryService();

/**
 * POST /api/v1/inventory/reserve
 * Atomically reserves available warehouse stock for a checkout session with deterministic TTL expiry.
 * Features idempotency and concurrency protection against overselling.
 */
export async function POST(req: NextRequest) {
  try {
    let actor;
    try {
      actor = authenticateRequest(req);
    } catch {
      actor = undefined;
    }

    const body = await req.json();
    const validatedInput = ReserveStockSchema.parse(body);

    const result = await inventoryService.reserveStock(validatedInput);

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
