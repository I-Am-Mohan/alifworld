import { describe, it, expect, beforeEach } from 'bun:test';
import { PricingPolicy } from '@/shared/authz/policies/pricing.policy';
import { ActorContext } from '@/shared/authz/authz.types';
import { PricingService } from '@/services/pricing.service';

describe('Milestone 092: Channel Pricing Authorization & Policy Integration', () => {
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

  const customerUser: ActorContext = {
    userId: 'usr-cust-001',
    roles: ['CUSTOMER'],
    permissions: [],
    sellerId: null,
  };

  describe('PricingPolicy.canCreatePriceList', () => {
    it('allows ADMIN to create sitewide and seller-specific price lists', () => {
      expect(PricingPolicy.canCreatePriceList(adminActor, { sellerId: null, channel: 'RETAIL' })).toBe(true);
      expect(PricingPolicy.canCreatePriceList(adminActor, { sellerId: 'sel-store-aaaa', channel: 'B2B' })).toBe(true);
    });

    it('allows SELLER to create price lists for their own store', () => {
      expect(PricingPolicy.canCreatePriceList(sellerA, { sellerId: 'sel-store-aaaa', channel: 'B2B' })).toBe(true);
    });

    it('prohibits SELLER from creating sitewide platform price lists (null sellerId)', () => {
      expect(PricingPolicy.canCreatePriceList(sellerA, { sellerId: null, channel: 'RETAIL' })).toBe(false);
    });

    it('prohibits SELLER from creating price lists for another sellerId', () => {
      expect(PricingPolicy.canCreatePriceList(sellerA, { sellerId: 'sel-store-bbbb', channel: 'B2B' })).toBe(false);
    });

    it('prohibits CUSTOMER from creating price lists', () => {
      expect(PricingPolicy.canCreatePriceList(customerUser, { sellerId: null, channel: 'RETAIL' })).toBe(false);
    });
  });

  describe('PricingPolicy.canUpdatePriceList', () => {
    it('allows ADMIN to update any price list', () => {
      expect(PricingPolicy.canUpdatePriceList(adminActor, { sellerId: 'sel-store-aaaa' })).toBe(true);
      expect(PricingPolicy.canUpdatePriceList(adminActor, { sellerId: null })).toBe(true);
    });

    it('allows SELLER to update price lists they own', () => {
      expect(PricingPolicy.canUpdatePriceList(sellerA, { sellerId: 'sel-store-aaaa' })).toBe(true);
    });

    it('prohibits SELLER from updating sitewide or another seller price lists', () => {
      expect(PricingPolicy.canUpdatePriceList(sellerA, { sellerId: null })).toBe(false);
      expect(PricingPolicy.canUpdatePriceList(sellerA, { sellerId: 'sel-store-bbbb' })).toBe(false);
    });
  });

  describe('PricingService Price List Listing Scoping', () => {
    let mockPrisma: any;
    let service: PricingService;

    beforeEach(() => {
      mockPrisma = {
        priceList: {
          findMany: async (args: any) => [],
          count: async (args: any) => 0,
        },
      };
      service = new PricingService(mockPrisma as any);
    });

    it('scopes seller price list queries to own sellerId or sitewide null sellerId', async () => {
      let passedWhere: any = null;
      mockPrisma.priceList.findMany = async (args: any) => {
        passedWhere = args.where;
        return [];
      };

      await service.listPriceLists(sellerA, { page: 1, limit: 20 });

      expect(passedWhere).toBeDefined();
      expect(passedWhere.OR).toEqual([{ sellerId: 'sel-store-aaaa' }, { sellerId: null }]);
    });
  });
});
