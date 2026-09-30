import { describe, expect, it, beforeEach } from 'bun:test';
import { DiscoveryLandingService } from '@/features/catalog/services/discovery-landing.service';
import { NotFoundError } from '@/shared/errors/app-error';
import { SearchServiceInterface } from '@/features/search/types';

class MockSearchEngine implements SearchServiceInterface {
  public async search(opts: any): Promise<any> {
    return {
      hits: [
        {
          id: 'prod_001',
          slug: 'walton-primo-s8',
          title: 'Walton Primo S8 Pro',
          brand: 'Walton',
          categoryName: 'Smartphones',
          categorySlug: opts.categorySlug || 'smartphones',
          minPricePoisha: 1850000,
          maxPricePoisha: 1850000,
          currency: 'BDT',
          productPointSnapshot: 150,
          inStock: true,
          tags: ['mobile'],
          isPublished: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      totalHits: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
      facets: {
        categories: { Smartphones: 1 },
        brands: { Walton: 1 },
      },
    };
  }
  public async indexDocuments(): Promise<any> {
    return { indexed: 0 };
  }
  public async deleteDocuments(): Promise<any> {
    return { deleted: 0 };
  }
  public async checkHealth(): Promise<any> {
    return { status: 'HEALTHY' };
  }
}

class MockPrismaDiscoveryDb {
  public categories: any[] = [];
  public brands: any[] = [];
  public collections: any[] = [];

  public category = {
    findFirst: async ({ where }: any) => {
      const match = this.categories.find(
        (c) => c.slug === where.slug && (where.deletedAt === null ? c.deletedAt === null : true)
      );
      if (!match) return null;

      let parent = null;
      if (match.parentId) {
        parent = this.categories.find((c) => c.id === match.parentId) || null;
      }

      const children = this.categories.filter((c) => c.parentId === match.id);

      return {
        ...match,
        parent,
        children,
      };
    },
  };

  public brand = {
    findFirst: async ({ where }: any) => {
      return this.brands.find((b) => b.slug === where.slug) || null;
    },
  };

  public collection = {
    findFirst: async ({ where }: any) => {
      return this.collections.find((col) => col.slug === where.slug) || null;
    },
  };
}

describe('Milestone 116: Category, Brand, and Collection Landing Discovery Unit Tests', () => {
  let searchEngine: MockSearchEngine;
  let mockDb: MockPrismaDiscoveryDb;
  let discoveryService: DiscoveryLandingService;

  beforeEach(() => {
    searchEngine = new MockSearchEngine();
    mockDb = new MockPrismaDiscoveryDb();

    // Seed Categories
    mockDb.categories = [
      {
        id: 'cat_electronics',
        name: 'Electronics',
        slug: 'electronics',
        parentId: null,
        isActive: true,
        deletedAt: null,
      },
      {
        id: 'cat_smartphones',
        name: 'Smartphones',
        nameBn: 'স্মার্টফোন',
        slug: 'smartphones',
        parentId: 'cat_electronics',
        isActive: true,
        deletedAt: null,
      },
      {
        id: 'cat_flagships',
        name: 'Flagship Phones',
        nameBn: 'ফ্ল্যাগশিপ ফোন',
        slug: 'flagship-phones',
        parentId: 'cat_smartphones',
        isActive: true,
        deletedAt: null,
      },
    ];

    // Seed Brands
    mockDb.brands = [
      {
        id: 'brd_walton',
        name: 'Walton',
        slug: 'walton',
        logoUrl: '/brands/walton.png',
        website: 'https://waltonbd.com',
        isVerified: true,
        isActive: true,
        deletedAt: null,
      },
    ];

    // Seed Collections
    mockDb.collections = [
      {
        id: 'col_eid_2026',
        name: 'Eid Mega Sale 2026',
        slug: 'eid-surge-2026',
        description: 'Special festive campaign discounts',
        collectionType: 'CAMPAIGN',
        status: 'PUBLISHED',
        isActive: true,
        deletedAt: null,
        products: [
          {
            product: {
              id: 'prod_001',
              slug: 'walton-primo-s8',
              title: 'Walton Primo S8 Pro',
              status: 'PUBLISHED',
              basePricePoisha: BigInt(1850000),
              productPoint: 150,
              deletedAt: null,
            },
          },
        ],
      },
    ];

    discoveryService = new DiscoveryLandingService(searchEngine, mockDb);
  });

  describe('1. Category Landing & Breadcrumb Hierarchy', () => {
    it('resolves multi-level parent breadcrumb hierarchy accurately', async () => {
      const result = await discoveryService.getCategoryLanding('smartphones');

      expect(result.category.slug).toBe('smartphones');
      expect(result.breadcrumbs.length).toBe(4);
      expect(result.breadcrumbs[0].label).toBe('Home');
      expect(result.breadcrumbs[1].label).toBe('Categories');
      expect(result.breadcrumbs[2].label).toBe('Electronics');
      expect(result.breadcrumbs[3].label).toBe('Smartphones');

      expect(result.subcategories.length).toBe(1);
      expect(result.subcategories[0].slug).toBe('flagship-phones');
      expect(result.products.length).toBe(1);
    });

    it('throws NotFoundError for non-existent category slug', async () => {
      expect(discoveryService.getCategoryLanding('unknown-category')).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('2. Brand Flagship Landing', () => {
    it('resolves verified brand profile and queries brand catalog', async () => {
      const result = await discoveryService.getBrandLanding('walton');

      expect(result.brand.slug).toBe('walton');
      expect(result.brand.isVerified).toBe(true);
      expect(result.brand.website).toBe('https://waltonbd.com');
      expect(result.products.length).toBe(1);
      expect(result.products[0].brand).toBe('Walton');
    });

    it('throws NotFoundError for non-existent brand slug', async () => {
      expect(discoveryService.getBrandLanding('unknown-brand')).rejects.toThrow(NotFoundError);
    });
  });

  describe('3. Collection Landing', () => {
    it('resolves promotional collection and member products', async () => {
      const result = await discoveryService.getCollectionLanding('eid-surge-2026');

      expect(result.collection.slug).toBe('eid-surge-2026');
      expect(result.collection.collectionType).toBe('CAMPAIGN');
      expect(result.products.length).toBe(1);
      expect(result.products[0].minPricePoisha).toBe(1850000);
    });

    it('throws NotFoundError for non-existent collection slug', async () => {
      expect(discoveryService.getCollectionLanding('unknown-col')).rejects.toThrow(NotFoundError);
    });
  });
});
