import { describe, it, expect } from 'bun:test';
import { TaxPolicy } from '@/shared/authz/policies/tax.policy';
import { ActorContext } from '@/shared/authz/authz.types';
import { TaxService } from '@/features/catalog/services/tax-service';

describe('Milestone 093: Tax & VAT Authorization & Policy Integration', () => {
  const adminActor: ActorContext = {
    userId: 'usr-admin-001',
    roles: ['ADMIN'],
    permissions: ['*'],
    sellerId: null,
  };

  const sellerActor: ActorContext = {
    userId: 'usr-seller-001',
    roles: ['SELLER'],
    permissions: ['seller:read', 'seller:write'],
    sellerId: 'sel-store-aaaa',
  };

  const customerActor: ActorContext = {
    userId: 'usr-cust-001',
    roles: ['CUSTOMER'],
    permissions: [],
    sellerId: null,
  };

  describe('TaxPolicy.canManageTaxRules', () => {
    it('allows ADMIN to manage jurisdiction tax rules', () => {
      expect(TaxPolicy.canManageTaxRules(adminActor)).toBe(true);
    });

    it('prohibits SELLER from managing global jurisdiction tax rules', () => {
      expect(TaxPolicy.canManageTaxRules(sellerActor)).toBe(false);
    });

    it('prohibits CUSTOMER from managing jurisdiction tax rules', () => {
      expect(TaxPolicy.canManageTaxRules(customerActor)).toBe(false);
    });
  });

  describe('TaxService Calculation Execution', () => {
    const taxService = new TaxService();

    it('executes server-side VAT calculation for cart line items', () => {
      const breakdown = taxService.calculateTaxForLineItem({
        title: 'Walton Primo S8 Pro',
        netPricePoisha: 2000000n, // ৳20,000.00
        quantity: 1,
        taxRatePercent: 5.0,
        priceIncludesTax: false,
      });

      expect(breakdown.taxAmountPoisha).toBe(100000n); // ৳1,000.00 VAT
      expect(breakdown.grossPricePoisha).toBe(2100000n); // ৳21,000.00
    });
  });
});
