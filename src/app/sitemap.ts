import { MetadataRoute } from 'next';
import { prisma } from '@/shared/database/prisma';
import { absoluteUrl, localePath } from '@/shared/seo/metadata';
import { CANONICAL_LOCALES } from '@/i18n/config';
import { DISALLOW_PREFIXES } from '@/shared/seo/robots';

const defaultPublicPaths = ['/', '/products'];

export interface DynamicSitemapEntities {
  products?: Array<{ slug: string; updatedAt?: Date | string }>;
  categories?: Array<{ slug: string; updatedAt?: Date | string }>;
  brands?: Array<{ slug: string; updatedAt?: Date | string }>;
  collections?: Array<{ slug: string; updatedAt?: Date | string }>;
  sellers?: Array<{ slug: string; updatedAt?: Date | string }>;
}

function isDisallowedUrl(url: string): boolean {
  try {
    const pathname = new URL(url).pathname;
    return DISALLOW_PREFIXES.some((prefix) => {
      if (prefix === '/seller') {
        // Disallow /seller and /seller/* (merchant portal), but allow /sellers/* (public storefronts)
        return (
          pathname === '/seller' || pathname.startsWith('/seller/') || pathname.includes('/seller/')
        );
      }
      return pathname.includes(prefix);
    });
  } catch {
    return false;
  }
}

/**
 * Builds localized sitemap entries. If no dynamic entities are provided,
 * returns the foundational public route entries.
 */
export function buildSitemap(entities?: DynamicSitemapEntities): MetadataRoute.Sitemap {
  const staticEntries: MetadataRoute.Sitemap = defaultPublicPaths.flatMap((path) =>
    CANONICAL_LOCALES.map((locale) => ({
      url: absoluteUrl(localePath(path, locale)),
      changeFrequency: path === '/' ? ('daily' as const) : ('hourly' as const),
      priority: path === '/' ? 1.0 : 0.8,
    }))
  );

  if (!entities) {
    return staticEntries;
  }

  const dynamicEntries: MetadataRoute.Sitemap = [];

  // Products
  if (entities.products) {
    for (const p of entities.products) {
      for (const locale of CANONICAL_LOCALES) {
        dynamicEntries.push({
          url: absoluteUrl(localePath(`/products/${p.slug}`, locale)),
          lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
          changeFrequency: 'hourly',
          priority: 0.8,
        });
      }
    }
  }

  // Categories
  if (entities.categories) {
    for (const c of entities.categories) {
      for (const locale of CANONICAL_LOCALES) {
        dynamicEntries.push({
          url: absoluteUrl(localePath(`/categories/${c.slug}`, locale)),
          lastModified: c.updatedAt ? new Date(c.updatedAt) : new Date(),
          changeFrequency: 'daily',
          priority: 0.7,
        });
      }
    }
  }

  // Brands
  if (entities.brands) {
    for (const b of entities.brands) {
      for (const locale of CANONICAL_LOCALES) {
        dynamicEntries.push({
          url: absoluteUrl(localePath(`/brands/${b.slug}`, locale)),
          lastModified: b.updatedAt ? new Date(b.updatedAt) : new Date(),
          changeFrequency: 'weekly',
          priority: 0.7,
        });
      }
    }
  }

  // Collections
  if (entities.collections) {
    for (const col of entities.collections) {
      for (const locale of CANONICAL_LOCALES) {
        dynamicEntries.push({
          url: absoluteUrl(localePath(`/collections/${col.slug}`, locale)),
          lastModified: col.updatedAt ? new Date(col.updatedAt) : new Date(),
          changeFrequency: 'daily',
          priority: 0.7,
        });
      }
    }
  }

  // Sellers
  if (entities.sellers) {
    for (const s of entities.sellers) {
      for (const locale of CANONICAL_LOCALES) {
        dynamicEntries.push({
          url: absoluteUrl(localePath(`/sellers/${s.slug}`, locale)),
          lastModified: s.updatedAt ? new Date(s.updatedAt) : new Date(),
          changeFrequency: 'weekly',
          priority: 0.6,
        });
      }
    }
  }

  // Verify that NO entry contains any disallowed path prefixes
  return [...staticEntries, ...dynamicEntries].filter((entry) => !isDisallowedUrl(entry.url));
}

/**
 * Next.js App Router default sitemap handler.
 * Fetches published entities from database with boot-safe fallback.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const [products, categories, brands, collections, sellers] = await Promise.all([
      (prisma as any).product.findMany({
        where: { deletedAt: null, status: 'PUBLISHED' },
        select: { slug: true, updatedAt: true },
        take: 1000,
      }),
      (prisma as any).category.findMany({
        where: { deletedAt: null, isActive: true },
        select: { slug: true, updatedAt: true },
        take: 200,
      }),
      (prisma as any).brand.findMany({
        where: { deletedAt: null, isActive: true },
        select: { slug: true, updatedAt: true },
        take: 200,
      }),
      (prisma as any).collection.findMany({
        where: { deletedAt: null, isActive: true, status: 'PUBLISHED' },
        select: { slug: true, updatedAt: true },
        take: 100,
      }),
      (prisma as any).seller.findMany({
        where: { deletedAt: null, status: 'VERIFIED' },
        select: { slug: true, updatedAt: true },
        take: 200,
      }),
    ]);

    return buildSitemap({
      products,
      categories,
      brands,
      collections,
      sellers,
    });
  } catch (err) {
    console.warn('Failed to load dynamic sitemap entities; serving static fallback:', err);
    return buildSitemap();
  }
}
