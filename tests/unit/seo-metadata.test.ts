import { describe, expect, it } from 'bun:test';
import {
  absoluteUrl,
  buildBreadcrumbJsonLd,
  buildNoIndexMetadata,
  buildSeoMetadata,
  localeAlternates,
  localePath,
} from '@/shared/seo/metadata';
import { buildRobotsText, DISALLOW_PREFIXES } from '@/shared/seo/robots';
import { buildSitemap } from '@/app/sitemap';

describe('Milestone 059 localized SEO contract', () => {
  it('creates canonical locale paths with bn-BD as the default URL', () => {
    expect(localePath('/products', 'bn-BD')).toBe('/products');
    expect(localePath('/products', 'en-BD')).toBe('/en-BD/products');
    expect(absoluteUrl('/products')).toContain('/products');
  });

  it('creates reciprocal hreflang alternates and x-default-compatible metadata', () => {
    const alternates = localeAlternates('/products');
    expect(alternates['bn-BD']).toContain('/products');
    expect(alternates['en-BD']).toContain('/en-BD/products');

    const metadata = buildSeoMetadata({
      path: '/products',
      locale: 'en-BD',
      title: 'Products | AlifWorld',
      description: 'Localized products',
    });
    expect(metadata.alternates?.canonical).toContain('/en-BD/products');
    expect(metadata.alternates?.languages?.['x-default']).toContain('/products');
    expect(metadata.openGraph?.locale).toBe('en-BD');
    expect((metadata.twitter as { card?: string } | undefined)?.card).toBe('summary_large_image');
  });

  it('marks private route metadata as noindex and nofollow', () => {
    const metadata = buildSeoMetadata({
      path: '/orders/ORD-1',
      title: 'Order tracking',
      description: 'Private order',
      noIndex: true,
    });
    expect(metadata.robots).toEqual({ index: false, follow: false });

    const privateMetadata = buildNoIndexMetadata('Private page', 'Private description');
    expect(privateMetadata.alternates).toBeUndefined();
    expect(privateMetadata.robots).toEqual({ index: false, follow: false });
  });

  it('builds schema.org breadcrumb data with localized URLs', () => {
    const breadcrumb = buildBreadcrumbJsonLd(
      [
        { name: 'AlifWorld', path: '/' },
        { name: 'Products', path: '/products' },
      ],
      'en-BD'
    );
    expect(breadcrumb['@type']).toBe('BreadcrumbList');
    expect(breadcrumb.itemListElement).toEqual([
      expect.objectContaining({ position: 1, item: expect.stringContaining('/en-BD') }),
      expect.objectContaining({ position: 2, item: expect.stringContaining('/en-BD/products') }),
    ]);
  });

  it('excludes private paths from crawler directives and the sitemap', () => {
    const robots = buildRobotsText();
    for (const prefix of DISALLOW_PREFIXES) {
      expect(robots).toContain(`Disallow: ${prefix}`);
    }
    expect(buildSitemap().every((entry) => !entry.url.includes('/admin'))).toBe(true);
    expect(buildSitemap()).toHaveLength(4);
  });
});
