import { describe, expect, it, beforeEach } from 'bun:test';
import { CartService } from '@/features/cart/services/cart.service';
import { CartDTO } from '@/features/cart/types/cart.types';

class MockPrismaGroupedCartDb {
  public sellers: any[] = [];
  public carts: any[] = [];
  public cartItems: any[] = [];
  public variants: any[] = [];

  public seller = {
    findFirst: async ({ where }: any) => {
      return this.sellers.find((s) => s.id === where.id && !s.deletedAt) || null;
    },
  };

  public cart = {
    findFirst: async ({ where }: any) => {
      return this.carts.find((c) => c.id === where.id && !c.deletedAt) || null;
    },
  };

  public cartItem = {
    findFirst: async () => null,
  };

  public productVariant = {
    findFirst: async () => null,
  };
}

describe('Milestone 128: Cart Multi-Vendor Fulfillment Grouping Unit Tests', () => {
  let mockDb: MockPrismaGroupedCartDb;
  let service: CartService;

  const mockSeller1 = {
    id: 'sel_walton',
    businessName: 'Walton Official Store',
    slug: 'walton-store',
    status: 'VERIFIED',
    operationalDefaults: {
      shippingMode: 'PLATFORM',
      defaultHandlingDays: 2,
    },
    settings: {
      vacationMode: false,
    },
    deletedAt: null,
  };

  const mockSeller2 = {
    id: 'sel_apex',
    businessName: 'Apex Footwear Flagship',
    slug: 'apex-footwear',
    status: 'VERIFIED',
    operationalDefaults: {
      shippingMode: 'PLATFORM',
      defaultHandlingDays: 1,
    },
    settings: {
      vacationMode: false,
    },
    deletedAt: null,
  };

  const mockSeller3Vacation = {
    id: 'sel_aarong',
    businessName: 'Aarong Handcrafts',
    slug: 'aarong-store',
    status: 'VERIFIED',
    operationalDefaults: {
      shippingMode: 'PLATFORM',
      defaultHandlingDays: 3,
    },
    settings: {
      vacationMode: true,
      vacationMessage: 'Closed for Eid holidays until next week.',
    },
    deletedAt: null,
  };

  beforeEach(() => {
    mockDb = new MockPrismaGroupedCartDb();
    service = new CartService();
    (service as any).db = mockDb;

    mockDb.sellers.push(mockSeller1, mockSeller2, mockSeller3Vacation);
  });

  it('partitions cart items into distinct seller fulfillment packages', async () => {
    const multiVendorCart: CartDTO = {
      id: 'crt_multi_01',
      userId: 'usr_buyer_01',
      isGuest: false,
      currency: 'BDT',
      status: 'ACTIVE',
      couponCode: null,
      notes: null,
      isB2B: false,
      b2bQuoteId: null,
      purchaseOrderRef: null,
      itemsCount: 3,
      subtotalPoisha: 2500000,
      subtotalBdtFormatted: '৳25,000.00',
      totalProductPoints: 200,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: [
        {
          id: 'cit_1',
          cartId: 'crt_multi_01',
          variantId: 'var_phone',
          sellerId: 'sel_walton',
          sellerName: 'Walton Official Store',
          productTitle: 'Walton Primo S8',
          variantTitle: 'Blue',
          sku: 'WLT-S8',
          quantity: 1,
          pricePoisha: 1850000,
          priceBdtFormatted: '৳18,500.00',
          productPoint: 150,
          subtotalPoisha: 1850000,
          subtotalBdtFormatted: '৳18,500.00',
          totalProductPoints: 150,
          inStock: true,
        },
        {
          id: 'cit_2',
          cartId: 'crt_multi_01',
          variantId: 'var_shoe_42',
          sellerId: 'sel_apex',
          sellerName: 'Apex Footwear Flagship',
          productTitle: 'Apex Leather Oxford Shoe',
          variantTitle: 'Size 42',
          sku: 'APX-SH-42',
          quantity: 2,
          pricePoisha: 325000,
          priceBdtFormatted: '৳3,250.00',
          productPoint: 25,
          subtotalPoisha: 650000,
          subtotalBdtFormatted: '৳6,500.00',
          totalProductPoints: 50,
          inStock: true,
        },
      ],
    };

    const grouped = await service.groupCartBySeller(multiVendorCart, 'DHAKA');

    expect(grouped.sellerGroupsCount).toBe(2);
    expect(grouped.sellerGroups[0].sellerName).toBe('Walton Official Store');
    expect(grouped.sellerGroups[0].packageNumber).toBe(1);
    expect(grouped.sellerGroups[0].items.length).toBe(1);

    expect(grouped.sellerGroups[1].sellerName).toBe('Apex Footwear Flagship');
    expect(grouped.sellerGroups[1].packageNumber).toBe(2);
    expect(grouped.sellerGroups[1].items.length).toBe(1);

    // Both qualify for free shipping (>= ৳2,000 threshold)
    expect(grouped.sellerGroups[0].constraints.qualifiesForFreeShipping).toBe(true);
    expect(grouped.sellerGroups[0].shippingFeePoisha).toBe(0);
    expect(grouped.sellerGroups[1].constraints.qualifiesForFreeShipping).toBe(true);
    expect(grouped.sellerGroups[1].shippingFeePoisha).toBe(0);

    expect(grouped.totalShippingFeePoisha).toBe(0);
    expect(grouped.grandTotalPoisha).toBe(2500000);
    expect(grouped.isReadyForCheckout).toBe(true);
  });

  it('calculates regional delivery fees when below free shipping threshold', async () => {
    const smallCart: CartDTO = {
      id: 'crt_small_01',
      userId: 'usr_buyer_01',
      isGuest: false,
      currency: 'BDT',
      status: 'ACTIVE',
      couponCode: null,
      notes: null,
      isB2B: false,
      b2bQuoteId: null,
      purchaseOrderRef: null,
      itemsCount: 1,
      subtotalPoisha: 50000, // ৳500.00 (< ৳2,000 threshold)
      subtotalBdtFormatted: '৳500.00',
      totalProductPoints: 5,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: [
        {
          id: 'cit_1',
          cartId: 'crt_small_01',
          variantId: 'var_sock',
          sellerId: 'sel_apex',
          sellerName: 'Apex Footwear Flagship',
          productTitle: 'Cotton Socks',
          variantTitle: 'Pack of 3',
          sku: 'APX-SCK',
          quantity: 1,
          pricePoisha: 50000,
          priceBdtFormatted: '৳500.00',
          productPoint: 5,
          subtotalPoisha: 50000,
          subtotalBdtFormatted: '৳500.00',
          totalProductPoints: 5,
          inStock: true,
        },
      ],
    };

    // Inside Dhaka: ৳60.00 shipping fee
    const dhakaGrouped = await service.groupCartBySeller(smallCart, 'DHAKA');
    expect(dhakaGrouped.sellerGroups[0].shippingFeePoisha).toBe(6000);
    expect(dhakaGrouped.sellerGroups[0].shippingFeeBdtFormatted).toBe('৳60.00');
    expect(dhakaGrouped.totalShippingFeePoisha).toBe(6000);
    expect(dhakaGrouped.grandTotalPoisha).toBe(56000); // 500 + 60 = ৳560.00

    // Outside Dhaka (Chittagong): ৳120.00 shipping fee
    const chittagongGrouped = await service.groupCartBySeller(smallCart, 'CHITTAGONG');
    expect(chittagongGrouped.sellerGroups[0].shippingFeePoisha).toBe(12000);
    expect(chittagongGrouped.sellerGroups[0].shippingFeeBdtFormatted).toBe('৳120.00');
    expect(chittagongGrouped.totalShippingFeePoisha).toBe(12000);
    expect(chittagongGrouped.grandTotalPoisha).toBe(62000); // 500 + 120 = ৳620.00
  });

  it('detects seller vacation mode and flags checkout readiness', async () => {
    const vacationCart: CartDTO = {
      id: 'crt_vac_01',
      userId: 'usr_buyer_01',
      isGuest: false,
      currency: 'BDT',
      status: 'ACTIVE',
      couponCode: null,
      notes: null,
      isB2B: false,
      b2bQuoteId: null,
      purchaseOrderRef: null,
      itemsCount: 1,
      subtotalPoisha: 150000,
      subtotalBdtFormatted: '৳1,500.00',
      totalProductPoints: 10,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: [
        {
          id: 'cit_1',
          cartId: 'crt_vac_01',
          variantId: 'var_craft',
          sellerId: 'sel_aarong',
          sellerName: 'Aarong Handcrafts',
          productTitle: 'Silk Scarf',
          variantTitle: 'Floral',
          sku: 'ARG-SCF',
          quantity: 1,
          pricePoisha: 150000,
          priceBdtFormatted: '৳1,500.00',
          productPoint: 10,
          subtotalPoisha: 150000,
          subtotalBdtFormatted: '৳1,500.00',
          totalProductPoints: 10,
          inStock: true,
        },
      ],
    };

    const grouped = await service.groupCartBySeller(vacationCart, 'DHAKA');

    expect(grouped.isReadyForCheckout).toBe(false);
    expect(grouped.warnings.length).toBeGreaterThan(0);
    expect(grouped.sellerGroups[0].constraints.vacationMode).toBe(true);
    expect(grouped.sellerGroups[0].constraints.vacationMessage).toBe(
      'Closed for Eid holidays until next week.'
    );
  });
});
