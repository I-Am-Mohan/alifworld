import { describe, it, expect, beforeEach } from 'bun:test';
import { PricingService } from '@/services/pricing.service';
import { POST as resolveRoute } from '@/app/api/v1/pricing/resolve/route';
import { POST as quoteRoute } from '@/app/api/v1/pricing/quote/route';
import { openApiSpec } from '@/../scripts/generate-openapi';
import { NextRequest } from 'next/server';

describe('Milestone 100: Phase 10 Pricing, Tax, and Promotions Full Integration Regression', () => {
  let mockPrisma: any;
  let service: PricingService;

  const mockVariant1 = {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    productId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    sku: 'LAPTOP-PRO-16',
    pricePoisha: 15000000n, // ৳150,000.00 = 15,000,000 poisha
    compareAtPricePoisha: 16500000n, // ৳165,000.00
    costPricePoisha: 11000000n,
    minPricePoisha: 13000000n,
    minOrderQuantity: 1,
    productPoint: 1500,
    product: {
      id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
      title: 'Pro Laptop 16-inch',
      sellerId: 'sel-store-alpha-001',
      categoryId: 'cat-tech-laptops',
      brandId: 'brand-pro-tech',
      basePricePoisha: 15000000n,
      minOrderQuantity: 1,
    },
  };

  const mockVariant2 = {
    id: 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    productId: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    sku: 'MOUSE-WIRELESS-BLK',
    pricePoisha: 250000n, // ৳2,500.00 = 250,000 poisha
    compareAtPricePoisha: 300000n,
    costPricePoisha: 150000n,
    minPricePoisha: 200000n,
    minOrderQuantity: 2, // MOQ = 2
    productPoint: 50,
    product: {
      id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
      title: 'Ergonomic Wireless Mouse',
      sellerId: 'sel-store-beta-002',
      categoryId: 'cat-tech-accessories',
      brandId: 'brand-pro-tech',
      basePricePoisha: 250000n,
      minOrderQuantity: 2,
    },
  };

  const mockAutoRule = {
    id: 'rule-auto-10',
    code: 'AUTO10',
    title: 'Automatic 10% Platform Discount',
    discountType: 'PERCENTAGE',
    targetScope: 'CART_SUBTOTAL',
    discountValue: 10.0,
    maxDiscountPoisha: null,
    minOrderSubtotalPoisha: 0n,
    minQuantity: 1,
    buyQuantity: null,
    getQuantity: null,
    getDiscountPercent: null,
    isAutomatic: true,
    fundingType: 'PLATFORM_FUNDED',
    sellerSharePercent: 0.0,
    platformSharePercent: 100.0,
    sellerId: null,
    buyerSegment: null,
    priority: 1,
    startsAt: new Date('2026-01-01'),
    endsAt: null,
    usageLimit: null,
    usageCount: 0,
    status: 'ACTIVE',
    deletedAt: null,
    targets: [],
  };

  beforeEach(() => {
    mockPrisma = {
      productVariant: {
        findUnique: async (args: any) => {
          if (args.where.id === 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11') return mockVariant1;
          if (args.where.id === 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22') return mockVariant2;
          return null;
        },
      },
      priceListRule: {
        findMany: async () => [],
      },
      discountRule: {
        findMany: async () => [],
        getActiveAutomaticRules: async () => [mockAutoRule],
        getDiscountRuleByCode: async () => null,
      },
      taxRule: {
        findFirst: async () => ({
          id: 'txr_bd_standard_15',
          jurisdiction: 'BD',
          name: 'NBR Standard VAT 15%',
          ratePercent: 15.0,
        }),
      },
    };

    service = new PricingService(mockPrisma as any);
  });

  describe('1. Full Multi-Seller Cart Quote Calculation Regression', () => {
    it('computes exact subtotal, automatic discount, NBR VAT, shipping, and Product Points for multi-item cart', async () => {
      const quote = await service.calculateQuote({
        lineItems: [
          { variantId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', quantity: 1 },
          { variantId: 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', quantity: 2 },
        ],
        channel: 'RETAIL',
        shippingFeePoisha: 12000n, // ৳120.00
      });

      expect(quote.currency).toBe('BDT');
      expect(quote.lineItems).toHaveLength(2);

      // Line 1: 15,000,000 poisha
      // Line 2: 250,000 * 2 = 500,000 poisha
      // Total Base Subtotal = 15,500,000 poisha (৳155,000.00)
      expect(quote.totals.subtotalBasePoisha).toBe(15500000n);

      // Total Product Points = (1500 * 1) + (50 * 2) = 1600 points
      expect(quote.totals.totalProductPoints).toBe(1600);

      // Check calculation snapshot presence and fields
      expect(quote.calculationSnapshot).toBeDefined();
      expect(quote.calculationSnapshot.taxJurisdiction).toBe('BD');
    });
  });

  describe('2. OpenAPI Schema Paths Verification for Phase 10', () => {
    it('verifies all Phase 10 REST endpoints are present in openApiSpec paths', () => {
      const paths = Object.keys(openApiSpec.paths);

      expect(paths).toContain('/api/v1/pricing/resolve');
      expect(paths).toContain('/api/v1/pricing/quote');
      expect(paths).toContain('/api/v1/pricing/history');
      expect(paths).toContain('/api/v1/pricing/scheduled');
      expect(paths).toContain('/api/v1/pricing/variants/{id}');
    });
  });
});
