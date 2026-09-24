import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '@/shared/api/error-response';
import { prisma } from '@/shared/database/prisma';
import { PromotionAttributionService } from '@/services/promotion-attribution.service';
import { EvaluatePromotionSchema } from '@/validators/promotion.validator';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/promotions/evaluate
 * Public / checkout evaluation endpoint to validate coupon eligibility & return promotion attribution breakdown.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = EvaluatePromotionSchema.parse(body);

    const service = new PromotionAttributionService(prisma);

    const result = await service.evaluateCoupon(parsed);

    return NextResponse.json({
      success: true,
      data: {
        promotionId: result.promotionId,
        code: result.code,
        discountAmountPoisha: result.discountAmountPoisha.toString(),
        attribution: {
          ...result.attribution,
          discountAmountPoisha: result.attribution.discountAmountPoisha.toString(),
          sellerSharePoisha: result.attribution.sellerSharePoisha.toString(),
          platformSharePoisha: result.attribution.platformSharePoisha.toString(),
        },
      },
    });
  } catch (error) {
    return errorResponse(req, error);
  }
}
