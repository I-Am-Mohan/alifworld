import { describe, it, expect, beforeEach, spyOn } from 'bun:test';
import { GET as getProductDetailRoute } from '@/app/api/v1/catalog/products/[id]/route';
import { productDetailService } from '@/features/catalog/services/product-detail.service';
import { NextRequest } from 'next/server';

describe('Milestone 117: Product Detail REST API Integration Tests', () => {
  const mockProductDetail = {
    id: 'prod_101',
    slug: 'walton-primo-s8',
    title: 'Walton Primo S8 Pro',
    basePricePoisha: 1850000,
    basePriceBdtFormatted: '18,500.00',
    productPoint: 150,
    variants: [
      {
        id: 'var_001',
        sku: 'WLT-S8-01',
        title: 'Blue',
        pricePoisha: 1850000,
        priceBdtFormatted: '18,500.00',
        availableQuantity: 10,
        inStock: true,
      },
    ],
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Smartphones', href: '/categories/smartphones' },
    ],
    jsonLd: { '@type': 'Product' },
  };

  beforeEach(() => {
    spyOn(productDetailService, 'getProductBySlug').mockImplementation(async (slug: string) => {
      if (slug === 'walton-primo-s8') {
        return mockProductDetail as any;
      }
      if (slug === 'walton-primo-s8-old') {
        return {
          isRedirect: true,
          targetSlug: 'walton-primo-s8',
          targetUrl: '/products/walton-primo-s8',
        };
      }
      throw new Error(`Product '${slug}' not found`);
    });
  });

  it('GET /api/v1/catalog/products/[slug] returns full product details', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/catalog/products/walton-primo-s8', {
      method: 'GET',
    });

    const res = await getProductDetailRoute(req, {
      params: Promise.resolve({ id: 'walton-primo-s8' }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.id).toBe('prod_101');
    expect(body.data.basePricePoisha).toBe(1850000);
    expect(body.data.variants.length).toBe(1);
    expect(body.data.variants[0].inStock).toBe(true);
  });

  it('GET /api/v1/catalog/products/[slug] returns permanent redirect instruction for historical slug', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/v1/catalog/products/walton-primo-s8-old',
      {
        method: 'GET',
      }
    );

    const res = await getProductDetailRoute(req, {
      params: Promise.resolve({ id: 'walton-primo-s8-old' }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.isRedirect).toBe(true);
    expect(body.data.targetUrl).toBe('/products/walton-primo-s8');
  });
});
