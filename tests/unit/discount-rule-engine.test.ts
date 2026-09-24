import { describe, it, expect } from 'bun:test';
import {
  evaluateDiscountRule,
  DiscountRuleDescriptor,
  CartLineItemInput,
} from '@/shared/pricing/discount-rule-engine';

describe('Milestone 094: Authoritative Discount Rule Engine Calculations', () => {
  const sampleItems: CartLineItemInput[] = [
    {
      lineItemId: 'item-1',
      productId: 'prod-shirt',
      categoryId: 'cat-apparel',
      brandId: 'brand-nike',
      sellerId: 'sel-store-1',
      unitPricePoisha: 100000n, // ৳1,000.00
      quantity: 1,
    },
    {
      lineItemId: 'item-2',
      productId: 'prod-pants',
      categoryId: 'cat-apparel',
      brandId: 'brand-adidas',
      sellerId: 'sel-store-1',
      unitPricePoisha: 150000n, // ৳1,500.00
      quantity: 1,
    },
  ];

  describe('PERCENTAGE Discount Rules', () => {
    it('calculates 10% percentage discount on cart subtotal', () => {
      const rule: DiscountRuleDescriptor = {
        id: 'rule-pct-10',
        title: '10% Sitewide Discount',
        discountType: 'PERCENTAGE',
        targetScope: 'CART_SUBTOTAL',
        discountValue: 10.0,
        isAutomatic: true,
        fundingType: 'PLATFORM_FUNDED',
        priority: 1,
        startsAt: new Date('2024-01-01'),
        status: 'ACTIVE',
      };

      // Total subtotal = 250000 poisha (৳2,500.00). 10% = 25000 poisha (৳250.00)
      const result = evaluateDiscountRule(rule, { lineItems: sampleItems });

      expect(result).not.toBeNull();
      expect(result!.discountAmountPoisha).toBe(25000n);
      expect(result!.attribution.platformSharePoisha).toBe(25000n);
      expect(result!.lineAllocations.length).toBe(2);
    });

    it('applies max discount cap when percentage discount exceeds maxDiscountPoisha', () => {
      const rule: DiscountRuleDescriptor = {
        id: 'rule-pct-capped',
        title: '50% Off (Max ৳100)',
        discountType: 'PERCENTAGE',
        targetScope: 'CART_SUBTOTAL',
        discountValue: 50.0,
        maxDiscountPoisha: 10000n, // Capped at ৳100.00 (10000 poisha)
        isAutomatic: true,
        fundingType: 'PLATFORM_FUNDED',
        priority: 1,
        startsAt: new Date('2024-01-01'),
        status: 'ACTIVE',
      };

      // 50% of 250000 is 125000, but capped at 10000
      const result = evaluateDiscountRule(rule, { lineItems: sampleItems });

      expect(result).not.toBeNull();
      expect(result!.discountAmountPoisha).toBe(10000n);
    });
  });

  describe('FIXED_AMOUNT Discount Rules', () => {

    it('calculates fixed amount discount in integer poisha', () => {
      const rule: DiscountRuleDescriptor = {
        id: 'rule-fixed-150',
        title: '৳150 Flat Discount',
        discountType: 'FIXED_AMOUNT',
        targetScope: 'CART_SUBTOTAL',
        discountValue: 150.0, // ৳150.00
        isAutomatic: true,
        fundingType: 'PLATFORM_FUNDED',
        priority: 1,
        startsAt: new Date('2024-01-01'),
        status: 'ACTIVE',
      };

      const result = evaluateDiscountRule(rule, { lineItems: sampleItems });

      expect(result).not.toBeNull();
      expect(result!.discountAmountPoisha).toBe(15000n);
    });
  });

  describe('BUY_X_GET_Y (BOGO) Discount Rules', () => {
    it('calculates Buy 2 Get 1 Free (100% discount) for 3 items', () => {
      const bogoItems: CartLineItemInput[] = [
        {
          lineItemId: 'bogo-1',
          productId: 'prod-mug',
          sellerId: 'sel-1',
          unitPricePoisha: 30000n, // ৳300.00 each
          quantity: 3,
        },
      ];

      const rule: DiscountRuleDescriptor = {
        id: 'rule-bogo-free',
        title: 'Buy 2 Get 1 Free',
        discountType: 'BUY_X_GET_Y',
        targetScope: 'CART_SUBTOTAL',
        discountValue: 0,
        buyQuantity: 2,
        getQuantity: 1,
        getDiscountPercent: 100.0, // 100% free
        isAutomatic: true,
        fundingType: 'PLATFORM_FUNDED',
        priority: 1,
        startsAt: new Date('2024-01-01'),
        status: 'ACTIVE',
      };

      const result = evaluateDiscountRule(rule, { lineItems: bogoItems });

      expect(result).not.toBeNull();
      expect(result!.discountAmountPoisha).toBe(30000n); // 1 item free (৳300)
    });
  });

  describe('FREE_SHIPPING Discount Rules', () => {
    it('discounts full shipping fee', () => {
      const rule: DiscountRuleDescriptor = {
        id: 'rule-free-ship',
        title: 'Free Shipping Promo',
        discountType: 'FREE_SHIPPING',
        targetScope: 'SHIPPING_FEE',
        discountValue: 0,
        isAutomatic: true,
        fundingType: 'PLATFORM_FUNDED',
        priority: 1,
        startsAt: new Date('2024-01-01'),
        status: 'ACTIVE',
      };

      const result = evaluateDiscountRule(rule, {
        lineItems: sampleItems,
        shippingFeePoisha: 6000n, // ৳60.00
      });

      expect(result).not.toBeNull();
      expect(result!.discountAmountPoisha).toBe(6000n);
    });
  });

  describe('Target Scope Filtering', () => {
    it('filters discount application to specific product IDs', () => {
      const rule: DiscountRuleDescriptor = {
        id: 'rule-prod-only',
        title: '৳200 off Shirt Only',
        discountType: 'FIXED_AMOUNT',
        targetScope: 'SPECIFIC_PRODUCTS',
        discountValue: 200.0,
        isAutomatic: true,
        fundingType: 'SELLER_FUNDED',
        sellerSharePercent: 100,
        sellerId: 'sel-store-1',
        priority: 1,
        startsAt: new Date('2024-01-01'),
        status: 'ACTIVE',
        targets: [{ targetType: 'PRODUCT', targetId: 'prod-shirt' }],
      };

      const result = evaluateDiscountRule(rule, { lineItems: sampleItems });

      expect(result).not.toBeNull();
      expect(result!.discountAmountPoisha).toBe(20000n);
      expect(result!.lineAllocations.length).toBe(1);
      expect(result!.lineAllocations[0].lineItemId).toBe('item-1');
      expect(result!.attribution.sellerSharePoisha).toBe(20000n);
    });
  });
});
