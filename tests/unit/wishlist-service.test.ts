import { describe, expect, it, beforeEach } from 'bun:test';
import { WishlistService } from '@/features/customers/services/wishlist.service';
import { NotFoundError, AuthorizationError, ConflictError } from '@/shared/errors/app-error';

class MockPrismaWishlistDb {
  public products: any[] = [];
  public users: any[] = [];
  public outboxEvents: any[] = [];

  public product = {
    findFirst: async ({ where }: any) => {
      return this.products.find((p) => p.id === where.id) || null;
    },
  };

  public user = {
    findFirst: async ({ where }: any) => {
      return this.users.find((u) => u.id === where.id) || null;
    },
  };

  public outboxEvent = {
    create: async ({ data }: any) => {
      this.outboxEvents.push(data);
      return data;
    },
  };
}

describe('Milestone 123: Wishlists and Share-Safe Links Unit Tests', () => {
  let mockDb: MockPrismaWishlistDb;
  let service: WishlistService;

  const mockProduct = {
    id: 'prod_walton_01',
    slug: 'walton-primo-s8',
    title: 'Walton Primo S8 Pro',
    titleBn: 'ওয়ালটন প্রিমো এস৮ প্���ো',
    basePricePoisha: BigInt(1850000), // 18,500.00 BDT
    productPoint: 150,
    sku: 'WLT-S8-001',
    media: [{ mediaUrl: '/walton.jpg', displayOrder: 1 }],
    variants: [
      {
        id: 'var_blue_128',
        sku: 'WLT-S8-BLU',
        title: 'Ocean Blue',
        pricePoisha: BigInt(1850000),
        productPoint: 150,
      },
    ],
    translations: [],
    deletedAt: null,
  };

  beforeEach(() => {
    mockDb = new MockPrismaWishlistDb();
    mockDb.products.push(mockProduct);
    mockDb.users.push({
      id: 'usr_customer_01',
      name: 'Rahim Ahmed',
      email: 'rahim@secret.com',
      phone: '+8801711223344',
    });
    service = new WishlistService(mockDb);
  });

  describe('1. Wishlist Creation & Default Initialization', () => {
    it('automatically initializes a default "My Favorites" wishlist for new customer', async () => {
      const lists = await service.listCustomerWishlists('usr_customer_01');

      expect(lists.length).toBe(1);
      expect(lists[0].title).toBe('My Favorites');
      expect(lists[0].isDefault).toBe(true);
      expect(lists[0].visibility).toBe('PRIVATE');
    });

    it('creates a custom named wishlist', async () => {
      const custom = await service.createWishlist('usr_customer_01', {
        title: 'Eid Shopping List 2026',
        description: 'Gifts for family',
      });

      expect(custom.id).toBeDefined();
      expect(custom.title).toBe('Eid Shopping List 2026');
      expect(custom.isDefault).toBe(false);

      const all = await service.listCustomerWishlists('usr_customer_01');
      expect(all.length).toBe(2);
    });
  });

  describe('2. Item Management & Snapshots', () => {
    it('adds product to wishlist with price and points snapshots', async () => {
      const defaultList = await service.getDefaultWishlist('usr_customer_01');

      const { wishlist, item } = await service.addItemToWishlist(
        'usr_customer_01',
        defaultList.id,
        {
          productId: 'prod_walton_01',
          variantId: 'var_blue_128',
          notes: 'Buy when discount is live',
        }
      );

      expect(wishlist.itemCount).toBe(1);
      expect(item.productTitle).toBe('Walton Primo S8 Pro');
      expect(item.variantTitle).toBe('Ocean Blue');
      expect(item.pricePoisha).toBe(1850000);
      expect(item.priceBdtFormatted).toBe('18,500.00');
      expect(item.productPoint).toBe(150);
      expect(item.notes).toBe('Buy when discount is live');
    });

    it('removes an item from wishlist', async () => {
      const defaultList = await service.getDefaultWishlist('usr_customer_01');
      const { item } = await service.addItemToWishlist('usr_customer_01', defaultList.id, {
        productId: 'prod_walton_01',
      });

      const updated = await service.removeItemFromWishlist(
        'usr_customer_01',
        defaultList.id,
        item.id
      );

      expect(updated.itemCount).toBe(0);
      expect(updated.items.length).toBe(0);
    });
  });

  describe('3. Ownership and Deletion Safeguards', () => {
    it('prevents customer B from viewing or mutating customer A wishlist', async () => {
      const defaultList = await service.getDefaultWishlist('usr_customer_01');

      expect(
        service.getWishlistById('usr_stranger_99', defaultList.id)
      ).rejects.toThrow(AuthorizationError);

      expect(
        service.addItemToWishlist('usr_stranger_99', defaultList.id, {
          productId: 'prod_walton_01',
        })
      ).rejects.toThrow(AuthorizationError);
    });

    it('prevents deleting primary default wishlist', async () => {
      const defaultList = await service.getDefaultWishlist('usr_customer_01');

      expect(
        service.deleteWishlist('usr_customer_01', defaultList.id)
      ).rejects.toThrow(ConflictError);
    });

    it('allows deleting custom wishlist', async () => {
      const custom = await service.createWishlist('usr_customer_01', {
        title: 'Temporary Gadget List',
      });

      const res = await service.deleteWishlist('usr_customer_01', custom.id);
      expect(res.success).toBe(true);

      const all = await service.listCustomerWishlists('usr_customer_01');
      expect(all.length).toBe(1);
    });
  });

  describe('4. Share-Safe Links and PII Protection', () => {
    it('generates cryptographic share token and resolves public view with zero PII', async () => {
      const custom = await service.createWishlist('usr_customer_01', {
        title: 'Wedding Registry List',
      });

      await service.addItemToWishlist('usr_customer_01', custom.id, {
        productId: 'prod_walton_01',
      });

      // Generate share-safe link
      const { shareToken, shareUrl } = await service.generateShareLink(
        'usr_customer_01',
        custom.id
      );

      expect(shareToken).toBeDefined();
      expect(shareUrl).toContain(shareToken);

      // Public viewer resolves shared wishlist
      const sharedView = await service.getSharedWishlist(shareToken);

      expect(sharedView.title).toBe('Wedding Registry List');
      expect(sharedView.itemCount).toBe(1);
      expect(sharedView.ownerDisplayName).toBe('Rahim A.'); // Minimized name

      // CRITICAL PII INVARIANT: Zero customer email, phone, or raw userId exposed
      expect((sharedView as any).email).toBeUndefined();
      expect((sharedView as any).phone).toBeUndefined();
      expect((sharedView as any).userId).toBeUndefined();
    });

    it('revokes share link and denies public access with AuthorizationError', async () => {
      const custom = await service.createWishlist('usr_customer_01', {
        title: 'Secret Birthday Wishlist',
      });

      const { shareToken } = await service.generateShareLink('usr_customer_01', custom.id);

      // Revoke the share link
      await service.revokeShareLink('usr_customer_01', custom.id);

      // Subsequent public lookup must fail
      expect(service.getSharedWishlist(shareToken)).rejects.toThrow(NotFoundError);
    });
  });
});
