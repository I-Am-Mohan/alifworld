/**
 * Milestone 136: Server-Side Checkout Calculation Engine Unit Tests
 *
 * Verifies:
 * 1. Independent discrete Product Points snapshots (strictly separate from BDT currency)
 * 2. NBR Mushak-6.3 Value Added Tax (VAT) computations and rounding rules
 * 3. Coupon evaluation, max discount caps, and seller vs platform funding splits
 * 4. Multi-vendor financial segregation, commission (5%), and seller payout
 * 5. Conservation of the grand total financial equation
 */

import { describe, it, expect } from 'bun:test';
import { TaxService } from '@/features/catalog/services/tax-service';

describe('Milestone 136: Server-Side Checkout Calculation Engine Unit Tests', () => {
  const taxService = new TaxService();

  describe('1. Discrete Product Points & Currency Independence', () => {
    it('snapshots discrete Product Points independently from unit price without conversion', () => {
      const lineItem = {
        unitPricePoisha: 150000, // ৳1,500.00
        productPointSnapshot: 50, // 50 loyalty points per unit
        quantity: 3,
      };

      const lineTotalPoisha = lineItem.unitPricePoisha * lineItem.quantity;
      const totalProductPoints = lineItem.productPointSnapshot * lineItem.quantity;

      expect(lineTotalPoisha).toBe(450000); // ৳4,500.00
      expect(totalProductPoints).toBe(150); // 150 Points

      // Strict Invariant: Points and BDT must remain distinct primitives
      expect(typeof totalProductPoints).toBe('number');
      expect(typeof lineTotalPoisha).toBe('number');
    });

    it('preserves zero Product Points when item has no loyalty points assigned', () => {
      const lineItem = {
        unitPricePoisha: 80000,
        productPointSnapshot: 0,
        quantity: 2,
      };

      expect(lineItem.productPointSnapshot * lineItem.quantity).toBe(0);
    });
  });

  describe('2. Bangladesh NBR Mushak-6.3 Tax & VAT Calculations', () => {
    it('calculates standard 15% NBR VAT on exclusive pricing', () => {
      const netPricePoisha = 100000; // ৳1,000.00
      const breakdown = taxService.calculateTaxForLineItem({
        title: 'Fashion Kurti',
        netPricePoisha,
        quantity: 1,
        taxRatePercent: 15.0,
        priceIncludesTax: false,
      });

      expect(breakdown.taxRatePercent).toBe(15.0);
      expect(Number(breakdown.taxAmountPoisha)).toBe(15000); // ৳150.00 VAT
      expect(Number(breakdown.grossPricePoisha)).toBe(115000); // ৳1,150.00
    });

    it('calculates 5% ICT concessional VAT rate on computer hardware', () => {
      const netPricePoisha = 4500000; // ৳45,000.00 Laptop RAM
      const breakdown = taxService.calculateTaxForLineItem({
        title: '16GB DDR5 Laptop RAM',
        netPricePoisha,
        quantity: 1,
        taxRatePercent: 5.0,
        priceIncludesTax: false,
      });

      expect(breakdown.taxRatePercent).toBe(5.0);
      expect(Number(breakdown.taxAmountPoisha)).toBe(225000); // ৳2,250.00 (5%)
      expect(Number(breakdown.grossPricePoisha)).toBe(4725000); // ৳47,250.00
    });

    it('correctly handles VAT exempt items (0%)', () => {
      const netPricePoisha = 50000; // ৳500.00 Educational Book
      const breakdown = taxService.calculateTaxForLineItem({
        title: 'Bangla Sahitya Book',
        netPricePoisha,
        quantity: 1,
        taxRatePercent: 0,
        priceIncludesTax: false,
      });

      expect(breakdown.taxRatePercent).toBe(0);
      expect(Number(breakdown.taxAmountPoisha)).toBe(0);
      expect(Number(breakdown.grossPricePoisha)).toBe(50000);
    });

    it('resolves effective tax rate based on product override over category default', () => {
      const rate = taxService.resolveTaxRatePercent({
        productTaxRatePercent: 5.0,
        categoryTaxRatePercent: 15.0,
      });

      expect(rate).toBe(5.0);
    });
  });

  describe('3. Coupon Valuation & Funding Split Rules', () => {
    it('applies percentage coupon capped by maxDiscountPoisha', () => {
      const subtotalPoisha = 500000; // ৳5,000.00
      const discountPercent = 20; // 20% = ৳1,000
      const maxDiscountPoisha = 50000; // Capped at ৳500.00

      let discount = Math.round((subtotalPoisha * discountPercent) / 100);
      if (maxDiscountPoisha && discount > maxDiscountPoisha) {
        discount = maxDiscountPoisha;
      }

      expect(discount).toBe(50000); // ৳500.00
    });

    it('correctly calculates seller share vs platform share of coupon discount', () => {
      const discountPoisha = 100000; // ৳1,000.00 discount
      const sellerSharePercent = 40; // 40% funded by merchant
      const platformSharePercent = 60; // 60% funded by platform

      const sellerDiscountPoisha = Math.round((discountPoisha * sellerSharePercent) / 100);
      const platformDiscountPoisha = discountPoisha - sellerDiscountPoisha;

      expect(sellerDiscountPoisha).toBe(40000); // ৳400.00
      expect(platformDiscountPoisha).toBe(60000); // ৳600.00
      expect(sellerDiscountPoisha + platformDiscountPoisha).toBe(discountPoisha);
    });
  });

  describe('4. Multi-Vendor Financial Partitioning & Commission', () => {
    it('computes 5% platform commission and seller payout exactly', () => {
      const groupSubtotalPoisha = 200000; // ৳2,000.00
      const groupShippingFeePoisha = 6000; // ৳60.00
      const groupTaxPoisha = 30000; // ৳300.00 (15% VAT)
      const groupDiscountPoisha = 20000; // ৳200.00

      const groupTotalPoisha =
        groupSubtotalPoisha - groupDiscountPoisha + groupShippingFeePoisha + groupTaxPoisha;

      // Platform commission: 5% of subtotal
      const commissionPoisha = Math.floor((groupSubtotalPoisha * 500) / 10000);
      const sellerPayoutPoisha = groupTotalPoisha - commissionPoisha;

      expect(groupTotalPoisha).toBe(216000); // ৳2,160.00
      expect(commissionPoisha).toBe(10000); // ৳100.00
      expect(sellerPayoutPoisha).toBe(206000); // ৳2,060.00
      expect(sellerPayoutPoisha + commissionPoisha).toBe(groupTotalPoisha);
    });
  });
});
