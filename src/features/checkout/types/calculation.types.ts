/**
 * Authoritative Server-Side Checkout Calculation Contracts & Snapshots
 *
 * Invariant: BDT monetary values strictly represented in integer minor units (poisha).
 * Invariant: Product Points are independent discrete units (zero conversion rate inferred).
 * Invariant: Tax rules comply with Bangladesh NBR Mushak-6.3 standards and effective-date boundaries.
 * Invariant: Client-side totals are strictly ignored; all calculations originate on the server.
 */

export interface CalculatedLineItemDTO {
  variantId: string;
  productId: string;
  productTitle: string;
  variantTitle: string;
  sku: string;
  sellerId: string;
  sellerName: string;
  quantity: number;
  unitPricePoisha: number;
  unitPriceBdtFormatted: string;
  grossSubtotalPoisha: number;
  grossSubtotalBdtFormatted: string;
  discountPoisha: number;
  sellerDiscountPoisha: number;
  platformDiscountPoisha: number;
  netPriceAfterDiscountPoisha: number;
  taxRatePercent: number;
  taxPoisha: number;
  taxBdtFormatted: string;
  taxRuleId?: string | null;
  taxType: string; // 'VAT'
  priceIncludesTax: boolean;
  productPointSnapshot: number; // discrete integer points per unit
  totalProductPoints: number; // productPointSnapshot * quantity
  lineTotalPoisha: number;
  lineTotalBdtFormatted: string;
}

export interface CalculatedSellerGroupDTO {
  sellerId: string;
  sellerName: string;
  sellerSlug?: string | null;
  groupNumber: string;
  subtotalPoisha: number;
  subtotalBdtFormatted: string;
  discountPoisha: number;
  sellerDiscountPoisha: number;
  platformDiscountPoisha: number;
  discountBdtFormatted: string;
  shippingFeePoisha: number;
  shippingFeeBdtFormatted: string;
  isFreeShipping: boolean;
  courierProvider: string;
  taxPoisha: number;
  taxBdtFormatted: string;
  totalPoisha: number;
  totalBdtFormatted: string;
  sellerCommissionPoisha: number;
  sellerCommissionBdtFormatted: string;
  sellerPayoutPoisha: number;
  sellerPayoutBdtFormatted: string;
  totalProductPoints: number;
  items: CalculatedLineItemDTO[];
}

export interface AppliedCouponDetailDTO {
  couponCode: string;
  discountAmountPoisha: number;
  discountAmountBdtFormatted: string;
  discountRuleId?: string | null;
  promotionId?: string | null;
  sellerId?: string | null;
  sellerSharePercent: number;
  platformSharePercent: number;
  sellerDiscountPoisha: number;
  platformDiscountPoisha: number;
  ruleVersion: string;
}

export interface TaxJurisdictionSummaryDTO {
  jurisdiction: 'BD';
  standardRatePercent: number;
  taxableAmountPoisha: number;
  taxableAmountBdtFormatted: string;
  taxAmountPoisha: number;
  taxAmountBdtFormatted: string;
  mushakStandard: 'Mushak-6.3';
  rateBreakdown: Array<{
    ratePercent: number;
    taxablePoisha: number;
    taxPoisha: number;
    description: string;
  }>;
}

export interface ServerCheckoutCalculationResultDTO {
  currency: 'BDT';
  subtotalPoisha: number;
  subtotalBdtFormatted: string;
  discountPoisha: number;
  sellerDiscountPoisha: number;
  platformDiscountPoisha: number;
  discountBdtFormatted: string;
  coupon: AppliedCouponDetailDTO | null;
  shippingFeePoisha: number;
  shippingFeeBdtFormatted: string;
  taxPoisha: number;
  taxBdtFormatted: string;
  taxSummary: TaxJurisdictionSummaryDTO;
  totalPoisha: number;
  totalBdtFormatted: string;
  totalProductPoints: number;
  sellerGroups: CalculatedSellerGroupDTO[];
  appliedRuleVersion: string;
  calculatedAt: string;
  warnings: string[];
}
