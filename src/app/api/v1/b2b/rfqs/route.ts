import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse } from '@/shared/api/error-response';
import { b2bCommerceService } from '@/features/customers/services/b2b-commerce.service';
import { CreateRfqSchema } from '@/features/customers/validators/b2b.validators';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/b2b/rfqs
 * Lists RFQs based on actor role (Buyer, Seller, or Admin).
 */
export async function GET(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    const { searchParams } = new URL(req.url);
    const roleParam = searchParams.get('role'); // 'BUYER' | 'SELLER' | 'ADMIN'
    const statusParam = searchParams.get('status') || undefined;

    let role: 'BUYER' | 'SELLER' | 'ADMIN' = 'BUYER';
    if (roleParam === 'SELLER' || actor.sellerId) {
      role = 'SELLER';
    } else if (
      roleParam === 'ADMIN' &&
      (actor.roles.includes('ADMIN') || actor.roles.includes('SUPER_ADMIN'))
    ) {
      role = 'ADMIN';
    }

    const rfqs = await b2bCommerceService.listRfqs(actor.userId, {
      role,
      sellerId: actor.sellerId || undefined,
      status: statusParam,
    });

    return NextResponse.json(
      {
        success: true,
        data: rfqs,
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(req, error);
  }
}

/**
 * POST /api/v1/b2b/rfqs
 * Submits a new RFQ by an approved business buyer organization.
 * Validates Minimum Order Quantity (MOQ).
 */
export async function POST(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    const body = await req.json();
    const validatedInput = CreateRfqSchema.parse(body);

    const rfq = await b2bCommerceService.createRfq(actor.userId, validatedInput);

    return NextResponse.json(
      {
        success: true,
        data: rfq,
      },
      { status: 201 }
    );
  } catch (error) {
    return errorResponse(req, error);
  }
}
