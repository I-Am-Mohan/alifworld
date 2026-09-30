import { describe, expect, it, beforeEach } from 'bun:test';
import { CartService } from '@/features/cart/services/cart.service';
import { NotFoundError, ValidationError, AuthorizationError } from '@/shared/errors/app-error';

class MockPrismaCartDb {
  public carts: any[] = [];
  public cartItems: any[] = [];
  public variants: any[] = [];
  public products: any[] = [];
  public sellers: any[] = [];
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
      const item = this.cartItems.find((i) => {
        if (where.id && i.id !== where.id) return false;
        if (where.cartId && i.cartId !== where.cartId) return false;
        if (where.variantId && i.variantId !== where.variantId) return false;
        if (where.deletedAt === null && i.deletedAt !== null) return false;
        return true;
      });
      if (!item) return null;
      const cart = this.carts.find((c) => c.id === item.cartId);
      const variant = this.variants.find((v) => v.id === item.variantId);
      const seller = this.sellers.find((s) => s.id === item.sellerId);
      return { ...item, cart, variant, seller };
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
      const cart = this.carts.find((c) => c.id === item.cartId);
      if (cart) {
        cart.items = this.cartItems.filter((i) => i.cartId === cart.id && !i.deletedAt);
      }
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
      const cart = this.carts.find((c) => c.id === this.cartItems[idx].cartId);
      if (cart) {
        cart.items = this.cartItems.filter((i) => i.cartId === cart.id && !i.deletedAt);
      }
      return this.cartItems[idx];
    },
    updateMany: async ({ where, data }: any) => {
      let count = 0;
      for (let idx = 0; idx < this.cartItems.length; idx++) {
        if (
          where.cartId &&
          this.cartItems[idx].cartId === where.cartId &&
          !this.cartItems[idx].deletedAt
        ) {
          this.cartItems[idx] = { ...this.cartItems[idx], ...data };
          count++;
        }
      }
      return { count };
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

  public outboxEvent = {
    create: async ({ data }: any) => {
      this.outboxEvents.push(data);
      return data;
    },
  };
}

describe('Milestone 127: Shopping Cart & Safe Merge Domain Unit Tests', () => {
  let mockDb: MockPrismaCartDb;
  let service: CartService;

  const mockSeller = {
    id: 'sel_walton_01',
    businessName: 'Walton Official Flagship Store',
    slug: 'walton-flagship',
    status: 'VERIFIED',
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

  const mockVariant1 = {
    id: 'var_phone_blue',
    productId: 'prod_phone_01',
    title: 'Ocean Blue (8GB/128GB)',
    sku: 'WLT-S8-BLU',
    pricePoisha: BigInt(1850000), // 18,500.00 BDT
    productPoint: 150,
    isActive: true,
    deletedAt: null,
    product: mockProduct,
    stockBalances: [
      {
        onHand: 20,
        reserved: 2,
        damaged: 0,
        quarantined: 0,
        deletedAt: null,
      },
    ], // Available: 18
  };

  const mockVariant2 = {
    id: 'var_phone_black',
    productId: 'prod_phone_01',
    title: 'Midnight Black (8GB/128GB)',
    sku: 'WLT-S8-BLK',
    pricePoisha: BigInt(1850000),
    productPoint: 150,
    isActive: true,
    deletedAt: null,
    product: mockProduct,
    stockBalances: [
      {
        onHand: 5,
        reserved: 0,
        damaged: 0,
        quarantined: 0,
        deletedAt: null,
      },
    ], // Available: 5
  };

  beforeEach(() => {
    mockDb = new MockPrismaCartDb();
    service = new CartService();
    (service as any).db = mockDb;

    mockDb.sellers.push(mockSeller);
    mockDb.products.push(mockProduct);
    mockDb.variants.push(mockVariant1, mockVariant2);
  });

  describe('1. Guest Cart Creation & Item Management', () => {
    it('creates an ephemeral guest cart and snapshots price and Product Points', async () => {
      const result = await service.addItem({
        variantId: 'var_phone_blue',
        quantity: 2,
      });

      expect(result.guestCartToken).toBeDefined();
      expect(result.guestCartToken).toMatch(/^crt_gst_/);
      expect(result.cart.isGuest).toBe(true);
      expect(result.cart.items.length).toBe(1);

      const item = result.cart.items[0];
      expect(item.quantity).toBe(2);
      expect(item.pricePoisha).toBe(1850000);
      expect(item.productPoint).toBe(150);
      expect(item.subtotalPoisha).toBe(3700000);
      expect(item.totalProductPoints).toBe(300);
    });

    it('enforces stock availability limit upon item addition', async () => {
      // Variant 2 only has 5 available
      await expect(
        service.addItem({
          variantId: 'var_phone_black',
          quantity: 10, // Exceeds 5
        })
      ).rejects.toThrow(ValidationError);
    });

    it('updates item quantity and removes item on quantity 0', async () => {
      const added = await service.addItem({
        variantId: 'var_phone_blue',
        quantity: 1,
      });

      const itemId = added.cart.items[0].id;
      const guestToken = added.guestCartToken;

      // Update to 3
      const updated = await service.updateItemQuantity(itemId, 3, undefined, guestToken);
      expect(updated.items[0].quantity).toBe(3);

      // Remove by setting quantity 0
      const zeroed = await service.updateItemQuantity(itemId, 0, undefined, guestToken);
      expect(zeroed.items.length).toBe(0);
    });
  });

  describe('2. Authenticated Cart Operations', () => {
    it('adds item directly to customer account cart with independent points', async () => {
      const result = await service.addItem(
        {
          variantId: 'var_phone_blue',
          quantity: 1,
        },
        'usr_customer_101'
      );

      expect(result.cart.isGuest).toBe(false);
      expect(result.cart.userId).toBe('usr_customer_101');
      expect(result.cart.items[0].productPoint).toBe(150);
    });
  });

  describe('3. Safe Guest-to-Authenticated Cart Merge', () => {
    it('merges non-overlapping guest items into user cart and marks guest cart MERGED', async () => {
      // 1. Create guest cart with Variant 1 (qty 2)
      const guestRes = await service.addItem({
        variantId: 'var_phone_blue',
        quantity: 2,
      });
      const guestToken = guestRes.guestCartToken!;

      // 2. User has Variant 2 (qty 1) in their cart
      await service.addItem(
        {
          variantId: 'var_phone_black',
          quantity: 1,
        },
        'usr_customer_101'
      );

      // 3. Merge guest cart into user cart
      const mergeRes = await service.mergeGuestCart('usr_customer_101', guestToken);

      expect(mergeRes.mergedItemsCount).toBe(1);
      expect(mergeRes.userCart.items.length).toBe(2);

      // Verify guest cart status updated to MERGED
      const guestCartDb = mockDb.carts.find((c) => c.id === guestToken);
      expect(guestCartDb.status).toBe('MERGED');

      // Verify outbox event emitted
      expect(mockDb.outboxEvents.length).toBe(1);
      expect(mockDb.outboxEvents[0].eventType).toBe('cart.guest_merged');
    });

    it('deduplicates overlapping variants by summing quantities up to available stock', async () => {
      // 1. Guest has Variant 1 (qty 2)
      const guestRes = await service.addItem({
        variantId: 'var_phone_blue',
        quantity: 2,
      });
      const guestToken = guestRes.guestCartToken!;

      // 2. User already has Variant 1 (qty 3) in their cart
      await service.addItem(
        {
          variantId: 'var_phone_blue',
          quantity: 3,
        },
        'usr_customer_101'
      );

      // 3. Merge
      const mergeRes = await service.mergeGuestCart('usr_customer_101', guestToken);

      expect(mergeRes.userCart.items.length).toBe(1);
      expect(mergeRes.userCart.items[0].quantity).toBe(5); // 2 + 3 = 5 (within available stock of 18)
    });
  });

  describe('4. Cart Revalidation (Live Catalog & Price Drift Detection)', () => {
    it('detects live price change and re-snapshots updated BDT price with warning', async () => {
      const added = await service.addItem(
        {
          variantId: 'var_phone_blue',
          quantity: 1,
        },
        'usr_customer_101'
      );

      // Simulate seller changing price from 18,500 to 19,000 BDT in catalog
      const v = mockDb.variants.find((x) => x.id === 'var_phone_blue');
      v.pricePoisha = BigInt(1900000);

      const revalidation = await service.revalidateCart('usr_customer_101');

      expect(revalidation.hasChanges).toBe(true);
      expect(revalidation.priceChangesCount).toBe(1);
      expect(revalidation.warnings.length).toBe(1);
      expect(revalidation.cart.items[0].pricePoisha).toBe(1900000);
      expect(revalidation.cart.items[0].priceBdtFormatted).toBe('৳19,000.00');
    });
  });
});
