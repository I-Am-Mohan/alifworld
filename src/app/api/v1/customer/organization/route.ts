import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { customerAccountService } from '@/features/customers/services/customer-account.service';
import { RegisterBusinessBuyerSchema } from '@/features/customers/validators';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/customer/organization
 * Retrieves B2B organization details for approved business buyer members.
 * Invariant: Credit limits and corporate pricing are strictly isolated to organization members.
 */
export async function GET(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    const org = await customerAccountService.getBusinessOrganization(actor.userId);

    return NextResponse.json(
      {
        success: true,
        data: org,
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(req, error);
  }
}

/**
 * POST /api/v1/customer/organization
 * Submits application to register customer as an approved Business Buyer organization.
 */
export async function POST(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    const body = await req.json();
    const validatedInput = RegisterBusinessBuyerSchema.parse(body);

    const organization = await customerAccountService.registerBusinessOrganization(
      actor.userId,
      validatedInput
    );

    return NextResponse.json(
      {
        success: true,
        data: organization,
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
