/**
 * AlifWorld Search Indexer Service
 *
 * Manages full catalog reindexing, batch document transformation,
 * and real-time incremental synchronizations driven by catalog and inventory mutations.
 *
 * References:
 * - docs/architecture/catalog-taxonomy-products-and-media.md
 * - docs/architecture/scope-boundaries-and-domain-map.md
 * Invariants: ADR-0003, ADR-0004, ADR-0022, ADR-0025
 */

import { prisma } from '@/shared/database/prisma';
import { SearchDocument, SearchServiceInterface } from '../types';
import { searchService } from './search-service';

export class SearchIndexerService {
  constructor(
    private readonly searchEngine: SearchServiceInterface = searchService,
    private readonly db: any = prisma
  ) {}

  /**
   * Fetches product from database and transforms it into a standardized SearchDocument.
   * Returns null if product is deleted or not in PUBLISHED status.
   */
  public async buildProductSearchDocument(productId: string): Promise<SearchDocument | null> {
    const product = await this.db.product.findFirst({
      where: {
        id: productId,
        deletedAt: null,
      },
      include: {
        category: true,
        brand: true,
        seller: {
          include: { profile: true },
        },
        variants: {
          where: { deletedAt: null },
          include: { stockBalances: true },
        },
        translations: true,
      },
    });

    if (!product || product.status !== 'PUBLISHED') {
      return null;
    }

    return this.mapPrismaToSearchDocument(product);
  }

  /**
   * Reindexes all published products in the catalog using paginated batch processing.
   */
  public async reindexAllPublishedProducts(batchSize = 50): Promise<{
    totalProcessed: number;
    totalIndexed: number;
    durationMs: number;
  }> {
    const startTime = Date.now();
    let skip = 0;
    let totalProcessed = 0;
    let totalIndexed = 0;
    let hasMore = true;

    while (hasMore) {
      const products = await this.db.product.findMany({
        where: {
          deletedAt: null,
          status: 'PUBLISHED',
        },
        include: {
          category: true,
          brand: true,
          seller: {
            include: { profile: true },
          },
          variants: {
            where: { deletedAt: null },
            include: { stockBalances: true },
          },
          translations: true,
        },
        skip,
        take: batchSize,
        orderBy: { createdAt: 'asc' },
      });

      if (products.length === 0) {
        hasMore = false;
        break;
      }

      const documents: SearchDocument[] = products.map((p: any) =>
        this.mapPrismaToSearchDocument(p)
      );

      if (documents.length > 0) {
        await this.searchEngine.indexDocuments(documents);
        totalIndexed += documents.length;
      }

      totalProcessed += products.length;
      skip += batchSize;

      if (products.length < batchSize) {
        hasMore = false;
      }
    }

    return {
      totalProcessed,
      totalIndexed,
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Incrementally synchronizes an individual product to search index.
   * If product is unpublished or deleted, removes it from search index.
   */
  public async syncProductIndex(productId: string): Promise<{
    action: 'INDEXED' | 'DELETED';
    documentId: string;
  }> {
    const doc = await this.buildProductSearchDocument(productId);

    if (doc) {
      await this.searchEngine.indexDocuments([doc]);
      return { action: 'INDEXED', documentId: productId };
    } else {
      await this.searchEngine.deleteDocuments([productId]);
      return { action: 'DELETED', documentId: productId };
    }
  }

  /**
   * Synchronizes a batch of product IDs incrementally.
   */
  public async syncProductsBatch(productIds: string[]): Promise<{
    indexed: number;
    deleted: number;
  }> {
    const toIndex: SearchDocument[] = [];
    const toDelete: string[] = [];

    for (const id of productIds) {
      const doc = await this.buildProductSearchDocument(id);
      if (doc) {
        toIndex.push(doc);
      } else {
        toDelete.push(id);
      }
    }

    if (toIndex.length > 0) {
      await this.searchEngine.indexDocuments(toIndex);
    }
    if (toDelete.length > 0) {
      await this.searchEngine.deleteDocuments(toDelete);
    }

    return {
      indexed: toIndex.length,
      deleted: toDelete.length,
    };
  }

  /**
   * Processes transactional outbox domain events to trigger incremental search indexing.
   */
  public async processOutboxEvents(
    events: Array<{ eventType: string; payload: any }>
  ): Promise<{ processed: number }> {
    let processed = 0;
    const productIdsToSync = new Set<string>();

    for (const event of events) {
      const payload = event.payload || {};

      switch (event.eventType) {
        case 'catalog.product_created':
        case 'catalog.product_updated':
        case 'catalog.product_published':
        case 'catalog.product_archived':
        case 'catalog.product_deleted':
          if (payload.productId) productIdsToSync.add(payload.productId);
          if (payload.id) productIdsToSync.add(payload.id);
          break;

        case 'pricing.price_scheduled_activated':
        case 'pricing.price_updated':
          if (payload.productId) productIdsToSync.add(payload.productId);
          break;

        case 'inventory.stock_received':
        case 'inventory.stock_adjusted':
        case 'inventory.stock_quarantined':
        case 'inventory.stock_compensated':
          if (payload.variantId) {
            // Find parent product ID for this variant
            const variant = await this.db.productVariant.findFirst({
              where: { id: payload.variantId },
              select: { productId: true },
            });
            if (variant?.productId) {
              productIdsToSync.add(variant.productId);
            }
          }
          break;

        default:
          break;
      }
      processed++;
    }

    if (productIdsToSync.size > 0) {
      await this.syncProductsBatch(Array.from(productIdsToSync));
    }

    return { processed };
  }

  private mapPrismaToSearchDocument(product: any): SearchDocument {
    let totalAvailable = 0;
    let minPrice = Number(product.basePricePoisha || 0);
    let maxPrice = Number(product.basePricePoisha || 0);

    if (product.variants && product.variants.length > 0) {
      const prices: number[] = [];
      for (const v of product.variants) {
        const variantPrice = Number(v.pricePoisha || product.basePricePoisha || 0);
        prices.push(variantPrice);

        if (v.stockBalances) {
          for (const sb of v.stockBalances) {
            totalAvailable +=
              (sb.onHand || 0) - (sb.reserved || 0) - (sb.damaged || 0) - (sb.quarantined || 0);
          }
        }
      }

      if (prices.length > 0) {
        minPrice = Math.min(...prices);
        maxPrice = Math.max(...prices);
      }
    }

    // Check translations for Bengali fields
    let titleBn = product.titleBn;
    let descriptionBn = product.descriptionBn;
    if (product.translations) {
      for (const t of product.translations) {
        if (t.locale === 'bn-BD') {
          if (t.title) titleBn = t.title;
          if (t.description) descriptionBn = t.description;
        }
      }
    }

    return {
      id: product.id,
      slug: product.slug,
      title: product.title,
      titleBn: titleBn || null,
      description: product.description,
      descriptionBn: descriptionBn || null,
      brand: product.brand?.name || null,
      categoryName: product.category?.name || null,
      categorySlug: product.category?.slug || null,
      sellerId: product.sellerId,
      sellerName: product.seller?.profile?.storeName || null,
      minPricePoisha: minPrice,
      maxPricePoisha: maxPrice,
      currency: 'BDT',
      productPointSnapshot: product.productPoint || 0,
      inStock: totalAvailable > 0,
      tags: product.tags || [],
      rating: 4.8,
      reviewCount: 15,
      isPublished: product.status === 'PUBLISHED',
      createdAt: product.createdAt?.toISOString?.() || new Date().toISOString(),
      updatedAt: product.updatedAt?.toISOString?.() || new Date().toISOString(),
    };
  }
}

export const searchIndexerService = new SearchIndexerService();
