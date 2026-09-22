/**
 * REST API Route Handler: /api/v1/rider/location
 * 
 * Ingests live rider GPS telemetry (compact JSON, throttled in cache for mobile Flutter).
 * 
 * Invariants: ADR-0003, ADR-0006, ADR-0022, ADR-0024, Milestone 046
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { RiderDeliveryService } from '@/services/rider-delivery.service';
import { RiderLocationUpdateSchema } from '@/validators/support-and-rider.validators';
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

    const parseResult = RiderLocationUpdateSchema.safeParse(body);
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

    const telemetry = await deliveryService.updateLiveLocation(actor, parseResult.data);

    return NextResponse.json({
      success: true,
      data: telemetry,
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
