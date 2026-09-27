import { describe, expect, it, beforeEach } from 'bun:test';
import { ResilientSearchService } from '@/features/search/services/search-service';
import { PostgresSearchAdapter } from '@/features/search/adapters/postgres-search-adapter';
import { SearchDocument, SearchServiceInterface } from '@/features/search/types';

describe('Milestone 114: PostgreSQL Search Fallback & Graceful Degradation Unit Tests', () => {
  const sampleProducts: SearchDocument[] = [
    {
      id: 'prod_001',
      slug: 'walton-primo-s8',
      title: 'Walton Primo S8 Pro',
      brand: 'Walton',
      categoryName: 'Smartphones',
      sellerId: 'sel_001',
      minPricePoisha: 1850000,
      maxPricePoisha: 1850000,
      currency: 'BDT',
      productPointSnapshot: 150,
      inStock: true,
      tags: ['walton', 'smartphone'],
      isPublished: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'prod_002',
      slug: 'xiaomi-redmi-buds-5',
      title: 'Xiaomi Redmi Buds 5 Pro',
      brand: 'Xiaomi',
      categoryName: 'Audio',
      sellerId: 'sel_002',
      minPricePoisha: 650000,
      maxPricePoisha: 650000,
      currency: 'BDT',
      productPointSnapshot: 65,
      inStock: true,
      tags: ['audio', 'earbuds'],
      isPublished: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  let fallbackAdapter: PostgresSearchAdapter;

  beforeEach(() => {
    fallbackAdapter = new PostgresSearchAdapter(sampleProducts);
  });

  it('fails over transparently to PostgreSQL when Meilisearch crashes during active traffic', async () => {
    let meiliHealthy = true;

    const chaosMeili: SearchServiceInterface = {
      search: async (opts) => {
        if (!meiliHealthy) {
          throw new Error('Connection reset by peer (Meilisearch node crashed)');
        }
        return {
          hits: sampleProducts,
          totalHits: sampleProducts.length,
          page: 1,
          limit: 20,
          totalPages: 1,
          engine: 'meilisearch',
          isDegraded: false,
          executionTimeMs: 15,
        };
      },
      indexDocuments: async () => ({ indexed: 2 }),
      deleteDocuments: async () => ({ deleted: 2 }),
      checkHealth: async () => ({
        status: meiliHealthy ? 'HEALTHY' : 'DOWN',
        primaryEngine: 'meilisearch',
        primaryAvailable: meiliHealthy,
        fallbackEngine: 'postgres',
        fallbackAvailable: true,
        activeEngine: meiliHealthy ? 'meilisearch' : 'postgres_fallback',
        timestamp: new Date().toISOString(),
      }),
    };

    const service = new ResilientSearchService(chaosMeili, fallbackAdapter);

    // Traffic request 1: Meilisearch healthy
    const res1 = await service.search({ query: 'Walton' });
    expect(res1.engine).toBe('meilisearch');
    expect(res1.isDegraded).toBe(false);

    // Chaos Event: Meilisearch cluster goes down
    meiliHealthy = false;

    // Traffic request 2: Should seamlessly execute against PostgreSQL fallback without throwing!
    const res2 = await service.search({ query: 'Walton' });
    expect(res2.engine).toBe('postgres_fallback');
    expect(res2.isDegraded).toBe(true);
    expect(res2.hits.length).toBeGreaterThanOrEqual(1);

    // Verify telemetry recorded failover
    const telemetry = service.getTelemetryMetrics();
    expect(telemetry.totalQueries).toBe(2);
    expect(telemetry.primaryQueries).toBe(1);
    expect(telemetry.fallbackQueries).toBe(1);
    expect(telemetry.lastFallbackReason).toContain('Meilisearch node crashed');
  });

  it('honors administrative forced degraded mode and routes 100% of traffic to fallback', async () => {
    let meiliCalls = 0;
    const trackingMeili: SearchServiceInterface = {
      search: async () => {
        meiliCalls++;
        return {
          hits: sampleProducts,
          totalHits: sampleProducts.length,
          page: 1,
          limit: 20,
          totalPages: 1,
          engine: 'meilisearch',
          isDegraded: false,
          executionTimeMs: 10,
        };
      },
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

    const service = new ResilientSearchService(trackingMeili, fallbackAdapter);

    // Enable forced degraded mode
    service.setForcedDegradedMode(true);
    expect(service.isForcedDegradedMode()).toBe(true);

    const res = await service.search({ query: 'Xiaomi' });
    expect(res.engine).toBe('postgres_fallback');
    expect(res.isDegraded).toBe(true);
    expect(meiliCalls).toBe(0); // Meilisearch was never called

    const health = await service.checkHealth();
    expect(health.status).toBe('DEGRADED');
    expect(health.activeEngine).toBe('postgres_fallback');

    // Disable forced degraded mode
    service.setForcedDegradedMode(false);
    const resAfter = await service.search({ query: 'Xiaomi' });
    expect(resAfter.engine).toBe('meilisearch');
    expect(meiliCalls).toBe(1);
  });

  it('resets circuit breaker on command and restores normal traffic flow', async () => {
    const failingMeili: SearchServiceInterface = {
      search: async () => {
        throw new Error('Timeout 250ms exceeded');
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

    const service = new ResilientSearchService(failingMeili, fallbackAdapter);

    // Trip circuit breaker with 3 failures
    await service.search({ query: '1' });
    await service.search({ query: '2' });
    await service.search({ query: '3' });

    let telemetry = service.getTelemetryMetrics();
    expect(telemetry.circuitTrips).toBe(1);

    // Reset circuit breaker
    service.resetCircuitBreaker();
    telemetry = service.getTelemetryMetrics();
    expect(telemetry.circuitTrips).toBe(1); // historical trip count preserved
  });
});
