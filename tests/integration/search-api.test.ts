import { describe, it, expect, beforeEach, spyOn } from 'bun:test';
import { GET as searchRoute } from '@/app/api/v1/search/route';
import { GET as healthRoute } from '@/app/api/v1/search/health/route';
import { searchService } from '@/features/search/services/search-service';
import { SearchDocument } from '@/features/search/types';
import { NextRequest } from 'next/server';

describe('Milestone 111: Search REST API & Health Probe Integration Tests', () => {
  const mockProducts: SearchDocument[] = [
    {
      id: 'prod_101',
      slug: 'walton-primo-s8',
      title: 'Walton Primo S8 Pro',
      titleBn: 'ওয়ালটন প্রিমো এস৮ প্রো',
      description: 'Smartphone with 64MP Camera',
      descriptionBn: 'স্মার্টফোন',
      brand: 'Walton',
      categoryName: 'Smartphones',
      categorySlug: 'smartphones',
      sellerId: 'sel_001',
      sellerName: 'Walton Store',
      minPricePoisha: 1850000,
      maxPricePoisha: 1850000,
      currency: 'BDT',
      productPointSnapshot: 150,
      inStock: true,
      tags: ['mobile', 'walton'],
      rating: 4.8,
      reviewCount: 40,
      isPublished: true,
      createdAt: '2026-09-20T10:00:00.000Z',
      updatedAt: '2026-09-20T10:00:00.000Z',
    },
  ];

  beforeEach(() => {
    spyOn(searchService, 'search').mockResolvedValue({
      hits: mockProducts,
      totalHits: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
      engine: 'postgres_fallback',
      isDegraded: true,
      executionTimeMs: 15,
      facets: {
        categories: { Smartphones: 1 },
        brands: { Walton: 1 },
      },
    });

    spyOn(searchService, 'checkHealth').mockResolvedValue({
      status: 'DEGRADED',
      primaryEngine: 'meilisearch',
      primaryAvailable: false,
      fallbackEngine: 'postgres',
      fallbackAvailable: true,
      activeEngine: 'postgres_fallback',
      latencyMs: 8,
      timestamp: new Date().toISOString(),
      details: { mode: 'PostgreSQL fallback' },
    });
  });

  it('GET /api/v1/search should return products with pagination and facet metadata', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/v1/search?q=Walton&categorySlug=smartphones&sortBy=price_asc',
      { method: 'GET' }
    );

    const res = await searchRoute(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.length).toBe(1);
    expect(body.data[0].id).toBe('prod_101');
    expect(body.meta.totalHits).toBe(1);
    expect(body.meta.engine).toBe('postgres_fallback');
    expect(body.meta.isDegraded).toBe(true);
    expect(body.facets.brands.Walton).toBe(1);
  });

  it('GET /api/v1/search/health should report search subsystem health and degraded state', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/search/health', {
      method: 'GET',
    });

    const res = await healthRoute(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('DEGRADED');
    expect(body.data.primaryEngine).toBe('meilisearch');
    expect(body.data.fallbackEngine).toBe('postgres');
    expect(body.data.fallbackAvailable).toBe(true);
    expect(body.data.activeEngine).toBe('postgres_fallback');
  });
});
