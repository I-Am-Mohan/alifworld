import { describe, expect, it, beforeEach } from 'bun:test';
import { CartService } from '@/features/cart/services/cart.service';
import { ValidationError } from '@/shared/errors/app-error';

class MockPrismaComprehensiveCartDb {
  public carts: any[] = [];
  public cartItems: any[] = [];
  public variants: any[] = [];
  public products: any[] = [];
  public sellers: any[] = [];
  public discountRules: any[] = [];
  public quotes: any[] = [];
  public outboxEvents: any[] = [];

  public cart = {
    findFirst: async ({ where, include }: any) => {
      const c = this.carts.find((cart) => {
        if (where.id && cart.id !== where.id) return false;
        if (where.userId !== undefined && cart.userId !== where.userId) return false;
        if (where.status && cart.status !== where.status) return false;
        if (where.deletedAt === null && cart.deletedAt !== null) return false;
        return true;
      });
      if (!c) return null;
      if (include?.items) {
        const items = this.cartItems
          .filter((i) => i.cartId === c.id && !i.deletedAt)
          .map((i) => {
            const variant = this.variants.find((v) => v.id === i.variantId);
            const seller = this.sellers.find((s) => s.id === i.sellerId);
            return { ...i, variant, seller };
          });
        return { ...c, items };
      }
      return c;
    },
    create: async ({ data }: any) => {
      const cart = {
        ...data,
        currency: data.currency || 'BDT',
        status: data.status || 'ACTIVE',
        version: 1,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [],
      };
      this.carts.push(cart);
      return cart;
    },
    update: async ({ where, data }: any) => {
      const idx = this.carts.findIndex((c) => c.id === where.id);
      if (idx === -1) throw new Error('Not found');
      this.carts[idx] = {
        ...this.carts[idx],
        ...data,
        version: (this.carts[idx].version || 1) + 1,
        updatedAt: new Date(),
      };
      return this.carts[idx];
    },
  };

  public cartItem = {
    findFirst: async ({ where }: any) => {
      return (
        this.cartItems.find((i) => {
          if (where.id && i.id !== where.id) return false;
          if (where.cartId && i.cartId !== where.cartId) return false;
          if (where.variantId && i.variantId !== where.variantId) return false;
          if (where.deletedAt === null && i.deletedAt !== null) return false;
          return true;
        }) || null
      );
    },
    create: async ({ data }: any) => {
      const item = {
        ...data,
        version: 1,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.cartItems.push(item);
      return item;
    },
    update: async ({ where, data }: any) => {
      const idx = this.cartItems.findIndex((i) => i.id === where.id);
      if (idx === -1) throw new Error('Not found');
      this.cartItems[idx] = {
        ...this.cartItems[idx],
        ...data,
        version: (this.cartItems[idx].version || 1) + 1,
        updatedAt: new Date(),
      };
      return this.cartItems[idx];
    },
  };

  public productVariant = {
    findFirst: async ({ where }: any) => {
      return (
        this.variants.find((v) => {
          if (where.id && v.id !== where.id) return false;
          if (where.isActive !== undefined && v.isActive !== where.isActive) return false;
          if (where.deletedAt === null && v.deletedAt !== null) return false;
          return true;
        }) || null
      );
    },
  };

  public seller = {
    findFirst: async ({ where }: any) => {
      return this.sellers.find((s) => s.id === where.id && !s.deletedAt) || null;
    },
  };

  public discountRule = {
    findFirst: async ({ where }: any) => {
      return (
        this.discountRules.find((d) => {
          if (where.code && d.code !== where.code) return false;
          if (where.deletedAt === null && d.deletedAt !== null) return false;
          return true;
        }) || null
      );
    },
  };

  public b2bQuote = {
    findFirst: async ({ where }: any) => {
      return this.quotes.find((q) => q.id === where.id && !q.deletedAt) || null;
    },
  };

  public outboxEvent = {
    create: async ({ data }: any) => {
      this.outboxEvents.push(data);
      return data;
    },
  };
}

describe('Milestone 129: Multi-Dimensional Cart Revalidation Engine Unit Tests', () => {
  let mockDb: MockPrismaComprehensiveCartDb;
  let service: CartService;

  const mockSeller = {
    id: 'sel_walton_01',
    businessName: 'Walton Official Store',
    slug: 'walton-store',
    status: 'VERIFIED',
    operationalDefaults: {
      shippingMode: 'PLATFORM',
      defaultHandlingDays: 2,
    },
    settings: {
      vacationMode: false,
      vacationMessage: null as string | null,
    },
    deletedAt: null,
  };

  const mockProduct = {
    id: 'prod_phone_01',
    title: 'Walton Primo S8 Pro',
    slug: 'walton-primo-s8-pro',
    sellerId: 'sel_walton_01',
    status: 'PUBLISHED',
    currency: 'BDT',
    productPoint: 150,
    deletedAt: null,
    seller: mockSeller,
  };

  const mockVariant = {
    id: 'var_phone_blue',
    productId: 'prod_phone_01',
    title: 'Ocean Blue',
    sku: 'WLT-S8-BLU',
    pricePoisha: BigInt(1850000), // 18,500.00 BDT
    productPoint: 150,
    isActive: true,
    deletedAt: null,
    product: mockProduct,
    stockBalances: [
      {
        onHand: 10,
        reserved: 0,
        damaged: 0,
        quarantined: 0,
        deletedAt: null,
      },
    ], // Available: 10
  };

  beforeEach(() => {
    mockDb = new MockPrismaComprehensiveCartDb();
    service = new CartService();
    (service as any).db = mockDb;

    mockVariant.stockBalances[0].onHand = 10;
    mockVariant.pricePoisha = BigInt(1850000);
    mockVariant.productPoint = 150;
    mockSeller.settings.vacationMode = false;

    mockDb.sellers.push(mockSeller);
    mockDb.products.push(mockProduct);
    mockDb.variants.push(mockVariant);
  });

  describe('1. Stock & Inventory Revalidation', () => {
    it('adjusts quantity when warehouse stock decreases below cart quantity', async () => {
      // Add 5 to cart
      await service.addItem(
        { variantId: 'var_phone_blue', quantity: 5 },
        'usr_customer_01'
      );

      // Simulate warehouse available stock dropping to 2
      mockVariant.stockBalances[0].onHand = 2;

      const result = await service.revalidateCart('usr_customer_01');

      expect(result.hasChanges).toBe(true);
      expect(result.stockAdjustments.length).toBe(1);
      expect(result.stockAdjustments[0].requestedQuantity).toBe(5);
      expect(result.stockAdjustments[0].adjustedQuantity).toBe(2);
      expect(result.cart.items[0].quantity).toBe(2);
      expect(result.isReadyForCheckout).toBe(true);
    });

    it('soft-deletes item and blocks checkout when item goes out of stock', async () => {
      await service.addItem(
        { variantId: 'var_phone_blue', quantity: 3 },
        'usr_customer_01'
      );

      // Simulate item going completely out of stock
      mockVariant.stockBalances[0].onHand = 0;

      const result = await service.revalidateCart('usr_customer_01');

      expect(result.hasChanges).toBe(true);
      expect(result.outOfStockCount).toBe(1);
      expect(result.stockAdjustments[0].adjustedQuantity).toBe(0);
      expect(result.cart.items.length).toBe(0);
      expect(result.isReadyForCheckout).toBe(false);
    });
  });

  describe('2. Price Drift & Points Revalidation', () => {
    it('re-snapshots updated price and discrete Product Points when catalog changes', async () => {
      await service.addItem(
        { variantId: 'var_phone_blue', quantity: 1 },
        'usr_customer_01'
      );

      // Seller raises price from 18,500 to 19,500 and points from 150 to 200
      mockVariant.pricePoisha = BigInt(1950000);
      mockVariant.productPoint = 200;

      const result = await service.revalidateCart('usr_customer_01');

      expect(result.hasChanges).toBe(true);
      expect(result.priceChangesCount).toBe(1);
      expect(result.priceChanges[0].oldPricePoisha).toBe(1850000);
      expect(result.priceChanges[0].newPricePoisha).toBe(1950000);
      expect(result.cart.items[0].pricePoisha).toBe(1950000);
      expect(result.cart.items[0].productPoint).toBe(200);
    });
  });

  describe('3. Coupon Application, Validity & Expiration Revalidation', () => {
    it('applies valid discount coupon and calculates percentage discount', async () => {
      mockDb.discountRules.push({
        id: 'dr_welcome10',
        code: 'WELCOME10',
        title: '10% Welcome Discount',
        status: 'ACTIVE',
        discountType: 'PERCENTAGE',
        discountValue: '10',
        maxDiscountPoisha: BigInt(200000), // Max ৳2,000 off
        minOrderSubtotalPoisha: BigInt(500000), // Min ৳5,000 spend
        startsAt: new Date(Date.now() - 86400000),
        endsAt: new Date(Date.now() + 86400000),
        deletedAt: null,
      });

      await service.addItem(
        { variantId: 'var_phone_blue', quantity: 1 }, // ৳18,500
        'usr_customer_01'
      );

      const result = await service.applyCoupon('welcome10', 'usr_customer_01');

      expect(result.couponStatus.applied).toBe(true);
      expect(result.couponStatus.couponCode).toBe('WELCOME10');
      expect(result.couponStatus.discountPoisha).toBe(185000); // 10% of 1,850,000 = 185,000 poisha (৳1,850)
      expect(result.couponStatus.discountBdtFormatted).toBe('৳1,850.00');
    });

    it('removes coupon if subtotal drops below minimum order spend', async () => {
      mockDb.discountRules.push({
        id: 'dr_bigspend',
        code: 'BIGSPEND',
        title: 'Big Spend Discount',
        status: 'ACTIVE',
        discountType: 'FIXED_AMOUNT',
        discountValue: '50000', // ৳500 off
        minOrderSubtotalPoisha: BigInt(3000000), // Min ৳30,000 spend
        startsAt: new Date(Date.now() - 86400000),
        endsAt: new Date(Date.now() + 86400000),
        deletedAt: null,
      });

      // Cart subtotal is 18,500 BDT (< 30,000 BDT min spend)
      await service.addItem(
        { variantId: 'var_phone_blue', quantity: 1 },
        'usr_customer_01'
      );

      await expect(
        service.applyCoupon('BIGSPEND', 'usr_customer_01')
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('4. Seller Eligibility & Storefront Status Revalidation', () => {
    it('blocks checkout if seller enters vacation mode', async () => {
      await service.addItem(
        { variantId: 'var_phone_blue', quantity: 1 },
        'usr_customer_01'
      );

      // Seller turns on vacation mode
      mockSeller.settings.vacationMode = true;
      mockSeller.settings.vacationMessage = 'Store closed for maintenance.';

      const result = await service.revalidateCart('usr_customer_01');

      expect(result.isReadyForCheckout).toBe(false);
      expect(result.sellerIssues.length).toBe(1);
      expect(result.sellerIssues[0].issue).toBe('VACATION');
    });
  });
});
