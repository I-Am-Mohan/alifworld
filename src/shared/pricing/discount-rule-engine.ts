import { Prisma } from '@prisma/client';
import {
  calculatePromotionAttribution,
  PromotionAttributionResult,
} from './promotion-funding-calculator';

export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT' | 'BUY_X_GET_Y' | 'FREE_SHIPPING';
export type TargetScope = 'CART_SUBTOTAL' | 'SPECIFIC_PRODUCTS' | 'SPECIFIC_CATEGORIES' | 'SPECIFIC_BRANDS' | 'SHIPPING_FEE';

export interface DiscountRuleTargetDescriptor {
  targetType: 'PRODUCT' | 'CATEGORY' | 'BRAND' | string;
  targetId: string;
}

export interface DiscountRuleDescriptor {
  id: string;
  code?: string | null;
  title: string;
  discountType: DiscountType | string;
  targetScope: TargetScope | string;
  discountValue: number | Prisma.Decimal;
  maxDiscountPoisha?: bigint | null;
  minOrderSubtotalPoisha?: bigint | null;
  minQuantity?: number;
  buyQuantity?: number | null;
  getQuantity?: number | null;
  getDiscountPercent?: number | Prisma.Decimal | null;
  isAutomatic: boolean;
  fundingType: 'PLATFORM_FUNDED' | 'SELLER_FUNDED' | 'CO_FUNDED' | string;
  sellerSharePercent?: number | Prisma.Decimal;
  platformSharePercent?: number | Prisma.Decimal;
  sellerId?: string | null;
  buyerSegment?: string | null;
  priority: number;
  startsAt: Date;
  endsAt?: Date | null;
  usageLimit?: number | null;
  usageCount?: number;
  status: string;
  deletedAt?: Date | null;
  targets?: DiscountRuleTargetDescriptor[];
}

export interface CartLineItemInput {
  lineItemId: string;
  productId: string;
  variantId?: string;
  categoryId?: string | null;
  brandId?: string | null;
  sellerId: string;
  unitPricePoisha: bigint;
  quantity: number;
}

export interface EvaluateDiscountRulesInput {
  lineItems: CartLineItemInput[];
  shippingFeePoisha?: bigint;
  buyerSegment?: string | null;
  couponCode?: string | null;
  now?: Date;
}

export interface LineItemDiscountAllocation {
  lineItemId: string;
  discountPoisha: bigint;
}

export interface DiscountEvaluationResult {
  ruleId: string;
  code: string | null;
  title: string;
  discountType: string;
  targetScope: string;
  discountAmountPoisha: bigint;
  lineAllocations: LineItemDiscountAllocation[];
  attribution: PromotionAttributionResult;
}

/**
 * Pure, deterministic discount evaluation engine.
 */
export function evaluateDiscountRule(
  rule: DiscountRuleDescriptor,
  input: EvaluateDiscountRulesInput
): DiscountEvaluationResult | null {
  const { lineItems, shippingFeePoisha = 0n, buyerSegment = null, now = new Date() } = input;

  // 1. Status and Date Range Check
  if (rule.status !== 'ACTIVE' || rule.deletedAt) {
    return null;
  }
  if (now < new Date(rule.startsAt)) {
    return null;
  }
  if (rule.endsAt && now > new Date(rule.endsAt)) {
    return null;
  }

  // 2. Seller Isolation Check (If seller-scoped rule, filter items matching sellerId)
  let eligibleItems = lineItems;
  if (rule.sellerId) {
    eligibleItems = lineItems.filter((item) => item.sellerId === rule.sellerId);
  }

  if (eligibleItems.length === 0 && rule.targetScope !== 'SHIPPING_FEE') {
    return null;
  }

  // 3. Buyer Segment Check
  if (rule.buyerSegment && rule.buyerSegment !== buyerSegment) {
    return null;
  }

  // 4. Target Scope Filtering
  if (rule.targetScope === 'SPECIFIC_PRODUCTS' || rule.targetScope === 'SPECIFIC_CATEGORIES' || rule.targetScope === 'SPECIFIC_BRANDS') {
    const targetIds = new Set((rule.targets || []).map((t) => t.targetId));
    if (targetIds.size > 0) {
      eligibleItems = eligibleItems.filter((item) => {
        if (rule.targetScope === 'SPECIFIC_PRODUCTS') return targetIds.has(item.productId);
        if (rule.targetScope === 'SPECIFIC_CATEGORIES') return item.categoryId ? targetIds.has(item.categoryId) : false;
        if (rule.targetScope === 'SPECIFIC_BRANDS') return item.brandId ? targetIds.has(item.brandId) : false;
        return false;
      });
    }
  }

  if (eligibleItems.length === 0 && rule.targetScope !== 'SHIPPING_FEE') {
    return null;
  }

  // 5. Total Quantity and Subtotal Validation
  const eligibleSubtotalPoisha = eligibleItems.reduce(
    (sum, item) => sum + item.unitPricePoisha * BigInt(item.quantity),
    0n
  );
  const eligibleQuantity = eligibleItems.reduce((sum, item) => sum + item.quantity, 0);

  const minSubtotal = rule.minOrderSubtotalPoisha ?? 0n;
  if (eligibleSubtotalPoisha < minSubtotal) {
    return null;
  }

  const minQty = rule.minQuantity ?? 1;
  if (eligibleQuantity < minQty) {
    return null;
  }

  // 6. Calculate Raw Discount Amount
  let rawDiscountPoisha = 0n;
  const lineAllocations: LineItemDiscountAllocation[] = [];

  const type = rule.discountType;

  if (type === 'FREE_SHIPPING' || rule.targetScope === 'SHIPPING_FEE') {
    rawDiscountPoisha = shippingFeePoisha;
  } else if (type === 'PERCENTAGE') {
    const pct = Number(rule.discountValue);
    const pctScaled = BigInt(Math.round(pct * 100)); // e.g. 15.00% -> 1500
    rawDiscountPoisha = (eligibleSubtotalPoisha * pctScaled) / 10000n;

    // Allocate line item discounts proportionally
    let allocatedSum = 0n;
    eligibleItems.forEach((item, index) => {
      const itemSubtotal = item.unitPricePoisha * BigInt(item.quantity);
      let lineDiscount = (itemSubtotal * pctScaled) / 10000n;
      if (index === eligibleItems.length - 1) {
        // Last line absorbs rounding difference to ensure exact sum match
        lineDiscount = rawDiscountPoisha - allocatedSum;
      }
      allocatedSum += lineDiscount;
      lineAllocations.push({ lineItemId: item.lineItemId, discountPoisha: lineDiscount });
    });
  } else if (type === 'FIXED_AMOUNT') {
    const fixedVal = Number(rule.discountValue);
    rawDiscountPoisha = BigInt(Math.round(fixedVal * 100)); // BDT to poisha
    if (rawDiscountPoisha > eligibleSubtotalPoisha) {
      rawDiscountPoisha = eligibleSubtotalPoisha;
    }

    // Allocate fixed discount proportionally across eligible line items
    let allocatedSum = 0n;
    eligibleItems.forEach((item, index) => {
      const itemSubtotal = item.unitPricePoisha * BigInt(item.quantity);
      let lineDiscount = (rawDiscountPoisha * itemSubtotal) / eligibleSubtotalPoisha;
      if (index === eligibleItems.length - 1) {
        lineDiscount = rawDiscountPoisha - allocatedSum;
      }
      allocatedSum += lineDiscount;
      lineAllocations.push({ lineItemId: item.lineItemId, discountPoisha: lineDiscount });
    });
  } else if (type === 'BUY_X_GET_Y') {
    const buyQty = rule.buyQuantity || 1;
    const getQty = rule.getQuantity || 1;
    const getPct = Number(rule.getDiscountPercent ?? 100);
    const setSize = buyQty + getQty;

    if (eligibleQuantity >= setSize) {
      const setsCount = Math.floor(eligibleQuantity / setSize);
      const discountedUnitsCount = setsCount * getQty;

      // Find unit price of eligible items (sort items by price ascending to discount cheaper items)
      const sortedItems = [...eligibleItems].sort((a, b) => Number(a.unitPricePoisha - b.unitPricePoisha));
      let remainingDiscountedUnits = discountedUnitsCount;

      for (const item of sortedItems) {
        if (remainingDiscountedUnits <= 0) break;
        const unitsToDiscount = Math.min(item.quantity, remainingDiscountedUnits);
        const itemDiscountPctScaled = BigInt(Math.round(getPct * 100));
        const itemLineDiscount = (item.unitPricePoisha * BigInt(unitsToDiscount) * itemDiscountPctScaled) / 10000n;

        rawDiscountPoisha += itemLineDiscount;
        remainingDiscountedUnits -= unitsToDiscount;
        lineAllocations.push({ lineItemId: item.lineItemId, discountPoisha: itemLineDiscount });
      }
    }
  }

  // 7. Max Discount Cap
  let finalDiscountPoisha = rawDiscountPoisha;
  if (rule.maxDiscountPoisha !== null && rule.maxDiscountPoisha !== undefined && finalDiscountPoisha > rule.maxDiscountPoisha) {
    finalDiscountPoisha = rule.maxDiscountPoisha;
  }

  if (finalDiscountPoisha <= 0n) {
    return null;
  }

  // 8. Calculate Seller vs Platform Attribution
  const attribution = calculatePromotionAttribution(finalDiscountPoisha, {
    fundingType: rule.fundingType as any,
    sellerSharePercent: rule.sellerSharePercent,
    platformSharePercent: rule.platformSharePercent,
  });

  return {
    ruleId: rule.id,
    code: rule.code || null,
    title: rule.title,
    discountType: rule.discountType,
    targetScope: rule.targetScope,
    discountAmountPoisha: finalDiscountPoisha,
    lineAllocations,
    attribution,
  };
}
