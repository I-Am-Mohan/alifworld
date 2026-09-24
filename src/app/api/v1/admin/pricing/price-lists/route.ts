import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse } from '@/shared/api/error-response';
import { prisma } from '@/shared/database/prisma';
import { PricingService } from '@/services/pricing.service';
import { CreatePriceListSchema } from '@/validators/pricing.validator';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/admin/pricing/price-lists
 * Admin lists sitewide and channel price lists.
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
 * POST /api/v1/admin/pricing/price-lists
 * Admin creates a new price list.
 */
export async function POST(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    const body = await req.json();

    const parsed = CreatePriceListSchema.parse(body);

    const service = new PricingService(prisma);
    const priceList = await service.createPriceList(actor, parsed);

    return NextResponse.json({ success: true, data: priceList }, { status: 201 });
  } catch (error) {
    return errorResponse(req, error);
  }
}
