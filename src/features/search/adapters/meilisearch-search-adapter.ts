/**
 * AlifWorld Meilisearch Search Adapter
 * 
 * High-performance full-text search adapter leveraging Meilisearch.
 * Features typo-tolerance, facet aggregation, and timeout-guarded query dispatch.
 * 
 * References:
 * - docs/architecture/local-development-infrastructure-profiles.md
 * - docs/decisions/0004-non-functional-requirements-and-slos.md
 * Invariants: ADR-0003, ADR-0004, ADR-0022
 */

import { Meilisearch, Index } from 'meilisearch';
import {
  SearchDocument,
  SearchQueryOptions,
  SearchResponse,
  SearchHealthStatus,
  SearchServiceInterface,
  SearchFacets,
} from '../types';

export class MeilisearchSearchAdapter implements SearchServiceInterface {
  private client: Meilisearch | null = null;
  private indexName: string;
  private timeoutMs: number;

  constructor(options?: {
    host?: string;
    apiKey?: string;
    indexName?: string;
    timeoutMs?: number;
  }) {
    const host = options?.host || process.env.MEILISEARCH_HOST || 'http://localhost:7700';
    const apiKey = options?.apiKey || process.env.MEILISEARCH_API_KEY || process.env.MEILI_MASTER_KEY || '';
    const prefix = process.env.MEILISEARCH_INDEX_PREFIX || 'alifworld';

    this.indexName = options?.indexName || `${prefix}_products`;
    this.timeoutMs = options?.timeoutMs || 250; // ADR-0004: 250ms timeout threshold

    try {
      this.client = new Meilisearch({
        host,
        apiKey,
        timeout: this.timeoutMs,
      });
    } catch (err) {
      console.warn('Failed to initialize MeiliSearch client:', err);
      this.client = null;
    }
  }

  public async search(options: SearchQueryOptions): Promise<SearchResponse> {
    if (!this.client) {
      throw new Error('Meilisearch client is uninitialized');
    }

    const startTime = Date.now();
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(100, Math.max(1, options.limit ?? 20));
    const offset = (page - 1) * limit;

    const filters: string[] = ['isPublished = true'];

    if (options.categorySlug) {
      filters.push(`categorySlug = "${options.categorySlug}"`);
    }

    if (options.brand) {
      filters.push(`brand = "${options.brand}"`);
    }

    if (options.sellerId) {
      filters.push(`sellerId = "${options.sellerId}"`);
    }

    if (options.inStockOnly) {
      filters.push('inStock = true');
    }

    if (options.minPricePoisha !== undefined) {
      filters.push(`minPricePoisha >= ${options.minPricePoisha}`);
    }

    if (options.maxPricePoisha !== undefined) {
      filters.push(`maxPricePoisha <= ${options.maxPricePoisha}`);
    }

    const sort: string[] = [];
    if (options.sortBy === 'price_asc') {
      sort.push('minPricePoisha:asc');
    } else if (options.sortBy === 'price_desc') {
      sort.push('minPricePoisha:desc');
    } else if (options.sortBy === 'newest') {
      sort.push('createdAt:desc');
    } else if (options.sortBy === 'rating') {
      sort.push('rating:desc');
    }

    const searchPromise = this.client
      .index(this.indexName)
      .search(options.query || '', {
        offset,
        limit,
        filter: filters.length > 0 ? filters.join(' AND ') : undefined,
        sort: sort.length > 0 ? sort : undefined,
        facets: ['categoryName', 'brand'],
      });

    // Enforce 250ms SLA timeout
    const result: any = await this.withTimeout(searchPromise, this.timeoutMs);

    const hits: SearchDocument[] = (result.hits || []).map((h: any) => ({
      ...h,
      minPricePoisha: Number(h.minPricePoisha || 0),
      maxPricePoisha: Number(h.maxPricePoisha || 0),
    }));

    const totalHits = result.estimatedTotalHits ?? result.totalHits ?? hits.length;

    const facets = this.mapMeiliFacets(result.facetDistribution, hits);

    return {
      hits,
      totalHits,
      page,
      limit,
      totalPages: Math.ceil(totalHits / limit) || 1,
      engine: 'meilisearch',
      isDegraded: false,
      executionTimeMs: Date.now() - startTime,
      facets,
    };
  }

  public async indexDocuments(documents: SearchDocument[]): Promise<{ indexed: number; taskUid?: number }> {
    if (!this.client) {
      throw new Error('Meilisearch client is uninitialized');
    }

    const index = this.client.index(this.indexName);
    const task = await index.addDocuments(documents, { primaryKey: 'id' });

    return {
      indexed: documents.length,
      taskUid: task.taskUid,
    };
  }

  public async deleteDocuments(ids: string[]): Promise<{ deleted: number }> {
    if (!this.client) {
      throw new Error('Meilisearch client is uninitialized');
    }

    const index = this.client.index(this.indexName);
    await index.deleteDocuments(ids);

    return { deleted: ids.length };
  }

  public async checkHealth(): Promise<SearchHealthStatus> {
    const startTime = Date.now();
    if (!this.client) {
      return {
        status: 'DOWN',
        primaryEngine: 'meilisearch',
        primaryAvailable: false,
        fallbackEngine: 'postgres',
        fallbackAvailable: true,
        activeEngine: 'postgres_fallback',
        timestamp: new Date().toISOString(),
        details: { reason: 'Client uninitialized' },
      };
    }

    try {
      const health = await this.withTimeout(this.client.health(), this.timeoutMs);
      const isAvailable = (health as any)?.status === 'available';

      return {
        status: isAvailable ? 'HEALTHY' : 'DEGRADED',
        primaryEngine: 'meilisearch',
        primaryAvailable: isAvailable,
        fallbackEngine: 'postgres',
        fallbackAvailable: true,
        activeEngine: isAvailable ? 'meilisearch' : 'postgres_fallback',
        latencyMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        details: health as Record<string, any>,
      };
    } catch (err: any) {
      return {
        status: 'DEGRADED',
        primaryEngine: 'meilisearch',
        primaryAvailable: false,
        fallbackEngine: 'postgres',
        fallbackAvailable: true,
        activeEngine: 'postgres_fallback',
        latencyMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        details: { error: err.message },
      };
    }
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    let timer: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`Meilisearch request timed out after ${ms}ms`));
      }, ms);
    });

    return Promise.race([promise, timeoutPromise]).finally(() => {
      clearTimeout(timer);
    });
  }

  private mapMeiliFacets(facetDistribution: any, hits: SearchDocument[]): SearchFacets {
    const categories: Record<string, number> = facetDistribution?.categoryName || {};
    const brands: Record<string, number> = facetDistribution?.brand || {};

    let under500 = 0;
    let from500to1000 = 0;
    let from1000to5000 = 0;
    let over5000 = 0;

    for (const h of hits) {
      const bdtAmount = h.minPricePoisha / 100;
      if (bdtAmount < 500) under500++;
      else if (bdtAmount <= 1000) from500to1000++;
      else if (bdtAmount <= 5000) from1000to5000++;
      else over5000++;
    }

    return {
      categories,
      brands,
      priceRanges: {
        under500,
        from500to1000,
        from1000to5000,
        over5000,
      },
    };
  }
}
