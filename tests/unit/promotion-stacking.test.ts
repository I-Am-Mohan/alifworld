import { describe, it, expect } from 'bun:test';
import {
  resolveStackedPromotions,
  StackingRuleDescriptor,
} from '@/shared/pricing/promotion-stacking-engine';
import { CartLineItemInput } from '@/shared/pricing/discount-rule-engine';

describe('Milestone 097: Promotion Stacking, Exclusion, and Priority Rules', () => {
  const sampleItems: CartLineItemInput[] = [
    {
      lineItemId: 'item-101',
      productId: 'prod-phone',
      categoryId: 'cat-electronics',
      brandId: 'brand-samsung',
      sellerId: 'sel-1',
      unitPricePoisha: 100000n, // ৳1,000.00
      quantity: 1,
    },
    {
      lineItemId: 'item-102',
      productId: 'prod-cover',
      categoryId: 'cat-accessories',
      brandId: 'brand-samsung',
      sellerId: 'sel-1',
      unitPricePoisha: 50000n, // ৳500.00
      quantity: 1,
    },
  ];

  describe('Priority Order Resolution', () => {
    it('evaluates higher-priority promotion (priority 100) before lower-priority promotion (priority 10)', () => {
      const candidateRules: StackingRuleDescriptor[] = [
        {
          id: 'rule-low-priority',
          title: '5% Low Priority',
          discountType: 'PERCENTAGE',
          targetScope: 'CART_SUBTOTAL',
          discountValue: 5.0,
          isAutomatic: true,
          isStackable: true,
          exclusionScope: 'STACKABLE',
          fundingType: 'PLATFORM_FUNDED',
          priority: 10,
          startsAt: new Date('2024-01-01'),
          status: 'ACTIVE',
        },
        {
          id: 'rule-high-priority',
          title: '15% High Priority',
          discountType: 'PERCENTAGE',
          targetScope: 'CART_SUBTOTAL',
          discountValue: 15.0,
          isAutomatic: true,
          isStackable: true,
          exclusionScope: 'STACKABLE',
          fundingType: 'PLATFORM_FUNDED',
          priority: 100,
          startsAt: new Date('2024-01-01'),
          status: 'ACTIVE',
        },
      ];

      const result = resolveStackedPromotions(candidateRules, { lineItems: sampleItems });

      expect(result.appliedPromotions.length).toBe(2);
      expect(result.appliedPromotions[0].ruleId).toBe('rule-high-priority');
      expect(result.appliedPromotions[1].ruleId).toBe('rule-low-priority');
    });
  });

  describe('EXCLUSIVE_SITEWIDE Exclusion', () => {
    it('blocks subsequent promotions when an EXCLUSIVE_SITEWIDE promotion is applied', () => {
      const candidateRules: StackingRuleDescriptor[] = [
        {
          id: 'rule-exclusive-sitewide',
          title: '20% Exclusive Sitewide Sale',
          discountType: 'PERCENTAGE',
          targetScope: 'CART_SUBTOTAL',
          discountValue: 20.0,
          isAutomatic: true,
          isStackable: false,
          exclusionScope: 'EXCLUSIVE_SITEWIDE',
          fundingType: 'PLATFORM_FUNDED',
          priority: 100,
          startsAt: new Date('2024-01-01'),
          status: 'ACTIVE',
        },
        {
          id: 'rule-stackable-second',
          title: '৳100 Flat Voucher',
          discountType: 'FIXED_AMOUNT',
          targetScope: 'CART_SUBTOTAL',
          discountValue: 100.0,
          isAutomatic: true,
          isStackable: true,
          exclusionScope: 'STACKABLE',
          fundingType: 'PLATFORM_FUNDED',
          priority: 50,
          startsAt: new Date('2024-01-01'),
          status: 'ACTIVE',
        },
      ];

      const result = resolveStackedPromotions(candidateRules, { lineItems: sampleItems });

      expect(result.appliedPromotions.length).toBe(1);
      expect(result.appliedPromotions[0].ruleId).toBe('rule-exclusive-sitewide');
      expect(result.excludedPromotions.length).toBe(1);
      expect(result.excludedPromotions[0].ruleId).toBe('rule-stackable-second');
      expect(result.excludedPromotions[0].exclusionReason).toContain('EXCLUSIVE_SITEWIDE');
    });
  });

  describe('EXCLUSIVE_PRODUCT Exclusion Scope', () => {
    it('blocks lower-priority promotion targeting the same product', () => {
      const candidateRules: StackingRuleDescriptor[] = [
        {
          id: 'rule-exclusive-phone',
          title: '৳300 Off Phone Exclusive',
          discountType: 'FIXED_AMOUNT',
          targetScope: 'SPECIFIC_PRODUCTS',
          discountValue: 300.0,
          isAutomatic: true,
          isStackable: false,
          exclusionScope: 'EXCLUSIVE_PRODUCT',
          fundingType: 'SELLER_FUNDED',
          sellerSharePercent: 100,
          sellerId: 'sel-1',
          priority: 100,
          startsAt: new Date('2024-01-01'),
          status: 'ACTIVE',
          targets: [{ targetType: 'PRODUCT', targetId: 'prod-phone' }],
        },
        {
          id: 'rule-phone-pct',
          title: '10% Off Phone',
          discountType: 'PERCENTAGE',
          targetScope: 'SPECIFIC_PRODUCTS',
          discountValue: 10.0,
          isAutomatic: true,
          isStackable: true,
          exclusionScope: 'STACKABLE',
          fundingType: 'PLATFORM_FUNDED',
          priority: 50,
          startsAt: new Date('2024-01-01'),
          status: 'ACTIVE',
          targets: [{ targetType: 'PRODUCT', targetId: 'prod-phone' }],
        },
      ];

      const result = resolveStackedPromotions(candidateRules, { lineItems: sampleItems });

      expect(result.appliedPromotions.length).toBe(1);
      expect(result.appliedPromotions[0].ruleId).toBe('rule-exclusive-phone');
      expect(result.excludedPromotions.length).toBe(1);
      expect(result.excludedPromotions[0].ruleId).toBe('rule-phone-pct');
    });
  });

  describe('Stacking Combine & Subtotal Cap Protection', () => {
    it('stacks multiple stackable promotions up to line item price floor', () => {
      const candidateRules: StackingRuleDescriptor[] = [
        {
          id: 'rule-pct-10',
          title: '10% Sitewide',
          discountType: 'PERCENTAGE',
          targetScope: 'CART_SUBTOTAL',
          discountValue: 10.0,
          isAutomatic: true,
          isStackable: true,
          exclusionScope: 'STACKABLE',
          fundingType: 'PLATFORM_FUNDED',
          priority: 50,
          startsAt: new Date('2024-01-01'),
          status: 'ACTIVE',
        },
        {
          id: 'rule-fixed-100',
          title: '৳100 Flat Voucher',
          discountType: 'FIXED_AMOUNT',
          targetScope: 'CART_SUBTOTAL',
          discountValue: 100.0,
          isAutomatic: true,
          isStackable: true,
          exclusionScope: 'STACKABLE',
          fundingType: 'PLATFORM_FUNDED',
          priority: 40,
          startsAt: new Date('2024-01-01'),
          status: 'ACTIVE',
        },
      ];

      const result = resolveStackedPromotions(candidateRules, { lineItems: sampleItems });

      expect(result.appliedPromotions.length).toBe(2);
      expect(result.totalDiscountPoisha).toBe(15000n + 10000n); // ৳150 (10% of ৳1500) + ৳100 = ৳250 (25000 poisha)
    });
  });
});
