import { describe, it, expect } from 'bun:test';
import {
  calculatePromotionAttribution,
  calculateSellerPayoutWithPromotions,
} from '@/shared/pricing/promotion-funding-calculator';

describe('Milestone 096: Promotion Funding Attribution Calculations', () => {
  describe('calculatePromotionAttribution', () => {
    it('handles PLATFORM_FUNDED promotions (100% platform share)', () => {
      const discountPoisha = 5000n; // ৳50.00
      const result = calculatePromotionAttribution(discountPoisha, {
        fundingType: 'PLATFORM_FUNDED',
      });

      expect(result.discountAmountPoisha).toBe(5000n);
      expect(result.sellerSharePoisha).toBe(0n);
      expect(result.platformSharePoisha).toBe(5000n);
      expect(result.sellerSharePercent).toBe(0);
      expect(result.platformSharePercent).toBe(100);
      expect(result.sellerSharePoisha + result.platformSharePoisha).toBe(discountPoisha);
    });

    it('handles SELLER_FUNDED promotions (100% seller share)', () => {
      const discountPoisha = 12500n; // ৳125.00
      const result = calculatePromotionAttribution(discountPoisha, {
        fundingType: 'SELLER_FUNDED',
      });

      expect(result.discountAmountPoisha).toBe(12500n);
      expect(result.sellerSharePoisha).toBe(12500n);
      expect(result.platformSharePoisha).toBe(0n);
      expect(result.sellerSharePercent).toBe(100);
      expect(result.platformSharePercent).toBe(0);
      expect(result.sellerSharePoisha + result.platformSharePoisha).toBe(discountPoisha);
    });

    it('handles CO_FUNDED promotions with exact integer split (e.g. 60% seller / 40% platform)', () => {
      const discountPoisha = 10000n; // ৳100.00
      const result = calculatePromotionAttribution(discountPoisha, {
        fundingType: 'CO_FUNDED',
        sellerSharePercent: 60,
        platformSharePercent: 40,
      });

      expect(result.discountAmountPoisha).toBe(10000n);
      expect(result.sellerSharePoisha).toBe(6000n);
      expect(result.platformSharePoisha).toBe(4000n);
      expect(result.sellerSharePercent).toBe(60);
      expect(result.platformSharePercent).toBe(40);
      expect(result.sellerSharePoisha + result.platformSharePoisha).toBe(discountPoisha);
    });

    it('guarantees exact integer partition even with odd discount amounts and rounding', () => {
      const discountPoisha = 333n; // ৳3.33 discount
      const result = calculatePromotionAttribution(discountPoisha, {
        fundingType: 'CO_FUNDED',
        sellerSharePercent: 50,
      });

      // 333 * 50 / 100 = 166 (floor)
      // platform = 333 - 166 = 167
      expect(result.sellerSharePoisha).toBe(166n);
      expect(result.platformSharePoisha).toBe(167n);
      expect(result.sellerSharePoisha + result.platformSharePoisha).toBe(discountPoisha);
    });

    it('returns zero shares for zero discount amount', () => {
      const result = calculatePromotionAttribution(0n, {
        fundingType: 'CO_FUNDED',
        sellerSharePercent: 50,
      });

      expect(result.discountAmountPoisha).toBe(0n);
      expect(result.sellerSharePoisha).toBe(0n);
      expect(result.platformSharePoisha).toBe(0n);
    });

    it('throws error for negative discount amounts', () => {
      expect(() => {
        calculatePromotionAttribution(-500n, { fundingType: 'PLATFORM_FUNDED' });
      }).toThrow('Discount amount in poisha cannot be negative');
    });

    it('throws error for invalid seller share percentage', () => {
      expect(() => {
        calculatePromotionAttribution(1000n, {
          fundingType: 'CO_FUNDED',
          sellerSharePercent: 150,
        });
      }).toThrow('Seller share percentage must be between 0 and 100');
    });
  });

  describe('calculateSellerPayoutWithPromotions', () => {
    it('computes payout correctly when promotion is 100% PLATFORM_FUNDED', () => {
      // Subtotal ৳1000 (100000 poisha), Platform discount ৳100 (10000 poisha), Commission ৳50 (5000 poisha)
      const input = {
        subtotalPoisha: 100000n,
        sellerDiscountPoisha: 0n,
        platformDiscountPoisha: 10000n,
        sellerCommissionPoisha: 5000n,
      };

      const result = calculateSellerPayoutWithPromotions(input);

      // Seller gross is full subtotal since discount is platform funded
      expect(result.sellerGrossEarningsPoisha).toBe(100000n);
      // Seller payout = Subtotal - sellerDiscount - commission = 100000 - 0 - 500 = 95000 (৳950)
      expect(result.sellerPayoutPoisha).toBe(95000n);
      // Platform net revenue = Commission - platformDiscount = 5000 - 10000 = -5000 (Platform spent ৳50 net)
      expect(result.platformNetRevenuePoisha).toBe(-5000n);
    });

    it('computes payout correctly when promotion is 100% SELLER_FUNDED', () => {
      // Subtotal ৳1000 (100000 poisha), Seller discount ৳100 (10000 poisha), Commission ৳50 (5000 poisha)
      const input = {
        subtotalPoisha: 100000n,
        sellerDiscountPoisha: 10000n,
        platformDiscountPoisha: 0n,
        sellerCommissionPoisha: 5000n,
      };

      const result = calculateSellerPayoutWithPromotions(input);

      // Seller gross is reduced by seller discount: 100000 - 10000 = 90000 (৳900)
      expect(result.sellerGrossEarningsPoisha).toBe(90000n);
      // Seller payout = 90000 - 5000 = 85000 (৳850)
      expect(result.sellerPayoutPoisha).toBe(85000n);
      // Platform net revenue = Commission - platformDiscount = 5000 - 0 = 5000 (৳50)
      expect(result.platformNetRevenuePoisha).toBe(5000n);
    });

    it('computes payout correctly for CO_FUNDED promotion (e.g. 50% seller / 50% platform)', () => {
      // Total discount ৳200 (20000 poisha) -> Seller share ৳100 (10000 poisha), Platform share ৳100 (10000 poisha)
      const input = {
        subtotalPoisha: 100000n,
        sellerDiscountPoisha: 10000n,
        platformDiscountPoisha: 10000n,
        sellerCommissionPoisha: 5000n,
      };

      const result = calculateSellerPayoutWithPromotions(input);

      expect(result.sellerGrossEarningsPoisha).toBe(90000n);
      expect(result.sellerPayoutPoisha).toBe(85000n);
      expect(result.platformNetRevenuePoisha).toBe(-5000n);
    });

    it('rejects negative poisha parameters', () => {
      expect(() => {
        calculateSellerPayoutWithPromotions({
          subtotalPoisha: -100n,
          sellerDiscountPoisha: 0n,
          platformDiscountPoisha: 0n,
          sellerCommissionPoisha: 0n,
        });
      }).toThrow('Monetary amounts in poisha cannot be negative');
    });
  });
});
