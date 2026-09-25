import { describe, it, expect, beforeEach } from 'bun:test';
import { PricingService } from '@/services/pricing.service';
import { POST as quoteRoute } from '@/app/api/v1/pricing/quote/route';
import { NextRequest } from 'next/server';

describe('Milestone 098: Authoritative Pricing Quote API & Service Integration Tests', () => {
  let mockPrisma: any;
  let service: PricingService;

  const mockVariantRecord = {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    productId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    sku: 'SKU-SHIRT-BLUE-L',
    pricePoisha: 120000n, // ৳1,200.00
    compareAtPricePoisha: 150000n, // ৳1,500.00
    costPricePoisha: 70000n,
    minPricePoisha: 90000n,
    minOrderQuantity: 1,
    productPoint: 15,
    product: {
      id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
      title: 'Premium Cotton T-Shirt',
      sellerId: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
      categoryId: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
      brandId: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55',
      basePricePoisha: 120000n,
      compareAtPricePoisha: 150000n,
      costPricePoisha: 70000n,
      minPricePoisha: 90000n,
      minOrderQuantity: 1,
    },
  };

  const mockDiscountRule = {
    id: 'rule-disc-001',
    code: 'SAVE10',
    title: '10% Discount Coupon',
    discountType: 'PERCENTAGE',
    targetScope: 'CART_SUBTOTAL',
    discountValue: 10.0,
    maxDiscountPoisha: null,
    minOrderSubtotalPoisha: 0n,
    minQuantity: 1,
    buyQuantity: null,
    getQuantity: null,
    getDiscountPercent: null,
    isAutomatic: false,
    fundingType: 'CO_FUNDED',
    sellerSharePercent: 50.0,
    platformSharePercent: 50.0,
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
          if (args.where.id === 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11') {
            return mockVariantRecord;
          }
          return null;
        },
      },
      priceListRule: {
        findMany: async (args: any) => [],
      },
      discountRule: {
        findMany: async (args: any) => [],
        findUnique: async (args: any) => {
          if (args.where.code === 'SAVE10') {
            return mockDiscountRule;
          }
          return null;
        },
      },
      taxRule: {
        findFirst: async (args: any) => ({
          id: 'txr_bd_standard_15',
          jurisdiction: 'BD',
          name: 'NBR Standard VAT 15%',
          ratePercent: 15.0,
        }),
      },
    };

    service = new PricingService(mockPrisma as any);
  });

  describe('PricingService.calculateQuote', () => {
    it('calculates authoritative quote with base price, coupon discount, NBR tax, and Product Points', async () => {
      const quote = await service.calculateQuote({
        lineItems: [
          {
            variantId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
            quantity: 2,
          },
        ],
        channel: 'RETAIL',
        couponCode: 'SAVE10',
        shippingFeePoisha: 6000n, // ৳60.00 shipping
      });

      expect(quote.currency).toBe('BDT');
      expect(quote.lineItems).toHaveLength(1);

      const item = quote.lineItems[0];
      expect(item.variantId).toBe('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
      expect(item.unitPricePoisha).toBe(120000n);
      expect(item.baseTotalPoisha).toBe(240000n); // 2 * 120000
      expect(item.totalProductPoints).toBe(30); // 2 * 15

      // 10% coupon discount on 240000 = 24000 poisha (৳240.00)
      expect(item.discountPoisha).toBe(24000n);
      expect(item.sellerFundedDiscountPoisha).toBe(12000n);
      expect(item.platformFundedDiscountPoisha).toBe(12000n);
      expect(item.netAmountPoisha).toBe(216000n); // 240000 - 24000

      // Tax at 15% on netAmount 216000 = 32400 poisha
      expect(item.taxRatePercent).toBe(15);
      expect(item.taxAmountPoisha).toBe(32400n);

      // Totals
      expect(quote.totals.subtotalBasePoisha).toBe(240000n);
      expect(quote.totals.totalDiscountPoisha).toBe(24000n);
      expect(quote.totals.netSubtotalPoisha).toBe(216000n);
      expect(quote.totals.totalTaxPoisha).toBe(32400n);
      expect(quote.totals.shippingFeePoisha).toBe(6000n);
      expect(quote.totals.grandTotalPoisha).toBe(254400n); // 216000 + 32400 + 6000

      // Immutable calculation snapshot check
      expect(quote.calculationSnapshot).toBeDefined();
      expect(quote.calculationSnapshot.currency).toBe('BDT');
      expect(quote.calculationSnapshot.totals.grandTotalPoisha).toBe('254400');
    });

    it('throws NotFoundError if a requested variantId does not exist', async () => {
      expect(
        service.calculateQuote({
          lineItems: [{ variantId: '00000000-0000-0000-0000-000000000000', quantity: 1 }],
        })
      ).rejects.toThrow('Product variant with ID');
    });
  });

  describe('POST /api/v1/pricing/quote Route Handler', () => {
    it('returns HTTP 422 validation error when lineItems array is empty', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/pricing/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineItems: [],
        }),
      });

      const res = await quoteRoute(req);
      expect(res.status).toBe(422);

      const json = await res.json();
      expect(json.success).toBe(false);
    });
  });
});
