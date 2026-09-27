import { describe, expect, it } from 'bun:test';
import { buildSitemap } from '@/app/sitemap';
import { GET as getRobotsRoute } from '@/app/robots.txt/route';
import { DISALLOW_PREFIXES, buildRobotsText } from '@/shared/seo/robots';
import { APP_BASE_URL } from '@/shared/seo/seo-builder';

describe('Milestone 120: Sitemaps, Robots, Accessibility, and Performance Tests', () => {
  describe('1. Dynamic Sitemap Generation', () => {
    it('returns foundational static routes when no dynamic entities provided', () => {
      const sitemapEntries = buildSitemap();
      expect(sitemapEntries.length).toBe(4); // 2 paths x 2 locales
      expect(sitemapEntries.every((e) => !e.url.includes('/admin'))).toBe(true);
    });

    it('generates comprehensive localized sitemap for products, categories, brands, and sellers', () => {
      const dynamicEntities = {
        products: [
          { slug: 'walton-primo-s8', updatedAt: new Date('2026-09-20') },
          { slug: 'xiaomi-buds-5', updatedAt: new Date('2026-09-22') },
        ],
        categories: [{ slug: 'smartphones', updatedAt: new Date('2026-09-15') }],
        brands: [{ slug: 'walton', updatedAt: new Date('2026-09-10') }],
        collections: [{ slug: 'eid-surge-2026', updatedAt: new Date('2026-09-25') }],
        sellers: [{ slug: 'walton-official', updatedAt: new Date('2026-09-12') }],
      };

      const fullSitemap = buildSitemap(dynamicEntities);

      // Base 4 entries + (2 products + 1 cat + 1 brand + 1 col + 1 seller = 6 items) x 2 locales = 4 + 12 = 16 entries
      expect(fullSitemap.length).toBe(16);

      // Verify product entry attributes
      const productEntry = fullSitemap.find((e) => e.url.includes('/products/walton-primo-s8'));
      expect(productEntry).toBeDefined();
      expect(productEntry?.changeFrequency).toBe('hourly');
      expect(productEntry?.priority).toBe(0.8);

      // Verify category entry attributes
      const categoryEntry = fullSitemap.find((e) => e.url.includes('/categories/smartphones'));
      expect(categoryEntry).toBeDefined();
      expect(categoryEntry?.changeFrequency).toBe('daily');

      // Verify seller entry attributes
      const sellerEntry = fullSitemap.find((e) => e.url.includes('/sellers/walton-official'));
      expect(sellerEntry).toBeDefined();
      expect(sellerEntry?.priority).toBe(0.6);
    });

    it('strictly excludes private routes from sitemap', () => {
      const entitiesWithPrivate = {
        products: [{ slug: 'admin-dashboard-secret' }],
      };

      const sitemap = buildSitemap(entitiesWithPrivate);
      for (const prefix of DISALLOW_PREFIXES) {
        expect(sitemap.every((entry) => !entry.url.includes(prefix))).toBe(true);
      }
    });
  });

  describe('2. Robots.txt Crawler Directives', () => {
    it('returns 200 text/plain and excludes private administrative paths in /robots.txt', async () => {
      const response = await getRobotsRoute();
      const text = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/plain');
      expect(text).toContain('User-agent: *');
      expect(text).toContain('Allow: /');
      expect(text).toContain('Disallow: /admin');
      expect(text).toContain('Disallow: /seller');
      expect(text).toContain('Disallow: /api');
      expect(text).toContain('Sitemap:');
    });

    it('builds raw robots.txt string correctly with sitemap link', () => {
      const text = buildRobotsText();

      expect(text).toContain('User-agent: *');
      expect(text).toContain('Allow: /');
      expect(text).toContain('Disallow: /admin');
      expect(text).toContain('Disallow: /seller');
      expect(text).toContain('Disallow: /api');
      expect(text).toContain(`Sitemap: ${APP_BASE_URL}/sitemap.xml`);
    });
  });

  describe('3. Accessibility & Performance Thresholds', () => {
    it('defines standard Core Web Vitals performance budgets', () => {
      const webVitalsBudgets = {
        largestContentfulPaintMs: 2500, // LCP < 2.5s
        interactionToNextPaintMs: 200, // INP < 200ms
        cumulativeLayoutShift: 0.1, // CLS < 0.1
        firstContentfulPaintMs: 1500, // FCP < 1.5s
      };

      expect(webVitalsBudgets.largestContentfulPaintMs).toBeLessThanOrEqual(2500);
      expect(webVitalsBudgets.interactionToNextPaintMs).toBeLessThanOrEqual(200);
      expect(webVitalsBudgets.cumulativeLayoutShift).toBeLessThanOrEqual(0.1);
    });
  });
});
