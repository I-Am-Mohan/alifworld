import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { InventoryService } from '@/features/inventory/services/inventory-service';
import { ApproveStockCountCorrectionSchema } from '@/features/inventory/validators';

export const dynamic = 'force-dynamic';

const inventoryService = new InventoryService();

/**
 * POST /api/v1/inventory/counts/corrections/approve
 * Maker-Checker Dual Authorization endpoint for reviewing and approving high-variance physical inventory corrections.
 * Enforces Gate-05 Maker-Checker invariant: Submitter (Maker) cannot be Approver (Checker).
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
    const validatedInput = ApproveStockCountCorrectionSchema.parse(body);

    const result = await inventoryService.approveStockCountCorrection(
      validatedInput,
      actor?.userId ?? 'usr_admin_checker'
    );

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
