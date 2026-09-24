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
import { TaxRuleRepository } from '../repositories/tax-rule-repository';

export class TaxService {
  constructor(private readonly taxRuleRepository: TaxRuleRepository = new TaxRuleRepository()) {}

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

    // 3. Fallback to the effective jurisdiction rule. Rule selection is date-aware;
    // this milestone does not activate new rates or invent seller-specific tax rates.
    const effectiveDate = params.date || new Date();
    const effectiveRule = this.defaultJurisdictionRules.find((rule) =>
      rule.effectiveFrom <= effectiveDate && (!rule.effectiveTo || effectiveDate <= rule.effectiveTo)
    );
    return effectiveRule?.standardRatePercent ?? 15.0;
  }

  public async resolvePersistedTaxRatePercent(params: { categoryId?: string | null; date?: Date }): Promise<number> {
    const rule = await this.taxRuleRepository.resolveEffective(params.categoryId ?? null, params.date || new Date());
    return rule?.ratePercent ?? this.resolveTaxRatePercent({ date: params.date });
  }

  /**
   * Calculates tax using integer poisha and integer basis points.
   * Rounding rule: half-up to the nearest poisha.
   * Supports both Exclusive Tax (priceIncludesTax = false) and Inclusive Tax (priceIncludesTax = true).
   */
  public calculateTaxForLineItem(params: {
    lineItemId?: string;
    title: string;
    netPricePoisha: bigint | number | string;
    quantity: number;
    taxRatePercent: number | string;
    priceIncludesTax?: boolean;
    taxType?: string;
    taxRuleId?: string | null;
  }): TaxCalculationBreakdown {
    if (!Number.isSafeInteger(params.quantity) || params.quantity < 1) {
      throw new Error('Tax quantity must be a positive safe integer.');
    }

    const priceIncludesTax = params.priceIncludesTax ?? false;
    const taxType = params.taxType || 'VAT';
    const ratePercentNum = Number(params.taxRatePercent);

    if (ratePercentNum === 0) {
      const basePoisha = this.toPoisha(params.netPricePoisha) * BigInt(params.quantity);
      return {
        lineItemId: params.lineItemId,
        title: params.title,
        netPricePoisha: basePoisha,
        taxRatePercent: 0,
        taxAmountPoisha: 0n,
        grossPricePoisha: basePoisha,
        priceIncludesTax,
        taxType,
        taxRuleId: params.taxRuleId || null,
      };
    }

    const inputPoisha = this.toPoisha(params.netPricePoisha);
    const totalInputPoisha = inputPoisha * BigInt(params.quantity);
    const rateBasisPoints = BigInt(this.percentToBasisPoints(params.taxRatePercent));

    let netPricePoisha: bigint;
    let taxAmountPoisha: bigint;
    let grossPricePoisha: bigint;

    if (priceIncludesTax) {
      // Inclusive Tax: Input is gross display price
      grossPricePoisha = totalInputPoisha;
      // Tax = Gross * Rate / (100 + Rate) => (Gross * BasisPoints) / (10000 + BasisPoints)
      const denominator = 10000n + rateBasisPoints;
      taxAmountPoisha = this.roundHalfUp(grossPricePoisha * rateBasisPoints, denominator);
      netPricePoisha = grossPricePoisha - taxAmountPoisha;
    } else {
      // Exclusive Tax: Input is net price
      netPricePoisha = totalInputPoisha;
      // Tax = Net * Rate / 100 => (Net * BasisPoints) / 10000
      taxAmountPoisha = this.roundHalfUp(netPricePoisha * rateBasisPoints, 10000n);
      grossPricePoisha = netPricePoisha + taxAmountPoisha;
    }

    return {
      lineItemId: params.lineItemId,
      title: params.title,
      netPricePoisha,
      taxRatePercent: ratePercentNum,
      taxAmountPoisha,
      grossPricePoisha,
      priceIncludesTax,
      taxType,
      taxRuleId: params.taxRuleId || null,
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
      netPricePoisha: bigint | number | string;
      quantity: number;
      productTaxRatePercent?: number | null;
      categoryTaxRatePercent?: number | null;
      priceIncludesTax?: boolean;
      taxType?: string;
      taxRuleId?: string | null;
    }>,
    effectiveDate: Date = new Date(),
    jurisdiction: string = 'BD'
  ): TaxSnapshot {
    let totalNetPoisha = 0n;
    let totalTaxPoisha = 0n;

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
        priceIncludesTax: item.priceIncludesTax,
        taxType: item.taxType,
        taxRuleId: item.taxRuleId,
      });

      totalNetPoisha += breakdown.netPricePoisha;
      totalTaxPoisha += breakdown.taxAmountPoisha;

      return breakdown;
    });

    return {
      jurisdiction,
      effectiveDate: effectiveDate.toISOString(),
      totalNetPoisha,
      totalTaxPoisha,
      totalGrossPoisha: totalNetPoisha + totalTaxPoisha,
      lines,
    };
  }

  private toPoisha(value: bigint | number | string): bigint {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') {
      if (!Number.isSafeInteger(value)) throw new Error('Poisha values must be safe integers.');
      return BigInt(value);
    }
    if (!/^-?\d+$/.test(value)) throw new Error('Poisha values must be integer strings.');
    return BigInt(value);
  }

  private percentToBasisPoints(value: number | string): number {
    const raw = String(value);
    if (!/^(?:0|[1-9]\d{0,2})(?:\.\d{1,2})?$/.test(raw)) {
      throw new Error(`Invalid tax rate percentage: ${value}`);
    }
    const [whole, fraction = ''] = raw.split('.');
    const basisPoints = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
    if (basisPoints < 0 || basisPoints > 10000) throw new Error(`Tax rate must be between 0 and 100 percent: ${value}`);
    return basisPoints;
  }

  private roundHalfUp(numerator: bigint, denominator: bigint): bigint {
    if (denominator <= 0n) throw new Error('Rounding denominator must be positive.');
    return (numerator + denominator / 2n) / denominator;
  }
}
