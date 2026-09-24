import { describe, it, expect } from 'bun:test';
import {
  resolveEffectivePrice,
  MOQViolationError,
  VariantPricingSnapshot,
  EligiblePriceListRule,
} from '@/shared/pricing/price-resolver';

describe('Milestone 092: Compare-at, Cost, Minimum, and Channel Pricing', () => {
  const baseVariant: VariantPricingSnapshot = {
    id: 'var-1001',
    productId: 'prod-5001',
    sku: 'SKU-SHIRT-M',
    pricePoisha: 10000n, // ৳100.00
    compareAtPricePoisha: 12000n, // ৳120.00 (MSRP)
    costPricePoisha: 6000n, // ৳60.00 (COGS)
    minPricePoisha: 7500n, // ৳75.00 (MAP Floor)
    minOrderQuantity: 1,
    productPoint: 10,
  };

  describe('Base Variant Pricing & MOQ', () => {
    it('resolves base variant price when no price list rules exist', () => {
      const result = resolveEffectivePrice({
        variant: baseVariant,
        quantity: 1,
      });

      expect(result.unitPricePoisha).toBe(10000n);
      expect(result.totalPoisha).toBe(10000n);
      expect(result.compareAtPricePoisha).toBe(12000n);
      expect(result.costPricePoisha).toBe(6000n);
      expect(result.minPricePoisha).toBe(7500n);
      expect(result.appliedPriceListId).toBeNull();
      expect(result.isMapClamped).toBe(false);
      expect(result.productPoint).toBe(10);
    });

    it('enforces Minimum Order Quantity (MOQ) and throws MOQViolationError', () => {
      const moqVariant: VariantPricingSnapshot = {
        ...baseVariant,
        minOrderQuantity: 5,
      };

      expect(() => {
        resolveEffectivePrice({
          variant: moqVariant,
          quantity: 2,
        });
      }).toThrow(MOQViolationError);

      try {
        resolveEffectivePrice({ variant: moqVariant, quantity: 2 });
      } catch (err: any) {
        expect(err.minOrderQuantity).toBe(5);
        expect(err.requestedQuantity).toBe(2);
      }
    });

    it('allows resolution when requested quantity meets or exceeds MOQ', () => {
      const moqVariant: VariantPricingSnapshot = {
        ...baseVariant,
        minOrderQuantity: 5,
      };

      const result = resolveEffectivePrice({
        variant: moqVariant,
        quantity: 5,
      });

      expect(result.unitPricePoisha).toBe(10000n);
      expect(result.totalPoisha).toBe(50000n);
    });
  });

  describe('Volume Tier & Quantity Break Pricing', () => {
    const tierRules: EligiblePriceListRule[] = [
      {
        id: 'rule-tier-1',
        priceListId: 'pl-b2b-tier',
        pricePoisha: 9000n, // ৳90 for 10-49 units
        minQuantity: 10,
        maxQuantity: 49,
        priceList: {
          id: 'pl-b2b-tier',
          code: 'WHOLESALE_TIERS',
          channel: 'B2B',
          priority: 10,
          status: 'ACTIVE',
        },
      },
      {
        id: 'rule-tier-2',
        priceListId: 'pl-b2b-tier',
        pricePoisha: 8000n, // ৳80 for 50+ units
        minQuantity: 50,
        maxQuantity: null,
        priceList: {
          id: 'pl-b2b-tier',
          code: 'WHOLESALE_TIERS',
          channel: 'B2B',
          priority: 10,
          status: 'ACTIVE',
        },
      },
    ];

    it('applies tier 1 price (৳90) when ordering 20 units in B2B channel', () => {
      const result = resolveEffectivePrice({
        variant: baseVariant,
        quantity: 20,
        channel: 'B2B',
        activeRules: tierRules,
      });

      expect(result.unitPricePoisha).toBe(9000n);
      expect(result.totalPoisha).toBe(180000n); // 20 * 9000
      expect(result.appliedPriceListCode).toBe('WHOLESALE_TIERS');
    });

    it('applies tier 2 price (৳80) when ordering 100 units in B2B channel', () => {
      const result = resolveEffectivePrice({
        variant: baseVariant,
        quantity: 100,
        channel: 'B2B',
        activeRules: tierRules,
      });

      expect(result.unitPricePoisha).toBe(8000n);
      expect(result.totalPoisha).toBe(800000n); // 100 * 8000
      expect(result.appliedPriceListCode).toBe('WHOLESALE_TIERS');
    });

    it('falls back to base price when quantity is below tier 1 (e.g. 5 units)', () => {
      const result = resolveEffectivePrice({
        variant: baseVariant,
        quantity: 5,
        channel: 'B2B',
        activeRules: tierRules,
      });

      expect(result.unitPricePoisha).toBe(10000n);
      expect(result.appliedPriceListId).toBeNull();
    });
  });

  describe('MAP Floor Protection (Minimum Advertised Price)', () => {
    it('clamps unit price to minPricePoisha when discount rule falls below MAP floor', () => {
      // Base variant has minPricePoisha = 7500n (৳75.00)
      // A campaign rule tries to set price to ৳50.00 (5000n)
      const lowCampaignRule: EligiblePriceListRule[] = [
        {
          id: 'rule-flash',
          priceListId: 'pl-flash',
          pricePoisha: 5000n, // Below 7500 MAP!
          minQuantity: 1,
          priceList: {
            id: 'pl-flash',
            code: 'FLASH_SALE',
            channel: 'CAMPAIGN',
            priority: 100,
            status: 'ACTIVE',
          },
        },
      ];

      const result = resolveEffectivePrice({
        variant: baseVariant,
        quantity: 1,
        channel: 'CAMPAIGN',
        activeRules: lowCampaignRule,
      });

      // Price is clamped to MAP floor (7500 poisha)
      expect(result.unitPricePoisha).toBe(7500n);
      expect(result.isMapClamped).toBe(true);
    });
  });

  describe('Channel & Buyer Segment Priority Resolution', () => {
    const multiChannelRules: EligiblePriceListRule[] = [
      {
        id: 'rule-retail',
        priceListId: 'pl-retail',
        pricePoisha: 9500n, // ৳95
        minQuantity: 1,
        priceList: {
          id: 'pl-retail',
          code: 'RETAIL_SALE',
          channel: 'RETAIL',
          priority: 5,
          status: 'ACTIVE',
        },
      },
      {
        id: 'rule-vip',
        priceListId: 'pl-vip',
        pricePoisha: 8500n, // ৳85 for VIP segment
        minQuantity: 1,
        priceList: {
          id: 'pl-vip',
          code: 'VIP_CLUB',
          channel: 'RETAIL',
          buyerSegment: 'VIP',
          priority: 20, // Higher priority!
          status: 'ACTIVE',
        },
      },
    ];

    it('resolves VIP price list when buyer belongs to VIP segment', () => {
      const result = resolveEffectivePrice({
        variant: baseVariant,
        quantity: 1,
        channel: 'RETAIL',
        buyerSegment: 'VIP',
        activeRules: multiChannelRules,
      });

      expect(result.unitPricePoisha).toBe(8500n);
      expect(result.appliedPriceListCode).toBe('VIP_CLUB');
    });

    it('ignores VIP price list for standard public buyers', () => {
      const result = resolveEffectivePrice({
        variant: baseVariant,
        quantity: 1,
        channel: 'RETAIL',
        buyerSegment: 'PUBLIC',
        activeRules: multiChannelRules,
      });

      expect(result.unitPricePoisha).toBe(9500n);
      expect(result.appliedPriceListCode).toBe('RETAIL_SALE');
    });
  });
});
