import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse } from '@/shared/api/error-response';
import { prisma } from '@/shared/database/prisma';
import { PromotionAttributionService } from '@/services/promotion-attribution.service';
import { AttributionQuerySchema } from '@/validators/promotion.validator';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/admin/promotions/attributions
 * Admin retrieves sitewide promotion attributions across all sellers or filtered by sellerId.
 */
export async function GET(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    const searchParams = req.nextUrl.searchParams;

    const queryInput = AttributionQuerySchema.parse({
      sellerId: searchParams.get('sellerId') || undefined,
      orderId: searchParams.get('orderId') || undefined,
      couponCode: searchParams.get('couponCode') || undefined,
      fundingType: searchParams.get('fundingType') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
    });

    const service = new PromotionAttributionService(prisma);

    const result = await service.listAttributions(actor, queryInput);

    const serializedItems = result.items.map((item) => ({
      ...item,
      discountAmountPoisha: item.discountAmountPoisha.toString(),
      sellerSharePoisha: item.sellerSharePoisha.toString(),
      platformSharePoisha: item.platformSharePoisha.toString(),
    }));

    return NextResponse.json({
      success: true,
      data: serializedItems,
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
