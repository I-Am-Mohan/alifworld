import { describe, expect, it, beforeEach } from 'bun:test';
import { SellerStorefrontService } from '@/features/seller/services/seller-storefront.service';
import { NotFoundError } from '@/shared/errors/app-error';
import { SearchServiceInterface } from '@/features/search/types';

class MockSearchEngine implements SearchServiceInterface {
  public lastQueryOptions: any = null;

  public async search(opts: any): Promise<any> {
    this.lastQueryOptions = opts;
    return {
      hits: [
        {
          id: 'prod_walton_01',
          slug: 'walton-primo-s8',
          title: 'Walton Primo S8 Pro',
          brand: 'Walton',
          categoryName: 'Smartphones',
          sellerId: opts.sellerId,
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

class MockPrismaSellerDb {
  public sellers: any[] = [];

  public seller = {
    findFirst: async ({ where }: any) => {
      const match = this.sellers.find(
        (s) => s.slug === where.slug && (where.deletedAt === null ? s.deletedAt === null : true)
      );
      return match ? { ...match } : null;
    },
  };
}

describe('Milestone 118: Public Seller Storefront Unit Tests', () => {
  let searchEngine: MockSearchEngine;
  let mockDb: MockPrismaSellerDb;
  let service: SellerStorefrontService;

  const mockSeller = {
    id: 'sel_walton_001',
    businessName: 'Walton Official Store',
    slug: 'walton-official',
    status: 'VERIFIED',
    deletedAt: null,
    createdAt: new Date('2024-01-15'),
    settings: {
      logoUrl: '/walton-logo.png',
      bannerUrl: '/walton-banner.jpg',
      storeDescription: 'Official electronics manufacturer of Bangladesh',
      shippingPolicy: 'Express shipping within 48 hours nationwide.',
      returnPolicy: '7-day replacement warranty.',
      cancellationPolicy: 'Cancellations accepted before packaging.',
      publicEmailEnabled: true,
      publicPhoneEnabled: true,
      supportEmail: 'support@waltonbd.com',
      supportPhone: '+8801700000000',
      vacationMode: false,
      vacationMessage: null,
    },
  };

  beforeEach(() => {
    searchEngine = new MockSearchEngine();
    mockDb = new MockPrismaSellerDb();
    mockDb.sellers.push(mockSeller);
    service = new SellerStorefrontService(searchEngine, mockDb);
  });

  describe('1. Storefront Resolution and Tenant Scoping', () => {
    it('resolves active verified seller profile and policies', async () => {
      const result = await service.getPublicStorefront('walton-official');

      expect(result.store.id).toBe('sel_walton_001');
      expect(result.store.businessName).toBe('Walton Official Store');
      expect(result.store.isVerified).toBe(true);
      expect(result.store.supportEmail).toBe('support@waltonbd.com');
      expect(result.store.shippingPolicy).toContain('48 hours');
    });

    it('enforces sellerId filter in search query to guarantee tenant containment', async () => {
      await service.getPublicStorefront('walton-official');

      // Crucial: sellerId MUST be scoped inside query options
      expect(searchEngine.lastQueryOptions).not.toBeNull();
      expect(searchEngine.lastQueryOptions.sellerId).toBe('sel_walton_001');
    });

    it('returns vacation mode banner data when merchant sets vacation mode', async () => {
      mockDb.sellers[0].settings.vacationMode = true;
      mockDb.sellers[0].settings.vacationMessage = 'Closed for Eid holidays until Tuesday.';

      const result = await service.getPublicStorefront('walton-official');
      expect(result.store.vacationMode).toBe(true);
      expect(result.store.vacationMessage).toBe('Closed for Eid holidays until Tuesday.');
    });
  });

  describe('2. Negative Authorization & Inactive Store Rejection', () => {
    it('throws NotFoundError for non-existent seller slug', async () => {
      expect(service.getPublicStorefront('unknown-store')).rejects.toThrow(NotFoundError);
    });

    it('throws NotFoundError when seller is SUSPENDED', async () => {
      mockDb.sellers[0].status = 'SUSPENDED';
      expect(service.getPublicStorefront('walton-official')).rejects.toThrow(NotFoundError);
    });

    it('throws NotFoundError when seller is RESTRICTED', async () => {
      mockDb.sellers[0].status = 'RESTRICTED';
      expect(service.getPublicStorefront('walton-official')).rejects.toThrow(NotFoundError);
    });
  });
});
