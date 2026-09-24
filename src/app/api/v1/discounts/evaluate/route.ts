import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '@/shared/api/error-response';
import { prisma } from '@/shared/database/prisma';
import { DiscountRuleService } from '@/services/discount-rule.service';
import { EvaluateDiscountRulesSchema } from '@/validators/discount-rule.validator';

export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/discounts/evaluate
 * Evaluates all matching automatic and coupon-triggered discount rules for a shopping cart payload.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = EvaluateDiscountRulesSchema.parse(body);

    const service = new DiscountRuleService(prisma);
    const result = await service.evaluateDiscounts(parsed);

    // Convert BigInts for JSON serialization
    const serializedResult = {
      totalDiscountAmountPoisha: result.totalDiscountAmountPoisha.toString(),
      appliedDiscounts: result.appliedDiscounts.map((ad) => ({
        ...ad,
        discountAmountPoisha: ad.discountAmountPoisha.toString(),
        lineAllocations: ad.lineAllocations.map((la) => ({
          ...la,
          discountPoisha: la.discountPoisha.toString(),
        })),
        attribution: {
          ...ad.attribution,
          discountAmountPoisha: ad.attribution.discountAmountPoisha.toString(),
          sellerSharePoisha: ad.attribution.sellerSharePoisha.toString(),
          platformSharePoisha: ad.attribution.platformSharePoisha.toString(),
        },
      })),
    };

    return NextResponse.json({
      success: true,
      data: serializedResult,
    });
  } catch (error) {
    return errorResponse(req, error);
  }
}
