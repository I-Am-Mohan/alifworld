import { MetadataRoute } from 'next';
import { absoluteUrl, localePath } from '@/shared/seo/metadata';
import { CANONICAL_LOCALES } from '@/i18n/config';

const publicPaths = ['/', '/products'];

export function buildSitemap(): MetadataRoute.Sitemap {
  return publicPaths.flatMap((path) =>
    CANONICAL_LOCALES.map((locale) => ({
      url: absoluteUrl(localePath(path, locale)),
      changeFrequency: path === '/' ? ('daily' as const) : ('hourly' as const),
      priority: path === '/' ? 1 : 0.8,
    }))
  );
}

export default function sitemap(): MetadataRoute.Sitemap {
  return buildSitemap();
}
