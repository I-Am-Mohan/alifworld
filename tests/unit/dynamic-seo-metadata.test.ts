import { describe, expect, it } from 'bun:test';
import { SeoBuilder, APP_BASE_URL } from '@/shared/seo/seo-builder';

describe('Milestone 119: Dynamic Metadata, JSON-LD, and Canonical SEO Unit Tests', () => {
  describe('1. Product SEO & Schema.org JSON-LD', () => {
    const mockProduct = {
      slug: 'walton-primo-s8',
      title: 'Walton Primo S8 Pro Smartphone',
      titleBn: 'ওয়ালটন প্রিমো এস৮ প্রো স্মার্টফোন',
      description: '64MP Quad Camera, 128GB Storage, 5000mAh Battery',
      brand: 'Walton',
      categoryName: 'Smartphones',
      categorySlug: 'smartphones',
      minPricePoisha: 1850000, // 18,500.00 BDT
      maxPricePoisha: 1850000,
      inStock: true,
      imageUrl: 'https://alifworld.com/images/walton-s8.jpg',
      rating: 4.8,
      reviewCount: 36,
      sku: 'WLT-S8-001',
    };

    it('builds canonical URL, hreflang alternates, and OpenGraph metadata', () => {
      const seo = SeoBuilder.buildProductSeo(mockProduct, 'en-BD');

      expect(seo.title).toContain('Walton Primo S8 Pro');
      expect(seo.canonicalUrl).toBe(`${APP_BASE_URL}/products/walton-primo-s8`);
      expect(seo.hreflang['en-BD']).toBe(`${APP_BASE_URL}/products/walton-primo-s8`);
      expect(seo.hreflang['bn-BD']).toBe(`${APP_BASE_URL}/products/walton-primo-s8?locale=bn-BD`);
      expect(seo.hreflang['x-default']).toBe(`${APP_BASE_URL}/products/walton-primo-s8`);

      expect(seo.openGraph.type).toBe('product');
      expect(seo.openGraph.siteName).toBe('AlifWorld Bangladesh');
      expect(seo.openGraph.images[0].url).toBe('https://alifworld.com/images/walton-s8.jpg');
      expect(seo.twitter.card).toBe('summary_large_image');
    });

    it('generates compliant Schema.org JSON-LD with BDT decimal price and InStock status', () => {
      const seo = SeoBuilder.buildProductSeo(mockProduct, 'en-BD');
      const ld = seo.jsonLd;

      expect(ld['@context']).toBe('https://schema.org/');
      expect(ld['@type']).toBe('Product');
      expect(ld.name).toBe(mockProduct.title);
      expect(ld.sku).toBe('WLT-S8-001');
      expect(ld.brand['@type']).toBe('Brand');
      expect(ld.brand.name).toBe('Walton');

      // Monetary conversion: 1,850,000 poisha = 18500.00 BDT
      expect(ld.offers['@type']).toBe('Offer');
      expect(ld.offers.priceCurrency).toBe('BDT');
      expect(ld.offers.price).toBe('18500.00');
      expect(ld.offers.availability).toBe('https://schema.org/InStock');
      expect(ld.aggregateRating.ratingValue).toBe('4.8');
    });

    it('localizes title and description in Bengali for bn-BD locale', () => {
      const seoBn = SeoBuilder.buildProductSeo(mockProduct, 'bn-BD');

      expect(seoBn.title).toContain('ওয়ালটন প্রিমো এস৮ প্রো স্মার্টফোন');
      expect(seoBn.openGraph.locale).toBe('bn_BD');
    });
  });

  describe('2. Category SEO & BreadcrumbList JSON-LD', () => {
    it('generates Category SEO and BreadcrumbList structured data', () => {
      const category = {
        slug: 'smartphones',
        name: 'Smartphones',
        parentName: 'Electronics',
        parentSlug: 'electronics',
        description: 'Latest mobile phones in Bangladesh',
      };

      const seo = SeoBuilder.buildCategorySeo(category, 'en-BD');

      expect(seo.canonicalUrl).toBe(`${APP_BASE_URL}/categories/smartphones`);
      expect(seo.jsonLd['@type']).toBe('CollectionPage');
      expect(seo.jsonLd.breadcrumb['@type']).toBe('BreadcrumbList');
      expect(seo.jsonLd.breadcrumb.itemListElement.length).toBe(4);
      expect(seo.jsonLd.breadcrumb.itemListElement[0].name).toBe('Home');
      expect(seo.jsonLd.breadcrumb.itemListElement[1].name).toBe('Categories');
      expect(seo.jsonLd.breadcrumb.itemListElement[2].name).toBe('Electronics');
      expect(seo.jsonLd.breadcrumb.itemListElement[3].name).toBe('Smartphones');
    });
  });

  describe('3. Brand & Seller SEO', () => {
    it('generates Brand SEO with verified trademark schema', () => {
      const brand = {
        slug: 'walton',
        name: 'Walton',
        logoUrl: 'https://alifworld.com/walton.png',
        website: 'https://waltonbd.com',
        isVerified: true,
      };

      const seo = SeoBuilder.buildBrandSeo(brand);

      expect(seo.canonicalUrl).toBe(`${APP_BASE_URL}/brands/walton`);
      expect(seo.jsonLd['@type']).toBe('Brand');
      expect(seo.jsonLd.name).toBe('Walton');
      expect(seo.jsonLd.sameAs).toContain('https://waltonbd.com');
    });

    it('generates Seller Storefront SEO with Store structured data', () => {
      const seller = {
        slug: 'walton-official',
        businessName: 'Walton Official Store',
        isVerified: true,
      };

      const seo = SeoBuilder.buildSellerSeo(seller);

      expect(seo.canonicalUrl).toBe(`${APP_BASE_URL}/sellers/walton-official`);
      expect(seo.jsonLd['@type']).toBe('Store');
      expect(seo.jsonLd.name).toBe('Walton Official Store');
    });
  });

  describe('4. Next.js Metadata Adapter', () => {
    it('translates SeoMetadata to Next.js Metadata object', () => {
      const seo = SeoBuilder.buildCategorySeo({
        slug: 'fashion',
        name: 'Fashion',
      });

      const nextMeta = SeoBuilder.toNextMetadata(seo);

      expect(nextMeta.title).toBe(seo.title);
      expect(nextMeta.alternates?.canonical).toBe(seo.canonicalUrl);
      expect(nextMeta.openGraph?.siteName).toBe('AlifWorld Bangladesh');
      expect((nextMeta.twitter as any)?.card).toBe('summary_large_image');
    });
  });
});
