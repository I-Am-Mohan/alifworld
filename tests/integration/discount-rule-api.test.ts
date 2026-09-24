import { describe, it, expect } from 'bun:test';
import { DiscountRulePolicy } from '@/shared/authz/policies/discount-rule.policy';
import { ActorContext } from '@/shared/authz/authz.types';
import { DiscountRuleService } from '@/services/discount-rule.service';

describe('Milestone 094: Discount Rule Authorization & Service Integration', () => {
  const adminActor: ActorContext = {
    userId: 'usr-admin-001',
    roles: ['ADMIN'],
    permissions: ['*'],
    sellerId: null,
  };

  const sellerA: ActorContext = {
    userId: 'usr-seller-a',
    roles: ['SELLER'],
    permissions: ['seller:read', 'seller:write'],
    sellerId: 'sel-store-aaaa',
  };

  const sellerB: ActorContext = {
    userId: 'usr-seller-b',
    roles: ['SELLER'],
    permissions: ['seller:read', 'seller:write'],
    sellerId: 'sel-store-bbbb',
  };

  const customerActor: ActorContext = {
    userId: 'usr-cust-001',
    roles: ['CUSTOMER'],
    permissions: [],
    sellerId: null,
  };

  describe('DiscountRulePolicy.canCreateDiscountRule', () => {
    it('allows ADMIN to create platform-funded, seller-funded, and co-funded discount rules', () => {
      expect(DiscountRulePolicy.canCreateDiscountRule(adminActor, { fundingType: 'PLATFORM_FUNDED' })).toBe(true);
      expect(DiscountRulePolicy.canCreateDiscountRule(adminActor, { fundingType: 'SELLER_FUNDED', sellerId: 'sel-store-aaaa' })).toBe(true);
    });

    it('allows SELLER to create seller-funded discount rules for their own store', () => {
      expect(
        DiscountRulePolicy.canCreateDiscountRule(sellerA, {
          fundingType: 'SELLER_FUNDED',
          sellerId: 'sel-store-aaaa',
        })
      ).toBe(true);
    });

    it('prohibits SELLER from creating platform-funded discount rules', () => {
      expect(
        DiscountRulePolicy.canCreateDiscountRule(sellerA, {
          fundingType: 'PLATFORM_FUNDED',
          sellerId: 'sel-store-aaaa',
        })
      ).toBe(false);
    });

    it('prohibits SELLER from creating discount rules for another store', () => {
      expect(
        DiscountRulePolicy.canCreateDiscountRule(sellerA, {
          fundingType: 'SELLER_FUNDED',
          sellerId: 'sel-store-bbbb',
        })
      ).toBe(false);
    });

    it('prohibits CUSTOMER from creating discount rules', () => {
      expect(DiscountRulePolicy.canCreateDiscountRule(customerActor, { fundingType: 'SELLER_FUNDED' })).toBe(false);
    });
  });

  describe('DiscountRuleService Evaluation Integration', () => {
    let mockPrisma: any;
    let service: DiscountRuleService;

    it('evaluates discounts using repository rules', async () => {
      mockPrisma = {
        discountRule: {
          findMany: async () => [
            {
              id: 'rule-auto-1',
              code: null,
              title: '5% Auto Discount',
              discountType: 'PERCENTAGE',
              targetScope: 'CART_SUBTOTAL',
              discountValue: 5.0,
              isAutomatic: true,
              fundingType: 'PLATFORM_FUNDED',
              priority: 1,
              startsAt: new Date('2024-01-01'),
              endsAt: null,
              status: 'ACTIVE',
              targets: [],
            },
          ],
        },
      };

      service = new DiscountRuleService(mockPrisma as any);

      const result = await service.evaluateDiscounts({
        lineItems: [
          {
            lineItemId: 'item-1',
            productId: 'prod-1',
            sellerId: 'sel-1',
            unitPricePoisha: 100000n, // ৳1,000.00
            quantity: 1,
          },
        ],
        shippingFeePoisha: 0n,
      });

      expect(result.totalDiscountAmountPoisha).toBe(5000n); // 5% of 100,000 = 5,000 poisha (৳50.00)
      expect(result.appliedDiscounts.length).toBe(1);
    });
  });
});
