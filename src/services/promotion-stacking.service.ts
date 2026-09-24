import { PrismaClient } from '@prisma/client';
import { DiscountRuleRepository } from '../repositories/discount-rule.repository';
import { PromotionAttributionRepository } from '../repositories/promotion-attribution.repository';
import { EvaluateStackingInput } from '../validators/promotion-stacking.validator';
import {
  resolveStackedPromotions,
  StackedPromotionsResult,
  StackingRuleDescriptor,
} from '../shared/pricing/promotion-stacking-engine';

export class PromotionStackingService {
  private readonly discountRuleRepo: DiscountRuleRepository;
  private readonly promotionRepo: PromotionAttributionRepository;

  constructor(private readonly prisma: PrismaClient) {
    this.discountRuleRepo = new DiscountRuleRepository(prisma);
    this.promotionRepo = new PromotionAttributionRepository(prisma);
  }

  async evaluateStackedPromotions(input: EvaluateStackingInput): Promise<StackedPromotionsResult> {
    const now = new Date();

    // 1. Fetch active automatic discount rules
    const automaticDiscountRules = await this.discountRuleRepo.getActiveAutomaticRules(now);
    const candidateRules: StackingRuleDescriptor[] = automaticDiscountRules.map((rule) => ({
      id: rule.id,
      code: rule.code,
      title: rule.title,
      discountType: rule.discountType,
      targetScope: rule.targetScope,
      discountValue: rule.discountValue,
      maxDiscountPoisha: rule.maxDiscountPoisha,
      minOrderSubtotalPoisha: rule.minOrderSubtotalPoisha,
      minQuantity: rule.minQuantity,
      buyQuantity: rule.buyQuantity,
      getQuantity: rule.getQuantity,
      getDiscountPercent: rule.getDiscountPercent,
      isAutomatic: rule.isAutomatic,
      isStackable: rule.isStackable,
      exclusionScope: rule.exclusionScope,
      fundingType: rule.fundingType,
      sellerSharePercent: rule.sellerSharePercent,
      platformSharePercent: rule.platformSharePercent,
      sellerId: rule.sellerId,
      buyerSegment: rule.buyerSegment,
      priority: rule.priority,
      startsAt: rule.startsAt,
      endsAt: rule.endsAt,
      usageLimit: rule.usageLimit,
      usageCount: rule.usageCount,
      status: rule.status,
      deletedAt: rule.deletedAt,
      targets: (rule.targets || []).map((t) => ({ targetType: t.targetType, targetId: t.targetId })),
    }));

    // 2. Fetch coupon rules if specified
    if (input.couponCodes && input.couponCodes.length > 0) {
      for (const code of input.couponCodes) {
        const codeUpper = code.toUpperCase();
        const couponRule = await this.discountRuleRepo.getDiscountRuleByCode(codeUpper);
        if (couponRule && couponRule.status === 'ACTIVE' && !couponRule.deletedAt) {
          candidateRules.push({
            id: couponRule.id,
            code: couponRule.code,
            title: couponRule.title,
            discountType: couponRule.discountType,
            targetScope: couponRule.targetScope,
            discountValue: couponRule.discountValue,
            maxDiscountPoisha: couponRule.maxDiscountPoisha,
            minOrderSubtotalPoisha: couponRule.minOrderSubtotalPoisha,
            minQuantity: couponRule.minQuantity,
            buyQuantity: couponRule.buyQuantity,
            getQuantity: couponRule.getQuantity,
            getDiscountPercent: couponRule.getDiscountPercent,
            isAutomatic: couponRule.isAutomatic,
            isStackable: couponRule.isStackable,
            exclusionScope: couponRule.exclusionScope,
            fundingType: couponRule.fundingType,
            sellerSharePercent: couponRule.sellerSharePercent,
            platformSharePercent: couponRule.platformSharePercent,
            sellerId: couponRule.sellerId,
            buyerSegment: couponRule.buyerSegment,
            priority: couponRule.priority,
            startsAt: couponRule.startsAt,
            endsAt: couponRule.endsAt,
            usageLimit: couponRule.usageLimit,
            usageCount: couponRule.usageCount,
            status: couponRule.status,
            deletedAt: couponRule.deletedAt,
            targets: (couponRule.targets || []).map((t) => ({ targetType: t.targetType, targetId: t.targetId })),
          });
        }
      }
    }

    // 3. Resolve stacking and exclusion rules
    return resolveStackedPromotions(candidateRules, {
      lineItems: input.lineItems,
      shippingFeePoisha: input.shippingFeePoisha,
      buyerSegment: input.buyerSegment,
      now,
    });
  }
}
