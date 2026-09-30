import { describe, expect, it, beforeEach } from 'bun:test';
import { ProductDetailService } from '@/features/catalog/services/product-detail.service';
import { NotFoundError } from '@/shared/errors/app-error';

class MockPrismaProductDb {
  public products: any[] = [];
  public slugHistory: any[] = [];

  public product = {
    findFirst: async ({ where }: any) => {
      const match = this.products.find((p) => {
        const matchesIdentifier =
          (where.slug && p.slug === where.slug) ||
          (where.id && p.id === where.id) ||
          (where.OR &&
            where.OR.some(
              (clause: any) =>
                (clause.slug && p.slug === clause.slug) || (clause.id && p.id === clause.id)
            ));
        const matchesDeleted = where.deletedAt === null ? p.deletedAt === null : true;
        return matchesIdentifier && matchesDeleted;
      });
      return match ? { ...match } : null;
    },
  };

  public productSlugHistory = {
    findFirst: async ({ where }: any) => {
      const historyMatch = this.slugHistory.find((h) => h.oldSlug === where.oldSlug);
      if (!historyMatch) return null;

      const product = this.products.find((p) => p.id === historyMatch.productId);
      return {
        ...historyMatch,
        product,
      };
    },
  };
}

describe('Milestone 117: Localized Product Detail & Variant Selection Unit Tests', () => {
  let mockDb: MockPrismaProductDb;
  let service: ProductDetailService;

  const mockProduct = {
    id: 'prod_walton_01',
    slug: 'walton-primo-s8',
    title: 'Walton Primo S8 Pro',
    titleBn: 'ওয়ালটন প্রিমো এস৮ প্রো',
    description: 'Flagship smartphone',
    descriptionBn: 'ফ্ল্যাগশিপ স্মার্টফোন',
    status: 'PUBLISHED',
    basePricePoisha: BigInt(1850000), // 18,500.00 BDT
    compareAtPricePoisha: BigInt(2050000), // 20,500.00 BDT
    productPoint: 150,
    minOrderQuantity: 1,
    warranty: '1 Year Brand Warranty',
    tags: ['mobile', 'walton'],
    sellerId: 'sel_walton_01',
    deletedAt: null,
    category: {
      id: 'cat_01',
      name: 'Smartphones',
      nameBn: 'স্মার্টফোন',
      slug: 'smartphones',
      parent: {
        id: 'cat_root',
        name: 'Electronics',
        nameBn: 'ইলেকট্রনিক্স',
        slug: 'electronics',
      },
    },
    brand: {
      id: 'brd_01',
      name: 'Walton',
      slug: 'walton',
      isVerified: true,
      logoUrl: '/walton.png',
    },
    seller: {
      profile: {
        storeName: 'Walton Official Store',
        slug: 'walton-official',
      },
    },
    variants: [
      {
        id: 'var_blue_128',
        sku: 'WLT-S8-BLU-128',
        title: 'Ocean Blue / 128GB',
        pricePoisha: BigInt(1850000),
        compareAtPricePoisha: BigInt(2050000),
        productPoint: 150,
        option1Name: 'Color',
        option1Value: 'Ocean Blue',
        option2Name: 'Storage',
        option2Value: '128GB',
        deletedAt: null,
        stockBalances: [
          {
            onHand: 15,
            reserved: 3,
            damaged: 0,
            quarantined: 0,
          },
        ],
      },
      {
        id: 'var_black_256',
        sku: 'WLT-S8-BLK-256',
        title: 'Midnight Black / 256GB',
        pricePoisha: BigInt(2150000),
        compareAtPricePoisha: null,
        productPoint: 180,
        option1Name: 'Color',
        option1Value: 'Midnight Black',
        option2Name: 'Storage',
        option2Value: '256GB',
        deletedAt: null,
        stockBalances: [
          {
            onHand: 0,
            reserved: 0,
            damaged: 0,
            quarantined: 0,
          },
        ],
      },
    ],
    media: [
      {
        id: 'med_01',
        mediaUrl: '/walton-front.jpg',
        isPrimary: true,
        altText: 'Front View',
      },
    ],
    translations: [],
  };

  beforeEach(() => {
    mockDb = new MockPrismaProductDb();
    mockDb.products = [{ ...mockProduct }];
    mockDb.slugHistory = [
      {
        id: 'hist_01',
        productId: 'prod_walton_01',
        oldSlug: 'walton-primo-s8-2025-edition',
      },
    ];
    service = new ProductDetailService(mockDb);
  });

  describe('1. Direct Product Slug Resolution', () => {
    it('resolves product with formatted pricing, discrete points, variants, and stock balances', async () => {
      const result = (await service.getProductBySlug('walton-primo-s8')) as any;

      expect(result.isRedirect).toBeFalsy();
      expect(result.id).toBe('prod_walton_01');
      expect(result.basePricePoisha).toBe(1850000);
      expect(result.basePriceBdtFormatted).toBe('18,500.00');
      expect(result.productPoint).toBe(150);
      expect(result.brand?.isVerified).toBe(true);

      // Verify Variant 1 (In Stock)
      const var1 = result.variants[0];
      expect(var1.sku).toBe('WLT-S8-BLU-128');
      expect(var1.pricePoisha).toBe(1850000);
      expect(var1.availableQuantity).toBe(12); // 15 - 3 = 12
      expect(var1.inStock).toBe(true);

      // Verify Variant 2 (Out of Stock)
      const var2 = result.variants[1];
      expect(var2.sku).toBe('WLT-S8-BLK-256');
      expect(var2.availableQuantity).toBe(0);
      expect(var2.inStock).toBe(false);

      // Verify Breadcrumbs
      expect(result.breadcrumbs.length).toBe(5);
      expect(result.breadcrumbs[3].label).toBe('Smartphones');

      // Verify Schema.org JSON-LD
      expect(result.jsonLd['@type']).toBe('Product');
      expect(result.jsonLd.offers.priceCurrency).toBe('BDT');
    });

    it('deep-localizes title and description for bn-BD locale', async () => {
      const resultBn = (await service.getProductBySlug('walton-primo-s8', 'bn-BD')) as any;

      expect(resultBn.title).toBe('Walton Primo S8 Pro');
      expect(resultBn.titleBn).toBe('ওয়ালটন প্রিমো এস৮ প্রো');
      expect(resultBn.breadcrumbs[0].label).toBe('হোম');
    });
  });

  describe('2. Historical Slug Redirect (SEO Preservation)', () => {
    it('returns a permanent redirect directive when querying an old slug', async () => {
      const redirectResult = (await service.getProductBySlug(
        'walton-primo-s8-2025-edition'
      )) as any;

      expect(redirectResult.isRedirect).toBe(true);
      expect(redirectResult.targetSlug).toBe('walton-primo-s8');
      expect(redirectResult.targetUrl).toBe('/products/walton-primo-s8');
    });

    it('throws NotFoundError for non-existent slug and history', async () => {
      expect(service.getProductBySlug('completely-unknown-phone')).rejects.toThrow(NotFoundError);
    });

    it('throws NotFoundError when product is in DRAFT status', async () => {
      mockDb.products[0].status = 'DRAFT';
      expect(service.getProductBySlug('walton-primo-s8')).rejects.toThrow(NotFoundError);
    });
  });
});
