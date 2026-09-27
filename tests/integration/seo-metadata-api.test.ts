import { describe, it, expect, beforeEach, spyOn } from 'bun:test';
import { GET as getSeoMetadataRoute } from '@/app/api/v1/seo/metadata/route';
import { seoService } from '@/features/catalog/services/seo.service';
import { NextRequest } from 'next/server';

describe('Milestone 119: SEO Metadata REST API Integration Tests', () => {
  beforeEach(() => {
    spyOn(seoService, 'resolveSeoMetadata').mockImplementation(async (type: string, slug: string) => {
      if (type === 'product' && slug === 'walton-primo-s8') {
        return {
          title: 'Walton Primo S8 Pro | AlifWorld Bangladesh',
          description: 'Smartphone with 64MP Camera',
          canonicalUrl: 'https://alifworld.com/products/walton-primo-s8',
          hreflang: {
            'en-BD': 'https://alifworld.com/products/walton-primo-s8',
            'bn-BD': 'https://alifworld.com/products/walton-primo-s8?locale=bn-BD',
            'x-default': 'https://alifworld.com/products/walton-primo-s8',
          },
          openGraph: {
            title: 'Walton Primo S8 Pro',
            description: 'Smartphone with 64MP Camera',
            url: 'https://alifworld.com/products/walton-primo-s8',
            siteName: 'AlifWorld Bangladesh',
            locale: 'en_BD',
            alternateLocales: ['bn_BD'],
            type: 'product',
            images: [{ url: 'https://alifworld.com/images/walton-s8.jpg' }],
          },
          twitter: {
            card: 'summary_large_image',
            site: '@alifworldbd',
            creator: '@alifworldbd',
            title: 'Walton Primo S8 Pro',
            description: 'Smartphone',
            images: [],
          },
          jsonLd: {
            '@type': 'Product',
            name: 'Walton Primo S8 Pro',
          },
        } as any;
      }

      if (type === 'category' && slug === 'smartphones') {
        return {
          title: 'Smartphones Collection | AlifWorld Bangladesh',
          description: 'Latest mobile phones',
          canonicalUrl: 'https://alifworld.com/categories/smartphones',
          hreflang: {
            'en-BD': 'https://alifworld.com/categories/smartphones',
            'bn-BD': 'https://alifworld.com/categories/smartphones?locale=bn-BD',
            'x-default': 'https://alifworld.com/categories/smartphones',
          },
          openGraph: {
            title: 'Smartphones',
            description: 'Latest mobile phones',
            url: 'https://alifworld.com/categories/smartphones',
            siteName: 'AlifWorld Bangladesh',
            locale: 'en_BD',
            alternateLocales: ['bn_BD'],
            type: 'website',
            images: [],
          },
          twitter: {
            card: 'summary_large_image',
            site: '@alifworldbd',
            creator: '@alifworldbd',
            title: 'Smartphones',
            description: 'Latest mobile phones',
            images: [],
          },
          jsonLd: {
            '@type': 'CollectionPage',
            name: 'Smartphones',
            breadcrumb: {
              '@type': 'BreadcrumbList',
              itemListElement: [],
            },
          },
        } as any;
      }

      throw new Error(`Entity '${slug}' not found`);
    });
  });

  it('GET /api/v1/seo/metadata?type=product returns product canonical URL and JSON-LD', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/v1/seo/metadata?type=product&slug=walton-primo-s8',
      { method: 'GET' }
    );

    const res = await getSeoMetadataRoute(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.canonicalUrl).toContain('/products/walton-primo-s8');
    expect(body.data.jsonLd['@type']).toBe('Product');
    expect(body.data.openGraph.type).toBe('product');
  });

  it('GET /api/v1/seo/metadata?type=category returns category SEO and BreadcrumbList', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/v1/seo/metadata?type=category&slug=smartphones',
      { method: 'GET' }
    );

    const res = await getSeoMetadataRoute(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.canonicalUrl).toContain('/categories/smartphones');
    expect(body.data.jsonLd['@type']).toBe('CollectionPage');
    expect(body.data.jsonLd.breadcrumb['@type']).toBe('BreadcrumbList');
  });

  it('GET /api/v1/seo/metadata returns 422 if parameters are invalid', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/seo/metadata?type=invalid_type', {
      method: 'GET',
    });

    const res = await getSeoMetadataRoute(req);
    expect(res.status).toBe(422);
  });
});
