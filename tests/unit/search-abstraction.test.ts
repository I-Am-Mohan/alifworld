import { describe, expect, it, beforeEach } from 'bun:test';
import {
  SearchDocument,
  SearchServiceInterface,
  SearchResponse,
  SearchHealthStatus,
} from '@/features/search/types';
import { PostgresSearchAdapter } from '@/features/search/adapters/postgres-search-adapter';
import { ResilientSearchService } from '@/features/search/services/search-service';

describe('Milestone 111: Search Abstraction & Boot-Safe Fallback Unit Tests', () => {
  const sampleProducts: SearchDocument[] = [
    {
      id: 'prod_walton_01',
      slug: 'walton-primo-s8',
      title: 'Walton Primo S8 Pro Smartphone',
      titleBn: 'ওয়ালটন প্রিমো এস৮ প্রো স্মার্টফোন',
      description: 'High performance gaming phone with 128GB ROM and 64MP Camera',
      descriptionBn: 'উচ্চ ক্ষমতাসম্পন্ন গেমিং ফোন',
      brand: 'Walton',
      categoryName: 'Smartphones',
      categorySlug: 'smartphones',
      sellerId: 'sel_walton_direct',
      sellerName: 'Walton Official Store',
      minPricePoisha: 1850000, // 18,500.00 BDT
      maxPricePoisha: 1850000,
      currency: 'BDT',
      productPointSnapshot: 150,
      inStock: true,
      tags: ['mobile', 'walton', 'bangladesh', 'smartphone'],
      rating: 4.8,
      reviewCount: 42,
      isPublished: true,
      createdAt: '2026-09-20T10:00:00.000Z',
      updatedAt: '2026-09-20T10:00:00.000Z',
    },
    {
      id: 'prod_xiaomi_02',
      slug: 'xiaomi-redmi-buds-5',
      title: 'Xiaomi Redmi Buds 5 Pro',
      titleBn: 'শাওমি রেডমি বাডস ৫ প্রো',
      description: 'ANC wireless noise cancelling earbuds with deep bass',
      descriptionBn: 'অ্যাক্টিভ নয়েজ ক্যানসেলিং ইয়ারবাডস',
      brand: 'Xiaomi',
      categoryName: 'Audio & Wearables',
      categorySlug: 'audio-wearables',
      sellerId: 'sel_xiaomi_bd',
      sellerName: 'Xiaomi Bangladesh',
      minPricePoisha: 650000, // 6,500.00 BDT
      maxPricePoisha: 650000,
      currency: 'BDT',
      productPointSnapshot: 50,
      inStock: true,
      tags: ['audio', 'earbuds', 'wireless', 'anc'],
      rating: 4.6,
      reviewCount: 18,
      isPublished: true,
      createdAt: '2026-09-22T10:00:00.000Z',
      updatedAt: '2026-09-22T10:00:00.000Z',
    },
    {
      id: 'prod_cotton_shirt_03',
      slug: 'aarong-cotton-panjabi',
      title: 'Aarong Premium Cotton Panjabi',
      titleBn: 'আড়ং প্রিমিয়াম কটন পাঞ্জাবি',
      description: 'Traditional Bangladeshi handcrafted cotton panjabi for festive occasions',
      descriptionBn: 'হস্তশিল্পের কটন পাঞ্জাবি',
      brand: 'Aarong',
      categoryName: 'Fashion',
      categorySlug: 'fashion',
      sellerId: 'sel_aarong_bd',
      sellerName: 'Aarong Lifestyle',
      minPricePoisha: 320000, // 3,200.00 BDT
      maxPricePoisha: 320000,
      currency: 'BDT',
      productPointSnapshot: 30,
      inStock: false, // Out of stock!
      tags: ['fashion', 'eid', 'panjabi', 'aarong'],
      rating: 4.9,
      reviewCount: 95,
      isPublished: true,
      createdAt: '2026-09-24T10:00:00.000Z',
      updatedAt: '2026-09-24T10:00:00.000Z',
    },
  ];

  describe('1. PostgreSQL Fallback Search Adapter', () => {
    let postgresAdapter: PostgresSearchAdapter;

    beforeEach(() => {
      postgresAdapter = new PostgresSearchAdapter(sampleProducts);
    });

    it('matches keyword search in English title', async () => {
      const res = await postgresAdapter.search({ query: 'Walton' });
      expect(res.hits.length).toBe(1);
      expect(res.hits[0].id).toBe('prod_walton_01');
      expect(res.engine).toBe('postgres_fallback');
      expect(res.isDegraded).toBe(true);
    });

    it('matches keyword search in Bengali title (titleBn)', async () => {
      const res = await postgresAdapter.search({ query: 'শাওমি' });
      expect(res.hits.length).toBe(1);
      expect(res.hits[0].id).toBe('prod_xiaomi_02');
    });

    it('filters by categorySlug', async () => {
      const res = await postgresAdapter.search({ query: '', categorySlug: 'fashion' });
      expect(res.hits.length).toBe(1);
      expect(res.hits[0].id).toBe('prod_cotton_shirt_03');
    });

    it('filters by brand and inStockOnly', async () => {
      const allAarong = await postgresAdapter.search({ query: '', brand: 'Aarong' });
      expect(allAarong.hits.length).toBe(1);

      const inStockAarong = await postgresAdapter.search({
        query: '',
        brand: 'Aarong',
        inStockOnly: true,
      });
      expect(inStockAarong.hits.length).toBe(0); // Aarong panjabi is out of stock
    });

    it('filters by price range in integer poisha', async () => {
      // Products between 5,000 BDT (500000 poisha) and 10,000 BDT (1000000 poisha)
      const res = await postgresAdapter.search({
        query: '',
        minPricePoisha: 500000,
        maxPricePoisha: 1000000,
      });

      expect(res.hits.length).toBe(1);
      expect(res.hits[0].id).toBe('prod_xiaomi_02');
    });

    it('sorts results by price ascending and descending', async () => {
      const asc = await postgresAdapter.search({ query: '', sortBy: 'price_asc' });
      expect(asc.hits[0].id).toBe('prod_cotton_shirt_03'); // 3,200 BDT
      expect(asc.hits[asc.hits.length - 1].id).toBe('prod_walton_01'); // 18,500 BDT

      const desc = await postgresAdapter.search({ query: '', sortBy: 'price_desc' });
      expect(desc.hits[0].id).toBe('prod_walton_01');
      expect(desc.hits[desc.hits.length - 1].id).toBe('prod_cotton_shirt_03');
    });

    it('computes accurate facet aggregation counts', async () => {
      const res = await postgresAdapter.search({ query: '' });
      expect(res.facets).toBeDefined();
      expect(res.facets?.brands['Walton']).toBe(1);
      expect(res.facets?.brands['Xiaomi']).toBe(1);
      expect(res.facets?.brands['Aarong']).toBe(1);
      expect(res.facets?.categories['Smartphones']).toBe(1);
      expect(res.facets?.categories['Fashion']).toBe(1);
    });

    it('reports health status as DEGRADED with fallbackAvailable: true', async () => {
      const health = await postgresAdapter.checkHealth();
      expect(health.status).toBe('DEGRADED');
      expect(health.primaryAvailable).toBe(false);
      expect(health.fallbackAvailable).toBe(true);
      expect(health.activeEngine).toBe('postgres_fallback');
    });
  });

  describe('2. ResilientSearchService Circuit Breaker & Automatic Fallback', () => {
    let mockPostgres: PostgresSearchAdapter;

    beforeEach(() => {
      mockPostgres = new PostgresSearchAdapter(sampleProducts);
    });

    it('returns Meilisearch results when primary engine is healthy', async () => {
      const mockMeili: SearchServiceInterface = {
        search: async () => ({
          hits: sampleProducts.slice(0, 1),
          totalHits: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
          engine: 'meilisearch',
          isDegraded: false,
          executionTimeMs: 12,
        }),
        indexDocuments: async () => ({ indexed: 1 }),
        deleteDocuments: async () => ({ deleted: 1 }),
        checkHealth: async () => ({
          status: 'HEALTHY',
          primaryEngine: 'meilisearch',
          primaryAvailable: true,
          fallbackEngine: 'postgres',
          fallbackAvailable: true,
          activeEngine: 'meilisearch',
          timestamp: new Date().toISOString(),
        }),
      };

      const resilientService = new ResilientSearchService(mockMeili, mockPostgres);
      const res = await resilientService.search({ query: 'Walton' });

      expect(res.engine).toBe('meilisearch');
      expect(res.isDegraded).toBe(false);

      const health = await resilientService.checkHealth();
      expect(health.status).toBe('HEALTHY');
      expect(health.activeEngine).toBe('meilisearch');
    });

    it('seamlessly falls back to Postgres adapter when Meilisearch throws network error', async () => {
      const failingMeili: SearchServiceInterface = {
        search: async () => {
          throw new Error('connect ECONNREFUSED 127.0.0.1:7700');
        },
        indexDocuments: async () => {
          throw new Error('Meilisearch unavailable');
        },
        deleteDocuments: async () => {
          throw new Error('Meilisearch unavailable');
        },
        checkHealth: async () => {
          throw new Error('Meilisearch connection error');
        },
      };

      const resilientService = new ResilientSearchService(failingMeili, mockPostgres);

      // Search call must NOT throw; it must seamlessly execute against Postgres fallback!
      const res = await resilientService.search({ query: 'Xiaomi' });

      expect(res.hits.length).toBe(1);
      expect(res.hits[0].id).toBe('prod_xiaomi_02');
      expect(res.engine).toBe('postgres_fallback');
      expect(res.isDegraded).toBe(true);

      // Health check must document degraded mode
      const health = await resilientService.checkHealth();
      expect(health.status).toBe('DEGRADED');
      expect(health.primaryAvailable).toBe(false);
      expect(health.fallbackAvailable).toBe(true);
      expect(health.activeEngine).toBe('postgres_fallback');
    });

    it('opens circuit breaker after repeated failures to protect latency SLA', async () => {
      let meiliCalls = 0;
      const failingMeili: SearchServiceInterface = {
        search: async () => {
          meiliCalls++;
          throw new Error('Meilisearch timeout 250ms exceeded');
        },
        indexDocuments: async () => ({ indexed: 0 }),
        deleteDocuments: async () => ({ deleted: 0 }),
        checkHealth: async () => ({
          status: 'DOWN',
          primaryEngine: 'meilisearch',
          primaryAvailable: false,
          fallbackEngine: 'postgres',
          fallbackAvailable: true,
          activeEngine: 'postgres_fallback',
          timestamp: new Date().toISOString(),
        }),
      };

      const resilientService = new ResilientSearchService(failingMeili, mockPostgres);

      // Trigger 3 failures to trip the circuit breaker threshold
      await resilientService.search({ query: 'Walton' });
      await resilientService.search({ query: 'Xiaomi' });
      await resilientService.search({ query: 'Aarong' });
      expect(meiliCalls).toBe(3);

      // 4th call should bypass Meilisearch entirely because circuit is open
      const fourthCall = await resilientService.search({ query: 'Walton' });
      expect(fourthCall.engine).toBe('postgres_fallback');
      expect(meiliCalls).toBe(3); // Count remains 3, circuit bypassed Meilisearch!
    });
  });
});
