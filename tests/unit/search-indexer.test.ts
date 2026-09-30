import { describe, expect, it, beforeEach } from 'bun:test';
import { SearchIndexerService } from '@/features/search/services/search-indexer.service';
import { SearchIndexingWorker } from '@/features/search/workers/search-indexing.worker';
import { SearchDocument, SearchServiceInterface } from '@/features/search/types';

class MockSearchEngine implements SearchServiceInterface {
  public indexedDocs: SearchDocument[] = [];
  public deletedIds: string[] = [];

  public async search(): Promise<any> {
    return { hits: [], totalHits: 0 };
  }

  public async indexDocuments(documents: SearchDocument[]): Promise<{ indexed: number }> {
    this.indexedDocs.push(...documents);
    return { indexed: documents.length };
  }

  public async deleteDocuments(ids: string[]): Promise<{ deleted: number }> {
    this.deletedIds.push(...ids);
    return { deleted: ids.length };
  }

  public async checkHealth(): Promise<any> {
    return { status: 'HEALTHY' };
  }
}

class MockPrismaDb {
  public products: any[] = [];
  public variants: any[] = [];

  public product = {
    findFirst: async ({ where }: any) => {
      return (
        this.products.find(
          (p) => p.id === where.id && (where.deletedAt === null ? p.deletedAt === null : true)
        ) || null
      );
    },
    findMany: async ({ where, skip = 0, take = 50 }: any) => {
      const filtered = this.products.filter(
        (p) =>
          (where.status ? p.status === where.status : true) &&
          (where.deletedAt === null ? p.deletedAt === null : true)
      );
      return filtered.slice(skip, skip + take);
    },
  };

  public productVariant = {
    findFirst: async ({ where }: any) => {
      return this.variants.find((v) => v.id === where.id) || null;
    },
  };
}

describe('Milestone 112: Search Indexer & Incremental Sync Jobs Unit Tests', () => {
  let searchEngine: MockSearchEngine;
  let mockDb: MockPrismaDb;
  let indexerService: SearchIndexerService;
  let worker: SearchIndexingWorker;

  const getMockProduct = () => ({
    id: 'prod_walton_01',
    slug: 'walton-primo-s8',
    title: 'Walton Primo S8 Pro',
    titleBn: null,
    description: 'Smartphone with 64MP Camera',
    descriptionBn: null,
    status: 'PUBLISHED',
    basePricePoisha: BigInt(1850000), // 18,500.00 BDT
    productPoint: 150,
    tags: ['mobile', 'walton'],
    sellerId: 'sel_001',
    deletedAt: null,
    category: { name: 'Smartphones', slug: 'smartphones' },
    brand: { name: 'Walton' },
    seller: { profile: { storeName: 'Walton Official Store' } },
    variants: [
      {
        id: 'var_001',
        pricePoisha: BigInt(1850000),
        deletedAt: null,
        stockBalances: [{ onHand: 20, reserved: 2, damaged: 0, quarantined: 0 }],
      },
    ],
    translations: [
      {
        locale: 'bn-BD',
        title: 'ওয়ালটন প্রিমো এস৮ প্রো',
        description: 'স্মার্টফোন',
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(() => {
    searchEngine = new MockSearchEngine();
    mockDb = new MockPrismaDb();
    mockDb.products.push(getMockProduct());
    mockDb.variants.push({ id: 'var_001', productId: 'prod_walton_01' });

    indexerService = new SearchIndexerService(searchEngine, mockDb);
    worker = new SearchIndexingWorker(indexerService);
  });

  describe('1. Document Transformation', () => {
    it('transforms a published database product into a valid SearchDocument', async () => {
      const doc = await indexerService.buildProductSearchDocument('prod_walton_01');

      expect(doc).not.toBeNull();
      expect(doc?.id).toBe('prod_walton_01');
      expect(doc?.title).toBe('Walton Primo S8 Pro');
      expect(doc?.titleBn).toBe('ওয়ালটন প্রিমো এস৮ প্রো');
      expect(doc?.minPricePoisha).toBe(1850000);
      expect(doc?.maxPricePoisha).toBe(1850000);
      expect(doc?.currency).toBe('BDT');
      expect(doc?.inStock).toBe(true);
      expect(doc?.categoryName).toBe('Smartphones');
      expect(doc?.brand).toBe('Walton');
    });

    it('returns null for an unpublished DRAFT product', async () => {
      mockDb.products.push({
        ...getMockProduct(),
        id: 'prod_draft_02',
        status: 'DRAFT',
      });

      const doc = await indexerService.buildProductSearchDocument('prod_draft_02');
      expect(doc).toBeNull();
    });

    it('returns null for a deleted product', async () => {
      mockDb.products.push({
        ...getMockProduct(),
        id: 'prod_deleted_03',
        deletedAt: new Date(),
      });

      const doc = await indexerService.buildProductSearchDocument('prod_deleted_03');
      expect(doc).toBeNull();
    });
  });

  describe('2. Full Catalog Batch Reindexing', () => {
    it('iterates through published products and indexes them in batches', async () => {
      mockDb.products.push({
        ...getMockProduct(),
        id: 'prod_xiaomi_02',
        title: 'Xiaomi Redmi Buds 5',
      });

      const result = await indexerService.reindexAllPublishedProducts(1);

      expect(result.totalProcessed).toBe(2);
      expect(result.totalIndexed).toBe(2);
      expect(searchEngine.indexedDocs.length).toBe(2);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('3. Incremental Synchronization', () => {
    it('indexes published product and deletes unpublished product', async () => {
      // 1. Sync published product -> action: INDEXED
      const syncResult = await indexerService.syncProductIndex('prod_walton_01');
      expect(syncResult.action).toBe('INDEXED');
      expect(searchEngine.indexedDocs.length).toBe(1);

      // 2. Unpublish product and sync -> action: DELETED
      mockDb.products[0].status = 'ARCHIVED';
      const unpublishResult = await indexerService.syncProductIndex('prod_walton_01');
      expect(unpublishResult.action).toBe('DELETED');
      expect(searchEngine.deletedIds).toContain('prod_walton_01');
    });

    it('processes outbox events and syncs affected product indexes', async () => {
      const events = [
        {
          eventType: 'catalog.product_updated',
          payload: { productId: 'prod_walton_01' },
        },
        {
          eventType: 'inventory.stock_adjusted',
          payload: { variantId: 'var_001' },
        },
      ];

      const res = await indexerService.processOutboxEvents(events);
      expect(res.processed).toBe(2);
      expect(searchEngine.indexedDocs.length).toBe(1);
    });
  });

  describe('4. Worker Job Processing', () => {
    it('executes FULL_REINDEX and SYNC_PRODUCT worker jobs', async () => {
      const reindexJobResult = await worker.processJob({
        type: 'FULL_REINDEX',
        batchSize: 50,
      });
      expect(reindexJobResult.totalIndexed).toBe(1);

      const syncJobResult = await worker.processJob({
        type: 'SYNC_PRODUCT',
        productId: 'prod_walton_01',
      });
      expect(syncJobResult.action).toBe('INDEXED');
    });
  });
});
