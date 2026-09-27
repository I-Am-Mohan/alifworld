import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { InventoryService } from '@/features/inventory/services/inventory-service';
import { ReleaseReservationSchema } from '@/features/inventory/validators';

export const dynamic = 'force-dynamic';

const inventoryService = new InventoryService();

/**
 * POST /api/v1/inventory/release
 * Idempotently releases an active checkout stock reservation, returning units to available balance.
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
    const validatedInput = ReleaseReservationSchema.parse(body);

    const result = await inventoryService.releaseReservation(validatedInput, actor?.userId);

    return NextResponse.json(
      {
        success: true,
        data: result,
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
