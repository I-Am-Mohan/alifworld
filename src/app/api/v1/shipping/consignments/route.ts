import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/shared/authz';
import { courierDispatchService, shipmentRepository } from '@/features/shipping';
import { CreateConsignmentSchema } from '@/features/shipping/validators/courier.validators';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { ValidationError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/shipping/consignments
 * Lists shipments and courier consignments scoped to the caller's tenant.
 */
export async function GET(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    const searchParams = req.nextUrl.searchParams;

    const page = Number(searchParams.get('page') || '1');
    const limit = Number(searchParams.get('limit') || '20');
    const status = searchParams.get('status') || undefined;
    const courierProvider = searchParams.get('courierProvider') || undefined;

    // Tenant scoping: merchants see only their own shipments; admins see all
    const sellerId = actor.sellerId || searchParams.get('sellerId') || undefined;

    const result = await shipmentRepository.listShipments({
      sellerId,
      status,
      courierProvider,
      page,
      limit,
    });

    return NextResponse.json({
      success: true,
      data: result.items,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
      },
    });
  } catch (error) {
    return errorResponse(req, error);
  }
}

/**
 * POST /api/v1/shipping/consignments
 * Dispatches a seller fulfillment package and creates a consignment with the selected courier.
 * Normalizes recipient phone number to canonical Bangladesh E.164 (+8801XXXXXXXXX).
 */
export async function POST(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);

    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    const validatedInput = CreateConsignmentSchema.parse(payload);

    const result = await courierDispatchService.createConsignment(
      validatedInput,
      actor.userId
    );

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
