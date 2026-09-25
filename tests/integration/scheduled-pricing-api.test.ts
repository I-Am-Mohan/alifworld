import { describe, it, expect, beforeEach } from 'bun:test';
import { PricingService } from '@/services/pricing.service';
import { ActorContext } from '@/shared/authz/authz.types';
import { GET as getHistoryRoute } from '@/app/api/v1/pricing/history/route';
import { GET as getScheduledRoute } from '@/app/api/v1/pricing/scheduled/route';
import { NextRequest } from 'next/server';

describe('Milestone 099: Scheduled Prices and Price History API Integration Tests', () => {
  let mockPrisma: any;
  let service: PricingService;

  const adminActor: ActorContext = {
    userId: 'usr-admin-001',
    roles: ['ADMIN'],
    permissions: ['*'],
    sellerId: null,
  };

  const sellerActor: ActorContext = {
    userId: 'usr-seller-001',
    roles: ['SELLER'],
    permissions: ['seller:write'],
    sellerId: 'sel-store-aaaa-1111',
  };

  const mockVariantRecord = {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    productId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    sku: 'SKU-SHIRT-BLUE-L',
    pricePoisha: 120000n,
    compareAtPricePoisha: 150000n,
    costPricePoisha: 70000n,
    minPricePoisha: 90000n,
    product: {
      id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
      title: 'Premium T-Shirt',
      sellerId: 'sel-store-aaaa-1111',
    },
  };

  const mockPriceHistoryEntries = [
    {
      id: 'ph-001',
      variantId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      productId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
      sellerId: 'sel-store-aaaa-1111',
      changeType: 'BASE_PRICE_UPDATE',
      previousPricePoisha: 100000n,
      newPricePoisha: 120000n,
      previousCompareAtPoisha: 130000n,
      newCompareAtPoisha: 150000n,
      reason: 'Cost adjustment',
      effectiveAt: new Date('2026-06-01'),
      variant: { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', sku: 'SKU-SHIRT-BLUE-L', title: 'Blue L' },
      product: { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', title: 'Premium T-Shirt', sellerId: 'sel-store-aaaa-1111' },
    },
  ];

  beforeEach(() => {
    mockPrisma = {
      productVariant: {
        findUnique: async (args: any) => {
          if (args.where.id === 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11') return mockVariantRecord;
          return null;
        },
        update: async (args: any) => ({
          ...mockVariantRecord,
          pricePoisha: args.data.pricePoisha,
          compareAtPricePoisha: args.data.compareAtPricePoisha,
          updatedAt: new Date(),
        }),
      },
      priceHistory: {
        create: async (args: any) => ({ id: 'ph-new', ...args.data }),
        findMany: async (args: any) => mockPriceHistoryEntries,
        count: async (args: any) => mockPriceHistoryEntries.length,
      },
      priceListRule: {
        findMany: async (args: any) => [],
        count: async (args: any) => 0,
      },
    };

    service = new PricingService(mockPrisma as any);
  });

  describe('PricingService.updateVariantBasePrice & PriceHistory', () => {
    it('updates variant base price and records PriceHistory entry', async () => {
      let createdHistory: any = null;
      mockPrisma.priceHistory.create = async (args: any) => {
        createdHistory = args.data;
        return { id: 'ph-created', ...args.data };
      };

      const result = await service.updateVariantBasePrice(sellerActor, {
        variantId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        pricePoisha: 140000n, // ৳1,400.00
        compareAtPricePoisha: 170000n,
        reason: 'Price increase due to inflation',
      });

      expect(result.pricePoisha).toBe(140000n);
      expect(createdHistory).toBeDefined();
      expect(createdHistory.changeType).toBe('BASE_PRICE_UPDATE');
      expect(createdHistory.previousPricePoisha).toBe(120000n);
      expect(createdHistory.newPricePoisha).toBe(140000n);
      expect(createdHistory.reason).toBe('Price increase due to inflation');
    });

    it('prohibits seller from updating variant belonging to another seller', async () => {
      const unauthorizedSeller: ActorContext = {
        userId: 'usr-seller-other',
        roles: ['SELLER'],
        permissions: ['seller:write'],
        sellerId: 'sel-store-bbbb-2222',
      };

      expect(
        service.updateVariantBasePrice(unauthorizedSeller, {
          variantId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          pricePoisha: 140000n,
        })
      ).rejects.toThrow('Insufficient permissions to update pricing for this seller product');
    });
  });

  describe('PricingService.getPriceHistory & getScheduledPrices', () => {
    it('queries price history with seller scoping', async () => {
      let passedWhere: any = null;
      mockPrisma.priceHistory.findMany = async (args: any) => {
        passedWhere = args.where;
        return mockPriceHistoryEntries;
      };

      const history = await service.getPriceHistory(sellerActor, {
        variantId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      });

      expect(history.items).toHaveLength(1);
      expect(passedWhere.sellerId).toBe('sel-store-aaaa-1111');
    });
  });

  describe('Route Handlers GET /api/v1/pricing/history & GET /api/v1/pricing/scheduled', () => {
    it('GET /api/v1/pricing/history returns HTTP 200 with serialized string price values', async () => {
      const orig = PricingService.prototype.getPriceHistory;
      PricingService.prototype.getPriceHistory = async () => ({
        items: [
          {
            id: 'ph-001',
            variantId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
            productId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
            sellerId: 'sel-store-aaaa-1111',
            changeType: 'BASE_PRICE_UPDATE',
            previousPricePoisha: 100000n,
            newPricePoisha: 120000n,
            previousCompareAtPoisha: 130000n,
            newCompareAtPoisha: 150000n,
            reason: 'Cost adjustment',
            effectiveAt: new Date('2026-06-01'),
          } as any,
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      try {
        const req = new NextRequest('http://localhost:3000/api/v1/pricing/history?variantId=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
        const res = await getHistoryRoute(req);

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.data.items).toBeArray();
        expect(json.data.items[0].newPricePoisha).toBe('120000');
      } finally {
        PricingService.prototype.getPriceHistory = orig;
      }
    });

    it('GET /api/v1/pricing/scheduled returns HTTP 200 with scheduled price list rules', async () => {
      const orig = PricingService.prototype.getScheduledPrices;
      PricingService.prototype.getScheduledPrices = async () => ({
        items: [
          {
            id: 'rule-001',
            priceListId: 'pl-001',
            pricePoisha: 110000n,
            compareAtPricePoisha: 140000n,
            priceList: {
              id: 'pl-001',
              code: 'FUTURE_PROMO',
              name: 'Future Promo',
              startsAt: new Date('2026-08-01'),
            },
          } as any,
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      try {
        const req = new NextRequest('http://localhost:3000/api/v1/pricing/scheduled?channel=RETAIL');
        const res = await getScheduledRoute(req);

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.data.items).toBeArray();
        expect(json.data.items[0].pricePoisha).toBe('110000');
      } finally {
        PricingService.prototype.getScheduledPrices = orig;
      }
    });
  });
});
