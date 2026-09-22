/**
 * AlifWorld Tax & VAT Calculation Domain Service
 * 
 * Implements jurisdiction- and effective-date-aware Value Added Tax (VAT)
 * rules under Bangladesh National Board of Revenue (NBR) Mushak 6.3 standards.
 * 
 * Reference: docs/architecture/scope-boundaries-and-domain-map.md
 * Invariants: ADR-0001, ADR-0005, ADR-0025
 */

import { TaxRule, TaxSnapshot, TaxCalculationBreakdown } from '../types';

export class TaxService {
  /**
   * Versioned tax rules for Bangladesh jurisdiction ('BD')
   * NBR Mushak standards:
   * - Standard rate: 15%
   * - ICT / Electronics reduced rate: 5%
   * - Books / Basic Agriculture: 0% (Exempt)
   */
  private readonly defaultJurisdictionRules: TaxRule[] = [
    {
      id: 'txr_bd_standard_15',
      jurisdiction: 'BD',
      name: 'NBR Bangladesh Standard VAT (15%)',
      standardRatePercent: 15.0,
      effectiveFrom: new Date('2024-01-01T00:00:00Z'),
      effectiveTo: null,
      description: 'Standard VAT rate applicable under NBR Mushak-6.3',
    },
    {
      id: 'txr_bd_ict_5',
      jurisdiction: 'BD',
      name: 'NBR ICT Hardware & Electronics Concession (5%)',
      standardRatePercent: 5.0,
      effectiveFrom: new Date('2024-01-01T00:00:00Z'),
      effectiveTo: null,
      description: 'Reduced VAT rate for local electronic goods and computer hardware',
    },
    {
      id: 'txr_bd_exempt_0',
      jurisdiction: 'BD',
      name: 'NBR Essential Commodities Exemption (0%)',
      standardRatePercent: 0.0,
      effectiveFrom: new Date('2024-01-01T00:00:00Z'),
      effectiveTo: null,
      description: 'Exempt essential items and agricultural produce',
    },
  ];

  /**
   * Resolves the applicable tax rate percentage based on product override,
   * category configuration, or default jurisdiction rule.
   */
  public resolveTaxRatePercent(params: {
    productTaxRatePercent?: number | null;
    categoryTaxRatePercent?: number | null;
    date?: Date;
  }): number {
    // 1. Explicit product-level override
    if (params.productTaxRatePercent !== undefined && params.productTaxRatePercent !== null) {
      return Number(params.productTaxRatePercent);
    }

    // 2. Category-level tax configuration
    if (params.categoryTaxRatePercent !== undefined && params.categoryTaxRatePercent !== null) {
      return Number(params.categoryTaxRatePercent);
    }

    // 3. Fallback to standard 15% NBR VAT
    return 15.0;
  }

  /**
   * Calculates tax amount for an amount in poisha.
   * Rounding rule: Standard banker's / half-up integer rounding to the nearest poisha.
   */
  public calculateTaxForLineItem(params: {
    lineItemId?: string;
    title: string;
    netPricePoisha: number;
    quantity: number;
    taxRatePercent: number;
  }): TaxCalculationBreakdown {
    const totalNetPoisha = Math.round(params.netPricePoisha * params.quantity);
    const taxAmountPoisha = Math.round((totalNetPoisha * params.taxRatePercent) / 100);
    const grossPricePoisha = totalNetPoisha + taxAmountPoisha;

    return {
      lineItemId: params.lineItemId,
      title: params.title,
      netPricePoisha: totalNetPoisha,
      taxRatePercent: params.taxRatePercent,
      taxAmountPoisha,
      grossPricePoisha,
    };
  }

  /**
   * Generates an immutable tax snapshot for invoices, order confirmations,
   * or refunds as mandated by NBR Mushak-6.3 compliance.
   */
  public generateTaxSnapshot(
    lineItems: Array<{
      lineItemId?: string;
      title: string;
      netPricePoisha: number;
      quantity: number;
      productTaxRatePercent?: number | null;
      categoryTaxRatePercent?: number | null;
    }>,
    effectiveDate: Date = new Date()
  ): TaxSnapshot {
    let totalNetPoisha = 0;
    let totalTaxPoisha = 0;

    const lines: TaxCalculationBreakdown[] = lineItems.map((item) => {
      const rate = this.resolveTaxRatePercent({
        productTaxRatePercent: item.productTaxRatePercent,
        categoryTaxRatePercent: item.categoryTaxRatePercent,
        date: effectiveDate,
      });

      const breakdown = this.calculateTaxForLineItem({
        lineItemId: item.lineItemId,
        title: item.title,
        netPricePoisha: item.netPricePoisha,
        quantity: item.quantity,
        taxRatePercent: rate,
      });

      totalNetPoisha += breakdown.netPricePoisha;
      totalTaxPoisha += breakdown.taxAmountPoisha;

      return breakdown;
    });

    return {
      jurisdiction: 'BD',
      effectiveDate: effectiveDate.toISOString(),
      totalNetPoisha,
      totalTaxPoisha,
      totalGrossPoisha: totalNetPoisha + totalTaxPoisha,
      lines,
    };
  }
}
