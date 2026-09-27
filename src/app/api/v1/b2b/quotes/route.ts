import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse } from '@/shared/api/error-response';
import { ValidationError, AuthorizationError } from '@/shared/errors/app-error';
import { b2bCommerceService } from '@/features/customers/services/b2b-commerce.service';
import { CreateQuoteSchema } from '@/features/customers/validators/b2b.validators';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/b2b/quotes
 * Lists quotes for the caller (as Buyer or Seller).
 */
export async function GET(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    const { searchParams } = new URL(req.url);
    const rfqId = searchParams.get('rfqId') || undefined;

    const role: 'BUYER' | 'SELLER' = actor.sellerId ? 'SELLER' : 'BUYER';

    const quotes = await b2bCommerceService.listQuotes(actor.userId, {
      role,
      sellerId: actor.sellerId || undefined,
      rfqId,
    });

    return NextResponse.json(
      {
        success: true,
        data: quotes,
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(req, error);
  }
}

/**
 * POST /api/v1/b2b/quotes
 * Seller creates a quote responding to an RFQ.
 */
export async function POST(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    if (!actor.sellerId) {
      throw new AuthorizationError('Only registered sellers can create B2B quotes.');
    }

    const { searchParams } = new URL(req.url);
    const rfqId = searchParams.get('rfqId');
    if (!rfqId) {
      throw new ValidationError('Query parameter `rfqId` is required to create a quote.');
    }

    const body = await req.json();
    const validatedInput = CreateQuoteSchema.parse(body);

    const quote = await b2bCommerceService.createQuote(
      actor.userId,
      actor.sellerId,
      rfqId,
      validatedInput
    );

    return NextResponse.json(
      {
        success: true,
        data: quote,
      },
      { status: 201 }
    );
  } catch (error) {
    return errorResponse(req, error);
  }
}
