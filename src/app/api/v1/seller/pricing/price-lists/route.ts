import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse } from '@/shared/api/error-response';
import { prisma } from '@/shared/database/prisma';
import { PricingService } from '@/services/pricing.service';
import { CreatePriceListSchema } from '@/validators/pricing.validator';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/seller/pricing/price-lists
 * Authenticated seller lists their price lists.
 */
export async function GET(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    const searchParams = req.nextUrl.searchParams;

    const channel = searchParams.get('channel') || undefined;
    const buyerSegment = searchParams.get('buyerSegment') || undefined;
    const status = searchParams.get('status') || undefined;
    const page = Number(searchParams.get('page') || '1');
    const limit = Number(searchParams.get('limit') || '20');

    const service = new PricingService(prisma);
    const result = await service.listPriceLists(actor, { channel, buyerSegment, status, page, limit });

    return NextResponse.json({
      success: true,
      data: result.items,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    return errorResponse(req, error);
  }
}

/**
 * POST /api/v1/seller/pricing/price-lists
 * Authenticated seller creates a channel or tier price list for their store.
 */
export async function POST(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    const body = await req.json();

    // Ensure seller creates for their own store
    const parsed = CreatePriceListSchema.parse({
      ...body,
      sellerId: actor.sellerId || body.sellerId,
    });

    const service = new PricingService(prisma);
    const priceList = await service.createPriceList(actor, parsed);

    return NextResponse.json({ success: true, data: priceList }, { status: 201 });
  } catch (error) {
    return errorResponse(req, error);
  }
}
