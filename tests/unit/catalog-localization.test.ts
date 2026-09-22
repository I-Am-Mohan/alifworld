import { describe, expect, it } from 'bun:test';
import {
  localeCandidates,
  normalizeCatalogLocale,
  CatalogLocaleSchema,
  CreateCmsContentSchema,
} from '@/features/catalog/localization';

describe('Localized catalog and CMS content (Milestone 053)', () => {
  it('normalizes regional locale tags and preserves supported fallback order', () => {
    expect(normalizeCatalogLocale('EN_bd')).toBe('en-BD');
    expect(localeCandidates('en-BD')).toEqual(['en-BD', 'en', 'bn-BD', 'bn']);
    expect(localeCandidates('bn')).toEqual(['bn', 'bn-BD']);
  });

  it('validates locale-keyed catalog content', () => {
    expect(CatalogLocaleSchema.safeParse('bn-BD').success).toBe(true);
    expect(CatalogLocaleSchema.safeParse('not a locale').success).toBe(false);
  });

  it('requires at least one CMS translation and a URL-safe slug', () => {
    const parsed = CreateCmsContentSchema.safeParse({
      contentType: 'landing_page',
      slug: 'about-alifworld',
      translations: [{ locale: 'bn-BD', title: 'আমাদের সম্পর্কে', body: { blocks: [] } }],
    });
    expect(parsed.success).toBe(true);
    expect(CreateCmsContentSchema.safeParse({ contentType: 'page', slug: 'Invalid Slug', translations: [] }).success).toBe(false);
  });
});
