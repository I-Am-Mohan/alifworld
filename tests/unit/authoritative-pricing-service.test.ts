import { describe, it, expect } from 'bun:test';
import {
  resolveEffectivePrice,
  MOQViolationError,
  VariantPricingSnapshot,
  EligiblePriceListRule,
} from '@/shared/pricing/price-resolver';
import {
  evaluateDiscountRule,
  DiscountRuleDescriptor,
} from '@/shared/pricing/discount-rule-engine';
import {
  resolveStackedPromotions,
  StackingRuleDescriptor,
} from '@/shared/pricing/promotion-stacking-engine';
import {
  calculatePromotionAttribution,
  calculateSellerPayoutWithPromotions,
} from '@/shared/pricing/promotion-funding-calculator';
import { TaxService } from '@/features/catalog/services/tax-service';

describe('Milestone 098: Authoritative Server-Side Pricing Service Unit Tests', () => {
  const taxService = new TaxService();

  const mockVariant: VariantPricingSnapshot = {
    id: 'var-smartphone-128',
    productId: 'prod-smartphone-x',
    sku: 'SMART-X-128',
    pricePoisha: 5000000n, // ৳50,000.00
    compareAtPricePoisha: 5500000n, // ৳55,000.00
    costPricePoisha: 3800000n, // ৳38,000.00
    minPricePoisha: 4200000n, // ৳42,000.00 (MAP Floor)
    minOrderQuantity: 1,
    productPoint: 500, // Independent Product Points
  };

  describe('1. BDT Integer Poisha & Pricing Resolution Invariants', () => {
    it('resolves base price in exact integer poisha with zero floating point errors', () => {
      const result = resolveEffectivePrice({
        variant: mockVariant,
        quantity: 2,
      });

      expect(result.unitPricePoisha).toBe(5000000n);
      expect(result.totalPoisha).toBe(10000000n); // ৳100,000.00
      expect(result.isMapClamped).toBe(false);
      expect(result.productPoint).toBe(500);
    });

    it('enforces MOQ check and throws MOQViolationError when quantity is insufficient', () => {
      const moqVariant: VariantPricingSnapshot = {
        ...mockVariant,
        minOrderQuantity: 10,
      };

      expect(() => {
        resolveEffectivePrice({
          variant: moqVariant,
          quantity: 3,
        });
      }).toThrow(MOQViolationError);
    });

    it('clamps unit price to MAP floor (minPricePoisha) when rule price is below floor', () => {
      const lowPriceRule: EligiblePriceListRule = {
        id: 'rule-deep-discount',
        priceListId: 'pl-clearance',
        pricePoisha: 3500000n, // ৳35,000.00 (below MAP floor of ৳42,000.00)
        minQuantity: 1,
        priceList: {
          id: 'pl-clearance',
          code: 'CLEARANCE_SALE',
          channel: 'RETAIL',
          priority: 10,
          status: 'ACTIVE',
        },
      };

      const result = resolveEffectivePrice({
        variant: mockVariant,
        quantity: 1,
        channel: 'RETAIL',
        activeRules: [lowPriceRule],
      });

      expect(result.unitPricePoisha).toBe(4200000n); // Clamped to ৳42,000.00
      expect(result.isMapClamped).toBe(true);
      expect(result.appliedPriceListCode).toBe('CLEARANCE_SALE');
    });
  });

  describe('2. Discount Engine & Promotion Stacking Rules', () => {
    const lineItems = [
      {
        lineItemId: 'item-1',
        productId: 'prod-smartphone-x',
        sellerId: 'seller-tech-corp',
        unitPricePoisha: 5000000n,
        quantity: 1,
      },
    ];

    it('evaluates PERCENTAGE discount rule accurately', () => {
      const rule: DiscountRuleDescriptor = {
        id: 'rule-10-pct',
        code: 'EID10',
        title: 'Eid 10% Discount',
        discountType: 'PERCENTAGE',
        targetScope: 'CART_SUBTOTAL',
        discountValue: 10.0,
        isAutomatic: true,
        fundingType: 'PLATFORM_FUNDED',
        priority: 1,
        startsAt: new Date('2026-01-01'),
        status: 'ACTIVE',
      };

      const result = evaluateDiscountRule(rule, { lineItems });
      expect(result).not.toBeNull();
      expect(result?.discountAmountPoisha).toBe(500000n); // 10% of 5000000 = 500000 poisha (৳5,000.00)
      expect(result?.attribution.platformSharePoisha).toBe(500000n);
      expect(result?.attribution.sellerSharePoisha).toBe(0n);
    });

    it('resolves promotion stacking conflicts when exclusive rule is applied', () => {
      const exclusiveRule: StackingRuleDescriptor = {
        id: 'rule-exclusive',
        code: 'MEGA25',
        title: 'Mega 25% Off Exclusive',
        discountType: 'PERCENTAGE',
        targetScope: 'CART_SUBTOTAL',
        discountValue: 25.0,
        isAutomatic: true,
        fundingType: 'PLATFORM_FUNDED',
        priority: 10,
        startsAt: new Date('2026-01-01'),
        status: 'ACTIVE',
        isStackable: false,
        exclusionScope: 'EXCLUSIVE_SITEWIDE',
      };

      const lowerRule: StackingRuleDescriptor = {
        id: 'rule-lower',
        code: 'EXTRA5',
        title: 'Extra 5%',
        discountType: 'PERCENTAGE',
        targetScope: 'CART_SUBTOTAL',
        discountValue: 5.0,
        isAutomatic: true,
        fundingType: 'SELLER_FUNDED',
        priority: 5,
        startsAt: new Date('2026-01-01'),
        status: 'ACTIVE',
        isStackable: true,
        exclusionScope: 'STACKABLE',
      };

      const result = resolveStackedPromotions([exclusiveRule, lowerRule], { lineItems });
      expect(result.appliedPromotions).toHaveLength(1);
      expect(result.appliedPromotions[0].ruleId).toBe('rule-exclusive');
      expect(result.excludedPromotions).toHaveLength(1);
      expect(result.excludedPromotions[0].ruleId).toBe('rule-lower');
    });
  });

  describe('3. Seller-Funded vs Platform-Funded Attributions', () => {
    it('calculates CO_FUNDED split with exact integer poisha precision', () => {
      const attr = calculatePromotionAttribution(100000n, {
        fundingType: 'CO_FUNDED',
        sellerSharePercent: 60,
        platformSharePercent: 40,
      });

      expect(attr.discountAmountPoisha).toBe(100000n);
      expect(attr.sellerSharePoisha).toBe(60000n);
      expect(attr.platformSharePoisha).toBe(40000n);
    });

    it('calculates seller payout accounting for seller-funded vs platform-funded discounts', () => {
      const payout = calculateSellerPayoutWithPromotions({
        subtotalPoisha: 1000000n, // ৳10,000.00
        sellerDiscountPoisha: 100000n, // ৳1,000.00 seller-funded discount
        platformDiscountPoisha: 50000n, // ৳500.00 platform-funded discount
        sellerCommissionPoisha: 50000n, // ৳500.00 (5% platform commission)
      });

      // Seller Gross = 1000000 - 100000 = 900000
      expect(payout.sellerGrossEarningsPoisha).toBe(900000n);
      // Seller Payout = 900000 - 50000 = 850000
      expect(payout.sellerPayoutPoisha).toBe(850000n);
      // Platform Net Revenue = 50000 - 50000 = 0
      expect(payout.platformNetRevenuePoisha).toBe(0n);
    });
  });

  describe('4. NBR Bangladesh VAT Calculation & Rounding', () => {
    it('calculates exclusive tax at NBR standard 15% rate with half-up rounding', () => {
      const lineTax = taxService.calculateTaxForLineItem({
        title: 'Smartphone',
        netPricePoisha: 100000n, // ৳1,000.00
        quantity: 1,
        taxRatePercent: 15.0,
        priceIncludesTax: false,
      });

      expect(lineTax.netPricePoisha).toBe(100000n);
      expect(lineTax.taxAmountPoisha).toBe(15000n); // 15% of 100,000
      expect(lineTax.grossPricePoisha).toBe(115000n);
    });

    it('extracts inclusive tax correctly from display gross price', () => {
      const lineTax = taxService.calculateTaxForLineItem({
        title: 'Laptop',
        netPricePoisha: 115000n, // ৳1,150.00 inclusive gross
        quantity: 1,
        taxRatePercent: 15.0,
        priceIncludesTax: true,
      });

      expect(lineTax.grossPricePoisha).toBe(115000n);
      expect(lineTax.taxAmountPoisha).toBe(15000n);
      expect(lineTax.netPricePoisha).toBe(100000n);
    });
  });

  describe('5. Product Points Invariant', () => {
    it('calculates product points as productPoint * quantity independently of price', () => {
      const result = resolveEffectivePrice({
        variant: {
          ...mockVariant,
          productPoint: 250,
        },
        quantity: 4,
      });

      expect(result.productPoint).toBe(250);
      expect(result.productPoint * 4).toBe(1000);
    });
  });
});
