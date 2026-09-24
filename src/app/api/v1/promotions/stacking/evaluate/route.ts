import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '@/shared/api/error-response';
import { prisma } from '@/shared/database/prisma';
import { PromotionStackingService } from '@/services/promotion-stacking.service';
import { EvaluateStackingSchema } from '@/validators/promotion-stacking.validator';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/promotions/stacking/evaluate
 * Evaluates candidate promotions for a cart, resolving priority ordering, stacking rules, and exclusion locks.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = EvaluateStackingSchema.parse(body);

    const service = new PromotionStackingService(prisma);
    const result = await service.evaluateStackedPromotions(parsed);

    // Convert BigInts for JSON serialization
    const serializedResult = {
      totalDiscountPoisha: result.totalDiscountPoisha.toString(),
      appliedPromotions: result.appliedPromotions.map((ap) => ({
        ...ap,
        discountAmountPoisha: ap.discountAmountPoisha.toString(),
        lineAllocations: ap.lineAllocations.map((la) => ({
          ...la,
          discountPoisha: la.discountPoisha.toString(),
        })),
        attribution: {
          ...ap.attribution,
          discountAmountPoisha: ap.attribution.discountAmountPoisha.toString(),
          sellerSharePoisha: ap.attribution.sellerSharePoisha.toString(),
          platformSharePoisha: ap.attribution.platformSharePoisha.toString(),
        },
      })),
      excludedPromotions: result.excludedPromotions,
    };

    return NextResponse.json({
      success: true,
      data: serializedResult,
    });
  } catch (error) {
    return errorResponse(req, error);
  }
}
