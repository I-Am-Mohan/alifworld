import { describe, expect, it } from 'bun:test';
import { TaxService } from '@/features/catalog/services/tax-service';

describe('TaxService: NBR Mushak-6.3 VAT Calculations', () => {
  const taxService = new TaxService();

  it('resolves product-level tax override when present', () => {
    const rate = taxService.resolveTaxRatePercent({
      productTaxRatePercent: 5.0,
      categoryTaxRatePercent: 15.0,
    });
    expect(rate).toBe(5.0);
  });

  it('falls back to category tax rate when product has no override', () => {
    const rate = taxService.resolveTaxRatePercent({
      productTaxRatePercent: null,
      categoryTaxRatePercent: 7.5,
    });
    expect(rate).toBe(7.5);
  });

  it('falls back to standard 15% NBR VAT when neither product nor category sets a rate', () => {
    const rate = taxService.resolveTaxRatePercent({
      productTaxRatePercent: null,
      categoryTaxRatePercent: null,
    });
    expect(rate).toBe(15.0);
  });

  it('calculates line item tax in integer poisha with Banker half-up rounding', () => {
    // ৳21,990.00 = 2,199,000 poisha at 5% VAT
    const lineItem = taxService.calculateTaxForLineItem({
      lineItemId: 'itm_01',
      title: 'Walton Primo S8 Pro',
      netPricePoisha: 2199000,
      quantity: 1,
      taxRatePercent: 5.0,
    });

    // 2,199,000 * 0.05 = 109,950 poisha (৳1,099.50)
    expect(lineItem.netPricePoisha).toBe(2199000n);
    expect(lineItem.taxAmountPoisha).toBe(109950n);
    expect(lineItem.grossPricePoisha).toBe(2308950n); // ৳23,089.50
  });

  it('handles fractional poisha rounding correctly', () => {
    // 199 poisha at 5% = 9.95 -> rounds to 10 poisha
    const lineItem = taxService.calculateTaxForLineItem({
      title: 'Small Accessory',
      netPricePoisha: 199,
      quantity: 1,
      taxRatePercent: 5.0,
    });

    expect(lineItem.taxAmountPoisha).toBe(10n);
    expect(lineItem.grossPricePoisha).toBe(209n);
  });

  it('generates immutable tax snapshot for multi-item order', () => {
    const items = [
      {
        lineItemId: 'itm_phone_01',
        title: 'Walton Smartphone',
        netPricePoisha: 2000000, // ৳20,000.00
        quantity: 1,
        productTaxRatePercent: 5.0, // 5% = 100,000 poisha
      },
      {
        lineItemId: 'itm_earbuds_02',
        title: 'Xiaomi Earbuds',
        netPricePoisha: 500000, // ৳5,000.00
        quantity: 2, // total net = 1,000,000 poisha
        categoryTaxRatePercent: 15.0, // 15% = 150,000 poisha
      },
      {
        lineItemId: 'itm_book_03',
        title: 'Essential Groceries / Book',
        netPricePoisha: 25000, // ৳250.00
        quantity: 2, // total net = 50,000 poisha
        categoryTaxRatePercent: 0.0, // 0% = 0 poisha
      },
    ];

    const snapshot = taxService.generateTaxSnapshot(items);

    expect(snapshot.jurisdiction).toBe('BD');
    expect(snapshot.lines.length).toBe(3);

    // Total Net: 2,000,000 + 1,000,000 + 50,000 = 3,050,000 poisha (৳30,500.00)
    expect(snapshot.totalNetPoisha).toBe(3050000n);

    // Total Tax: 100,000 + 150,000 + 0 = 250,000 poisha (৳2,500.00)
    expect(snapshot.totalTaxPoisha).toBe(250000n);

    // Total Gross: 3,050,000 + 250,000 = 3,300,000 poisha (৳33,000.00)
    expect(snapshot.totalGrossPoisha).toBe(3300000n);
  });
});
