import { describe, it, expect, beforeEach, spyOn } from 'bun:test';
import { GET as getCategoryLandingRoute } from '@/app/api/v1/catalog/landing/category/[slug]/route';
import { GET as getBrandLandingRoute } from '@/app/api/v1/catalog/landing/brand/[slug]/route';
import { GET as getCollectionLandingRoute } from '@/app/api/v1/catalog/landing/collection/[slug]/route';
import { discoveryLandingService } from '@/features/catalog/services/discovery-landing.service';
import { NextRequest } from 'next/server';

describe('Milestone 116: Category, Brand, and Collection Landing API Integration Tests', () => {
  beforeEach(() => {
    spyOn(discoveryLandingService, 'getCategoryLanding').mockResolvedValue({
      category: {
        id: 'cat_001',
        name: 'Smartphones',
        slug: 'smartphones',
      } as any,
      breadcrumbs: [
        { label: 'Home', slug: '', href: '/' },
        { label: 'Smartphones', slug: 'smartphones', href: '/categories/smartphones' },
      ],
      subcategories: [],
      products: [],
      totalHits: 0,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    spyOn(discoveryLandingService, 'getBrandLanding').mockResolvedValue({
      brand: {
        id: 'brd_001',
        name: 'Walton',
        slug: 'walton',
        isVerified: true,
      } as any,
      products: [],
      totalHits: 0,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    spyOn(discoveryLandingService, 'getCollectionLanding').mockResolvedValue({
      collection: {
        id: 'col_001',
        name: 'Eid Mega Sale',
        slug: 'eid-surge-2026',
        collectionType: 'CAMPAIGN',
        status: 'PUBLISHED',
      } as any,
      products: [],
      totalCount: 0,
    });
  });

  it('GET /api/v1/catalog/landing/category/[slug] returns category landing payload', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/catalog/landing/category/smartphones', {
      method: 'GET',
    });

    const res = await getCategoryLandingRoute(req, {
      params: Promise.resolve({ slug: 'smartphones' }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.category.slug).toBe('smartphones');
    expect(body.data.breadcrumbs.length).toBe(2);
  });

  it('GET /api/v1/catalog/landing/brand/[slug] returns brand flagship payload', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/catalog/landing/brand/walton', {
      method: 'GET',
    });

    const res = await getBrandLandingRoute(req, {
      params: Promise.resolve({ slug: 'walton' }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.brand.slug).toBe('walton');
    expect(body.data.brand.isVerified).toBe(true);
  });

  it('GET /api/v1/catalog/landing/collection/[slug] returns collection landing payload', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/catalog/landing/collection/eid-surge-2026', {
      method: 'GET',
    });

    const res = await getCollectionLandingRoute(req, {
      params: Promise.resolve({ slug: 'eid-surge-2026' }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.collection.slug).toBe('eid-surge-2026');
  });
});
