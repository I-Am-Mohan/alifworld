/**
 * AlifWorld Search Subsystem Domain Types & Contracts
 *
 * Defines the vendor-neutral SearchService interface, indexed document shapes,
 * query filter options, and degraded-mode resilience status.
 *
 * References:
 * - docs/architecture/scope-boundaries-and-domain-map.md
 * - docs/architecture/non-functional-requirements-and-slos.md
 * Invariants: ADR-0003, ADR-0004, ADR-0006, ADR-0022
 */

export interface SearchDocument {
  id: string;
  slug: string;
  title: string;
  titleBn?: string | null;
  description?: string | null;
  descriptionBn?: string | null;
  brand?: string | null;
  categoryName?: string | null;
  categorySlug?: string | null;
  sellerId: string;
  sellerName?: string | null;
  minPricePoisha: number; // Integer minor units (e.g. 150000 = 1500.00 BDT)
  maxPricePoisha: number; // Integer minor units
  currency: 'BDT';
  productPointSnapshot: number;
  inStock: boolean;
  tags: string[];
  rating?: number | null;
  reviewCount?: number | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SearchSortOption =
  'relevance' | 'price_asc' | 'price_desc' | 'newest' | 'rating' | 'points_desc';

export interface SearchQueryOptions {
  query: string;
  locale?: 'en-BD' | 'bn-BD';
  categorySlug?: string | null;
  brand?: string | null;
  brands?: string[] | null;
  sellerId?: string | null;
  minPricePoisha?: number;
  maxPricePoisha?: number;
  minRating?: number;
  minPoints?: number;
  inStockOnly?: boolean;
  tags?: string[] | null;
  sortBy?: SearchSortOption;
  page?: number;
  limit?: number;
}

export interface SearchFacets {
  categories: Record<string, number>;
  brands: Record<string, number>;
  ratings?: Record<string, number>;
  priceRanges?: {
    under500: number;
    from500to1000: number;
    from1000to5000: number;
    over5000: number;
  };
}

export interface SearchResponse {
  hits: SearchDocument[];
  totalHits: number;
  page: number;
  limit: number;
  totalPages: number;
  engine: 'meilisearch' | 'postgres_fallback';
  isDegraded: boolean;
  executionTimeMs: number;
  facets?: SearchFacets;
}

export interface SearchHealthStatus {
  status: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  primaryEngine: 'meilisearch';
  primaryAvailable: boolean;
  fallbackEngine: 'postgres';
  fallbackAvailable: boolean;
  activeEngine: 'meilisearch' | 'postgres_fallback';
  latencyMs?: number;
  details?: Record<string, any>;
  timestamp: string;
}

export interface SearchServiceInterface {
  /**
   * Performs full-text search with filtering, pagination, and facet aggregation.
   */
  search(options: SearchQueryOptions): Promise<SearchResponse>;

  /**
   * Bulk indexes or updates search documents.
   */
  indexDocuments(documents: SearchDocument[]): Promise<{ indexed: number; taskUid?: number }>;

  /**
   * Deletes documents from search index by IDs.
   */
  deleteDocuments(ids: string[]): Promise<{ deleted: number }>;

  /**
   * Checks search engine availability and reports degraded fallback mode.
   */
  checkHealth(): Promise<SearchHealthStatus>;
}
