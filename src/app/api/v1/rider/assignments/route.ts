/**
 * REST API Route Handler: /api/v1/rider/assignments
 * 
 * Manages atomic delivery assignment acceptance and double-assignment prevention.
 * 
 * Invariants: ADR-0003, ADR-0006, ADR-0022, ADR-0024, Milestone 046
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { RiderDeliveryService } from '@/services/rider-delivery.service';
import { RiderAcceptAssignmentSchema } from '@/validators/support-and-rider.validators';
import { AppError } from '@/shared/errors/app-error';

const deliveryService = new RiderDeliveryService();

export async function POST(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_JSON', message: 'Valid JSON payload is required.' } },
        { status: 400 }
      );
    }

    const parseResult = RiderAcceptAssignmentSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: parseResult.error.errors[0]?.message || 'Input validation failed',
            details: parseResult.error.format(),
          },
        },
        { status: 422 }
      );
    }

    const assignment = await deliveryService.acceptAssignment(actor, parseResult.data);

    return NextResponse.json({
      success: true,
      data: assignment,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toJSON(), { status: error.statusCode });
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
