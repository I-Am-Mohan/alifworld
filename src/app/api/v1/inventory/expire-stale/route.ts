import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { InventoryService } from '@/features/inventory/services/inventory-service';
import { ExpireStaleReservationsSchema } from '@/features/inventory/validators';

export const dynamic = 'force-dynamic';

const inventoryService = new InventoryService();

/**
 * POST /api/v1/inventory/expire-stale
 * System / Admin worker endpoint to trigger automated TTL expiry sweep for stale stock reservations.
 */
export async function POST(req: NextRequest) {
  try {
    let actor;
    try {
      actor = authenticateRequest(req);
    } catch {
      actor = undefined;
    }

    let body = {};
    try {
      body = await req.json();
    } catch {
      // Body is optional
    }

    const validatedInput = ExpireStaleReservationsSchema.parse(body);

    const expiredCount = await inventoryService.expireStaleReservations(validatedInput.cutoffDate);

    return NextResponse.json(
      {
        success: true,
        data: {
          expiredCount,
          timestamp: new Date().toISOString(),
        },
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
