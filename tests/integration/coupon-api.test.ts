import { describe, it, expect } from 'bun:test';
import { CouponPolicy } from '@/shared/authz/policies/coupon.policy';
import { ActorContext } from '@/shared/authz/authz.types';
import { CouponLifecycleService } from '@/services/coupon-lifecycle.service';

describe('Milestone 095: Coupon Authorization & Policy Integration', () => {
  const adminActor: ActorContext = {
    userId: 'usr-admin-001',
    roles: ['ADMIN'],
    permissions: ['*'],
    sellerId: null,
  };

  const customerA: ActorContext = {
    userId: 'usr-cust-101',
    roles: ['CUSTOMER'],
    permissions: [],
    sellerId: null,
  };

  const customerB: ActorContext = {
    userId: 'usr-cust-102',
    roles: ['CUSTOMER'],
    permissions: [],
    sellerId: null,
  };

  const sellerA: ActorContext = {
    userId: 'usr-seller-a',
    roles: ['SELLER'],
    permissions: ['seller:read', 'seller:write'],
    sellerId: 'sel-store-aaaa',
  };

  describe('CouponPolicy Authorization Checks', () => {
    it('allows CUSTOMER to apply coupon for themselves', () => {
      expect(CouponPolicy.canApplyCoupon(customerA, 'usr-cust-101')).toBe(true);
    });

    it('prohibits CUSTOMER from applying coupon for another user', () => {
      expect(CouponPolicy.canApplyCoupon(customerA, 'usr-cust-102')).toBe(false);
    });

    it('allows CUSTOMER to view their own redemptions', () => {
      expect(
        CouponPolicy.canReadRedemption(customerA, {
          customerId: 'usr-cust-101',
        })
      ).toBe(true);
    });

    it('prohibits CUSTOMER from viewing another customer redemptions', () => {
      expect(
        CouponPolicy.canReadRedemption(customerA, {
          customerId: 'usr-cust-102',
        })
      ).toBe(false);
    });

    it('allows SELLER to view redemptions for their store', () => {
      expect(
        CouponPolicy.canReadRedemption(sellerA, {
          customerId: 'usr-cust-101',
          sellerId: 'sel-store-aaaa',
        })
      ).toBe(true);
    });

    it('prohibits SELLER from viewing redemptions for another store', () => {
      expect(
        CouponPolicy.canReadRedemption(sellerA, {
          customerId: 'usr-cust-101',
          sellerId: 'sel-store-bbbb',
        })
      ).toBe(false);
    });

    it('allows ADMIN to view any redemption record', () => {
      expect(
        CouponPolicy.canReadRedemption(adminActor, {
          customerId: 'usr-cust-102',
          sellerId: 'sel-store-bbbb',
        })
      ).toBe(true);
    });
  });

  describe('CouponLifecycleService Tenant Isolation Scoping', () => {
    let mockPrisma: any;
    let service: CouponLifecycleService;

    it('prevents seller from listing another store redemptions', async () => {
      mockPrisma = {
        couponRedemption: {
          findMany: async () => [],
          count: async () => 0,
        },
      };

      service = new CouponLifecycleService(mockPrisma as any);

      expect(
        service.listRedemptions(sellerA, {
          sellerId: 'sel-store-bbbb',
          page: 1,
          limit: 20,
        })
      ).rejects.toThrow('Sellers cannot view redemptions for another store');
    });
  });
});
