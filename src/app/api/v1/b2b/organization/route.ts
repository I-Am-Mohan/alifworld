import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse } from '@/shared/api/error-response';
import { b2bCommerceService } from '@/features/customers/services/b2b-commerce.service';
import { RegisterBusinessBuyerSchema } from '@/features/customers/validators';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/b2b/organization
 * Retrieves the active Business Buyer organization for the authenticated customer.
 */
export async function GET(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    const org = await b2bCommerceService.getUserOrganization(actor.userId);

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
 * POST /api/v1/b2b/organization
 * Submits application to register a customer account as a Business Buyer organization.
 */
export async function POST(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    const body = await req.json();
    const validatedInput = RegisterBusinessBuyerSchema.parse(body);

    const organization = await b2bCommerceService.registerOrganization(
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
    return errorResponse(req, error);
  }
}
