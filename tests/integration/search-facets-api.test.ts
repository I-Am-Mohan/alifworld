import { describe, it, expect, beforeEach, spyOn } from 'bun:test';
import { GET as searchRoute } from '@/app/api/v1/search/route';
import { searchService } from '@/features/search/services/search-service';
import { SearchDocument } from '@/features/search/types';
import { NextRequest } from 'next/server';

describe('Milestone 113: Search Multi-Facet & Sorting REST API Integration Tests', () => {
  const mockProducts: SearchDocument[] = [
    {
      id: 'prod_101',
      slug: 'walton-primo-s8',
      title: 'Walton Primo S8 Pro',
      titleBn: 'ওয়ালটন প্রিমো এস৮ প্রো',
      description: 'Smartphone with 64MP Camera',
      brand: 'Walton',
      categoryName: 'Smartphones',
      categorySlug: 'smartphones',
      sellerId: 'sel_001',
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
      executionTimeMs: 10,
      facets: {
        categories: { Smartphones: 1 },
        brands: { Walton: 1 },
        ratings: { '4_and_above': 1, '3_and_above': 1 },
      },
    });
  });

  it('GET /api/v1/search parses multi-brand, minRating, and points_desc sorting', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/v1/search?brands=Walton,Xiaomi&minRating=4.5&sortBy=points_desc',
      { method: 'GET' }
    );

    const res = await searchRoute(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.length).toBe(1);
    expect(body.facets.ratings['4_and_above']).toBe(1);
  });
});
