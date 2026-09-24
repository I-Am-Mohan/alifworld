import { Prisma } from '@prisma/client';

export type PromotionFundingType = 'PLATFORM_FUNDED' | 'SELLER_FUNDED' | 'CO_FUNDED';

export interface PromotionFundingRule {
  fundingType: PromotionFundingType;
  sellerSharePercent?: number | Prisma.Decimal;
  platformSharePercent?: number | Prisma.Decimal;
}

export interface PromotionAttributionResult {
  discountAmountPoisha: bigint;
  sellerSharePoisha: bigint;
  platformSharePoisha: bigint;
  sellerSharePercent: number;
  platformSharePercent: number;
  fundingType: PromotionFundingType;
}

export interface SellerPayoutCalculationInput {
  subtotalPoisha: bigint;
  sellerDiscountPoisha: bigint;
  platformDiscountPoisha: bigint;
  sellerCommissionPoisha: bigint;
}

export interface SellerPayoutCalculationResult {
  subtotalPoisha: bigint;
  sellerDiscountPoisha: bigint;
  platformDiscountPoisha: bigint;
  sellerGrossEarningsPoisha: bigint;
  sellerCommissionPoisha: bigint;
  sellerPayoutPoisha: bigint;
  platformNetRevenuePoisha: bigint;
}

/**
 * Calculates strict integer poisha attribution split between seller and platform for a promotion discount.
 * Ensures sellerSharePoisha + platformSharePoisha === discountAmountPoisha with zero floating point errors.
 */
export function calculatePromotionAttribution(
  discountAmountPoisha: bigint,
  rule: PromotionFundingRule
): PromotionAttributionResult {
  if (discountAmountPoisha < 0n) {
    throw new Error('Discount amount in poisha cannot be negative');
  }

  if (discountAmountPoisha === 0n) {
    return {
      discountAmountPoisha: 0n,
      sellerSharePoisha: 0n,
      platformSharePoisha: 0n,
      sellerSharePercent: 0,
      platformSharePercent: 100,
      fundingType: rule.fundingType,
    };
  }

  const { fundingType } = rule;

  if (fundingType === 'PLATFORM_FUNDED') {
    return {
      discountAmountPoisha,
      sellerSharePoisha: 0n,
      platformSharePoisha: discountAmountPoisha,
      sellerSharePercent: 0,
      platformSharePercent: 100,
      fundingType,
    };
  }

  if (fundingType === 'SELLER_FUNDED') {
    return {
      discountAmountPoisha,
      sellerSharePoisha: discountAmountPoisha,
      platformSharePoisha: 0n,
      sellerSharePercent: 100,
      platformSharePercent: 0,
      fundingType,
    };
  }

  if (fundingType === 'CO_FUNDED') {
    const sPct = Number(rule.sellerSharePercent ?? 50);
    if (sPct < 0 || sPct > 100) {
      throw new Error('Seller share percentage must be between 0 and 100');
    }
    const pPct = 100 - sPct;

    // Use integer math: (discount * sPct) / 100
    // Multiply by BigInt factor (sPct * 100) to keep precision
    const sPctScaled = BigInt(Math.round(sPct * 100)); // e.g. 50.00% -> 5000
    const sellerSharePoisha = (discountAmountPoisha * sPctScaled) / 10000n;
    const platformSharePoisha = discountAmountPoisha - sellerSharePoisha;

    return {
      discountAmountPoisha,
      sellerSharePoisha,
      platformSharePoisha,
      sellerSharePercent: Number(sPct.toFixed(2)),
      platformSharePercent: Number(pPct.toFixed(2)),
      fundingType,
    };
  }

  throw new Error(`Invalid promotion funding type: ${fundingType}`);
}

/**
 * Calculates seller net payout and platform net revenue considering seller-funded vs platform-funded promotion attributions.
 *
 * Rules:
 * 1. Subtotal = Gross item prices.
 * 2. Seller Gross Earnings = Subtotal - sellerDiscountPoisha. (Platform-funded discounts do NOT reduce seller gross).
 * 3. Seller Payout = Subtotal - sellerDiscountPoisha - sellerCommissionPoisha.
 * 4. Platform Net Revenue = sellerCommissionPoisha - platformDiscountPoisha.
 */
export function calculateSellerPayoutWithPromotions(
  input: SellerPayoutCalculationInput
): SellerPayoutCalculationResult {
  const { subtotalPoisha, sellerDiscountPoisha, platformDiscountPoisha, sellerCommissionPoisha } = input;

  if (subtotalPoisha < 0n || sellerDiscountPoisha < 0n || platformDiscountPoisha < 0n || sellerCommissionPoisha < 0n) {
    throw new Error('Monetary amounts in poisha cannot be negative');
  }

  const sellerGrossEarningsPoisha = subtotalPoisha - sellerDiscountPoisha;
  const sellerPayoutPoisha = sellerGrossEarningsPoisha - sellerCommissionPoisha;
  const platformNetRevenuePoisha = sellerCommissionPoisha - platformDiscountPoisha;

  return {
    subtotalPoisha,
    sellerDiscountPoisha,
    platformDiscountPoisha,
    sellerGrossEarningsPoisha,
    sellerCommissionPoisha,
    sellerPayoutPoisha,
    platformNetRevenuePoisha,
  };
}
