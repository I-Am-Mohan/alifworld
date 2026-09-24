import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { errorResponse } from '@/shared/api/error-response';
import { prisma } from '@/shared/database/prisma';
import { PromotionAttributionService } from '@/services/promotion-attribution.service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/seller/promotions/attributions/summary
 * Authenticated seller retrieves promotion attribution summary (total seller-funded vs platform-funded discount).
 */
export async function GET(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    const searchParams = req.nextUrl.searchParams;
    const targetSellerId = searchParams.get('sellerId') || undefined;

    const service = new PromotionAttributionService(prisma);

    const summary = await service.getAttributionSummary(actor, targetSellerId);

    // Convert BigInts for JSON serialization
    const serializedSummary = {
      ...summary,
      totalDiscountPoisha: summary.totalDiscountPoisha.toString(),
      totalSellerSharePoisha: summary.totalSellerSharePoisha.toString(),
      totalPlatformSharePoisha: summary.totalPlatformSharePoisha.toString(),
      fundingBreakdown: summary.fundingBreakdown.map((fb) => ({
        ...fb,
        discountAmountPoisha: fb.discountAmountPoisha.toString(),
        sellerSharePoisha: fb.sellerSharePoisha.toString(),
        platformSharePoisha: fb.platformSharePoisha.toString(),
      })),
    };

    return NextResponse.json({
      success: true,
      data: serializedSummary,
    });
  } catch (error) {
    return errorResponse(req, error);
  }
}
