import { describe, it, expect, beforeEach } from 'bun:test';
import { PromotionPolicy } from '@/shared/authz/policies/promotion.policy';
import { ActorContext } from '@/shared/authz/authz.types';
import { PromotionAttributionService } from '@/services/promotion-attribution.service';
import { AuthorizationError, ValidationError } from '@/services/promotion-attribution.service';

describe('Milestone 096: Promotion Funding Authorization & Tenant Isolation', () => {
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

  describe('PromotionPolicy.canCreatePromotion', () => {
    it('allows ADMIN to create platform-funded, seller-funded, and co-funded promotions', () => {
      expect(PromotionPolicy.canCreatePromotion(adminActor, { fundingType: 'PLATFORM_FUNDED' })).toBe(true);
      expect(PromotionPolicy.canCreatePromotion(adminActor, { fundingType: 'SELLER_FUNDED', sellerId: 'sel-store-aaaa' })).toBe(true);
      expect(PromotionPolicy.canCreatePromotion(adminActor, { fundingType: 'CO_FUNDED' })).toBe(true);
    });

    it('allows SELLER to create seller-funded promotions for their own sellerId', () => {
      expect(
        PromotionPolicy.canCreatePromotion(sellerA, {
          fundingType: 'SELLER_FUNDED',
          sellerId: 'sel-store-aaaa',
        })
      ).toBe(true);
    });

    it('prohibits SELLER from creating platform-funded or co-funded promotions', () => {
      expect(
        PromotionPolicy.canCreatePromotion(sellerA, {
          fundingType: 'PLATFORM_FUNDED',
          sellerId: 'sel-store-aaaa',
        })
      ).toBe(false);

      expect(
        PromotionPolicy.canCreatePromotion(sellerA, {
          fundingType: 'CO_FUNDED',
          sellerId: 'sel-store-aaaa',
        })
      ).toBe(false);
    });

    it('prohibits SELLER from creating promotions for another sellerId', () => {
      expect(
        PromotionPolicy.canCreatePromotion(sellerA, {
          fundingType: 'SELLER_FUNDED',
          sellerId: 'sel-store-bbbb',
        })
      ).toBe(false);
    });

    it('prohibits CUSTOMER from creating promotions', () => {
      expect(PromotionPolicy.canCreatePromotion(customerUser, { fundingType: 'SELLER_FUNDED' })).toBe(false);
    });
  });

  describe('PromotionPolicy.canReadAttribution & canAccessSellerAttributionReport', () => {
    it('allows ADMIN to access attribution records for any seller', () => {
      expect(PromotionPolicy.canReadAttribution(adminActor, { sellerId: 'sel-store-aaaa' })).toBe(true);
      expect(PromotionPolicy.canAccessSellerAttributionReport(adminActor, 'sel-store-aaaa')).toBe(true);
      expect(PromotionPolicy.canAccessSellerAttributionReport(adminActor, 'sel-store-bbbb')).toBe(true);
    });

    it('allows SELLER to access attribution records for their own sellerId', () => {
      expect(PromotionPolicy.canReadAttribution(sellerA, { sellerId: 'sel-store-aaaa' })).toBe(true);
      expect(PromotionPolicy.canAccessSellerAttributionReport(sellerA, 'sel-store-aaaa')).toBe(true);
    });

    it('prohibits SELLER from accessing attribution records belonging to another sellerId', () => {
      expect(PromotionPolicy.canReadAttribution(sellerA, { sellerId: 'sel-store-bbbb' })).toBe(false);
      expect(PromotionPolicy.canAccessSellerAttributionReport(sellerA, 'sel-store-bbbb')).toBe(false);
    });
  });

  describe('PromotionAttributionService Tenant Isolation Enforcement', () => {
    let mockPrisma: any;
    let service: PromotionAttributionService;

    beforeEach(() => {
      mockPrisma = {
        promotionAttribution: {
          findMany: async (args: any) => [],
          count: async (args: any) => 0,
          aggregate: async () => ({
            _sum: { discountAmountPoisha: 0n, sellerSharePoisha: 0n, platformSharePoisha: 0n },
            _count: { id: 0 },
          }),
          groupBy: async () => [],
        },
        promotion: {
          findUnique: async () => null,
        },
      };
      service = new PromotionAttributionService(mockPrisma as any);
    });

    it('blocks seller from querying another seller attributions', async () => {
      expect(
        service.listAttributions(sellerA, {
          sellerId: 'sel-store-bbbb',
          page: 1,
          limit: 20,
        })
      ).rejects.toThrow('Sellers cannot view another seller\'s promotion attributions');
    });

    it('blocks seller from viewing another seller attribution summary', async () => {
      expect(service.getAttributionSummary(sellerA, 'sel-store-bbbb')).rejects.toThrow(
        'Sellers cannot view another seller\'s promotion summary'
      );
    });

    it('blocks unauthenticated / customer user from viewing attributions', async () => {
      expect(service.listAttributions(customerUser, { page: 1, limit: 20 })).rejects.toThrow(
        'Insufficient permissions to view promotion attributions'
      );
    });
  });
});
