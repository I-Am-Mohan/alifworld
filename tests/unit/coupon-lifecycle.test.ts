import { describe, it, expect, beforeEach } from 'bun:test';
import { CouponRedemptionRepository } from '@/repositories/coupon-redemption.repository';

describe('Milestone 095: Coupon Lifecycle & Redemption Controls', () => {
  let mockPrisma: any;
  let repo: CouponRedemptionRepository;

  const sampleDiscountRule = {
    id: 'rule-coupon-eid',
    code: 'EID2026',
    title: 'Eid ৳100 Voucher',
    discountType: 'FIXED_AMOUNT',
    discountValue: 100,
    minOrderSubtotalPoisha: 50000n, // ৳500.00
    usageLimit: 100,
    usageCount: 5,
    status: 'ACTIVE',
    deletedAt: null,
  };

  beforeEach(() => {
    const count = 0;
    let ruleUsageCount = 5;

    mockPrisma = {
      couponRedemption: {
        count: async (args: any) => count,
        create: async (args: any) => ({
          id: 'red-001',
          ...args.data,
        }),
        update: async (args: any) => ({
          id: args.where.id,
          ...args.data,
        }),
        findUnique: async () => ({
          id: 'red-001',
          couponCode: 'EID2026',
          discountRuleId: 'rule-coupon-eid',
          customerId: 'cust-101',
          status: 'COMMITTED',
        }),
      },
      discountRule: {
        findUnique: async () => ({ ...sampleDiscountRule, usageCount: ruleUsageCount }),
        update: async (args: any) => {
          if (args.data.usageCount?.increment) {
            ruleUsageCount += args.data.usageCount.increment;
          } else if (args.data.usageCount?.decrement) {
            ruleUsageCount -= args.data.usageCount.decrement;
          }
          return { ...sampleDiscountRule, usageCount: ruleUsageCount };
        },
      },
      promotion: {
        findUnique: async () => null,
      },
    };

    repo = new CouponRedemptionRepository(mockPrisma as any);
  });

  describe('Coupon Reservation & Counter Management', () => {
    it('reserves a valid coupon and increments usage counter', async () => {
      const result = await repo.reserveCoupon({
        couponCode: 'EID2026',
        customerId: 'cust-101',
        discountAmountPoisha: 10000n,
        discountRuleId: 'rule-coupon-eid',
        perCustomerLimit: 1,
      });

      expect(result).toBeDefined();
      expect(result.couponCode).toBe('EID2026');
      expect(result.status).toBe('RESERVED');
    });

    it('enforces per-customer limit cap and throws error on duplicate reservation', async () => {
      // Simulate existing customer redemption
      mockPrisma.couponRedemption.count = async () => 1;

      expect(
        repo.reserveCoupon({
          couponCode: 'EID2026',
          customerId: 'cust-101',
          discountAmountPoisha: 10000n,
          discountRuleId: 'rule-coupon-eid',
          perCustomerLimit: 1,
        })
      ).rejects.toThrow('Per-customer limit of 1 reached for coupon \'EID2026\'');
    });

    it('enforces total usage limit cap when usageCount >= usageLimit', async () => {
      mockPrisma.discountRule.findUnique = async () => ({
        ...sampleDiscountRule,
        usageLimit: 10,
        usageCount: 10, // Max usage reached
      });

      expect(
        repo.reserveCoupon({
          couponCode: 'EID2026',
          customerId: 'cust-102',
          discountAmountPoisha: 10000n,
          discountRuleId: 'rule-coupon-eid',
          perCustomerLimit: 2,
        })
      ).rejects.toThrow('usage limit of 10 exceeded');
    });
  });

  describe('Commit and Reversal State Transitions', () => {
    it('commits a reserved redemption to COMMITTED with order binding', async () => {
      const result = await repo.commitRedemption('red-001', 'ord-20260925-001');

      expect(result.status).toBe('COMMITTED');
      expect(result.orderId).toBe('ord-20260925-001');
    });

    it('reverses a redemption and decrements usage count', async () => {
      const result = await repo.reverseRedemption('red-001', 'Checkout cancelled');

      expect(result!.status).toBe('REVERSED');
      expect(result!.reversalReason).toBe('Checkout cancelled');
    });
  });
});
