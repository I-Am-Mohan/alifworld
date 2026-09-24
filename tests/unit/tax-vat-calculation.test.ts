import { describe, it, expect } from 'bun:test';
import { TaxService } from '@/features/catalog/services/tax-service';

describe('Milestone 093: Configurable Tax and VAT Calculation Architecture', () => {
  const taxService = new TaxService();

  describe('Exclusive Tax Calculations (priceIncludesTax = false)', () => {
    it('calculates 15% standard NBR VAT for exclusive pricing', () => {
      // Net ৳1,000 (100000 poisha) at 15% VAT
      const result = taxService.calculateTaxForLineItem({
        lineItemId: 'line-1',
        title: 'Standard Product',
        netPricePoisha: 100000n,
        quantity: 1,
        taxRatePercent: 15.0,
        priceIncludesTax: false,
      });

      expect(result.netPricePoisha).toBe(100000n);
      expect(result.taxAmountPoisha).toBe(15000n); // ৳150.00 VAT
      expect(result.grossPricePoisha).toBe(115000n); // ৳1,150.00 Total
      expect(result.priceIncludesTax).toBe(false);
      expect(result.taxType).toBe('VAT');
    });

    it('calculates 5% ICT concession VAT for electronic hardware', () => {
      // Net ৳21,990 (2199000 poisha) at 5% VAT
      const result = taxService.calculateTaxForLineItem({
        lineItemId: 'line-2',
        title: 'Laptop / Smartphone',
        netPricePoisha: 2199000n,
        quantity: 1,
        taxRatePercent: 5.0,
        priceIncludesTax: false,
      });

      expect(result.netPricePoisha).toBe(2199000n);
      expect(result.taxAmountPoisha).toBe(109950n); // ৳1,099.50 VAT
      expect(result.grossPricePoisha).toBe(2308950n); // ৳23,089.50 Total
    });

    it('handles 0% VAT exempt essential commodities', () => {
      const result = taxService.calculateTaxForLineItem({
        lineItemId: 'line-3',
        title: 'Rice / Educational Book',
        netPricePoisha: 50000n,
        quantity: 2,
        taxRatePercent: 0.0,
        priceIncludesTax: false,
      });

      expect(result.netPricePoisha).toBe(100000n);
      expect(result.taxAmountPoisha).toBe(0n);
      expect(result.grossPricePoisha).toBe(100000n);
    });
  });

  describe('Inclusive Tax Calculations (priceIncludesTax = true)', () => {
    it('calculates 15% NBR VAT from display gross price ৳1,150', () => {
      // Display gross ৳1,150 (115000 poisha) inclusive of 15% VAT
      const result = taxService.calculateTaxForLineItem({
        lineItemId: 'line-inc-1',
        title: 'Inclusive Retail Goods',
        netPricePoisha: 115000n, // Gross display price
        quantity: 1,
        taxRatePercent: 15.0,
        priceIncludesTax: true,
      });

      // Tax = 115000 * 15 / 115 = 15000 poisha
      expect(result.taxAmountPoisha).toBe(15000n);
      expect(result.netPricePoisha).toBe(100000n);
      expect(result.grossPricePoisha).toBe(115000n);
      expect(result.netPricePoisha + result.taxAmountPoisha).toBe(result.grossPricePoisha);
      expect(result.priceIncludesTax).toBe(true);
    });

    it('calculates 5% inclusive VAT with exact integer poisha partition', () => {
      // Display gross ৳10,500 (1050000 poisha) inclusive of 5% VAT
      const result = taxService.calculateTaxForLineItem({
        lineItemId: 'line-inc-2',
        title: 'Inclusive ICT Hardware',
        netPricePoisha: 1050000n,
        quantity: 1,
        taxRatePercent: 5.0,
        priceIncludesTax: true,
      });

      // Tax = 1050000 * 5 / 105 = 50000 poisha (৳500.00)
      expect(result.taxAmountPoisha).toBe(50000n);
      expect(result.netPricePoisha).toBe(1000000n);
      expect(result.grossPricePoisha).toBe(1050000n);
      expect(result.netPricePoisha + result.taxAmountPoisha).toBe(result.grossPricePoisha);
    });

    it('handles fractional poisha half-up rounding in inclusive tax', () => {
      // 1000 poisha inclusive at 15% VAT => 1000 * 15 / 115 = 130.4347 -> 130 poisha
      const result = taxService.calculateTaxForLineItem({
        lineItemId: 'line-inc-3',
        title: 'Small Accessory Inclusive',
        netPricePoisha: 1000n,
        quantity: 1,
        taxRatePercent: 15.0,
        priceIncludesTax: true,
      });

      expect(result.taxAmountPoisha).toBe(130n);
      expect(result.netPricePoisha).toBe(870n);
      expect(result.grossPricePoisha).toBe(1000n);
      expect(result.netPricePoisha + result.taxAmountPoisha).toBe(result.grossPricePoisha);
    });
  });

  describe('Immutable Tax Snapshot Generation', () => {
    it('generates a multi-item tax snapshot for invoices & Mushak-6.3 reporting', () => {
      const lineItems = [
        {
          lineItemId: 'itm_01',
          title: 'Electronics Item',
          netPricePoisha: 2000000n,
          quantity: 1,
          productTaxRatePercent: 5.0,
          priceIncludesTax: false,
        },
        {
          lineItemId: 'itm_02',
          title: 'Clothing Retail Item',
          netPricePoisha: 115000n,
          quantity: 2, // 230,000 poisha inclusive
          categoryTaxRatePercent: 15.0,
          priceIncludesTax: true,
        },
      ];

      const snapshot = taxService.generateTaxSnapshot(lineItems, new Date('2026-09-25T00:00:00Z'), 'BD');

      expect(snapshot.jurisdiction).toBe('BD');
      expect(snapshot.lines.length).toBe(2);
      expect(snapshot.totalNetPoisha + snapshot.totalTaxPoisha).toBe(snapshot.totalGrossPoisha);
    });
  });
});
