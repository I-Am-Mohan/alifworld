import { describe, it, expect, beforeEach } from 'bun:test';
import { PromotionStackingService } from '@/services/promotion-stacking.service';

describe('Milestone 097: Promotion Stacking Service Integration', () => {
  let mockPrisma: any;
  let service: PromotionStackingService;

  beforeEach(() => {
    mockPrisma = {
      discountRule: {
        getActiveAutomaticRules: async () => [],
        getDiscountRuleByCode: async () => null,
      },
      promotion: {
        getPromotionByCode: async () => null,
      },
    };
    service = new PromotionStackingService(mockPrisma as any);
  });

  it('evaluates candidate automatic discount rules in priority order', async () => {
    const mockDiscountRuleRepo = {
      getActiveAutomaticRules: async () => [
        {
          id: 'rule-auto-10',
          code: null,
          title: '10% Off Electronics',
          discountType: 'PERCENTAGE',
          targetScope: 'CART_SUBTOTAL',
          discountValue: 10.0,
          isAutomatic: true,
          isStackable: true,
          exclusionScope: 'STACKABLE',
          fundingType: 'PLATFORM_FUNDED',
          priority: 10,
          startsAt: new Date('2024-01-01'),
          status: 'ACTIVE',
          targets: [],
        },
      ],
      getDiscountRuleByCode: async () => null,
    };

    (service as any).discountRuleRepo = mockDiscountRuleRepo;

    const result = await service.evaluateStackedPromotions({
      lineItems: [
        {
          lineItemId: 'li-1',
          productId: 'prod-1',
          sellerId: 'sel-1',
          unitPricePoisha: 100000n, // ৳1,000.00
          quantity: 1,
        },
      ],
      shippingFeePoisha: 0n,
      couponCodes: [],
      channel: 'RETAIL',
    });

    expect(result.appliedPromotions.length).toBe(1);
    expect(result.totalDiscountPoisha).toBe(10000n);
  });
});
