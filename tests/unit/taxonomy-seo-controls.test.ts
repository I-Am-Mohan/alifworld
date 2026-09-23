import { describe, expect, it } from 'bun:test';
import { localeCandidates, LocalizedCategoryTranslationSchema, TaxRuleWriteSchema } from '@/features/catalog/localization';
import { buildBreadcrumbJsonLd, buildNoIndexMetadata, buildSeoMetadata } from '@/shared/seo/metadata';

describe('Milestone 075 taxonomy translation and SEO contracts', () => {
  it('uses language-appropriate locale fallback order', () => {
    expect(localeCandidates('en-BD')).toEqual(['en-BD', 'en']);
    expect(localeCandidates('bn-BD')).toEqual(['bn-BD', 'bn']);
  });

  it('validates taxonomy SEO translation fields', () => {
    expect(LocalizedCategoryTranslationSchema.safeParse({ locale: 'en-BD', name: 'Phones', seoTitle: 'Phones in Bangladesh', seoDescription: 'Browse phones.' }).success).toBe(true);
    expect(LocalizedCategoryTranslationSchema.safeParse({ locale: 'invalid_locale', name: 'Phones' }).success).toBe(false);
  });

  it('validates effective-date tax rules and rejects inverted ranges', () => {
    expect(TaxRuleWriteSchema.safeParse({ name: 'Standard VAT', ratePercent: 15, effectiveFrom: '2026-01-01T00:00:00.000Z' }).success).toBe(true);
    expect(TaxRuleWriteSchema.safeParse({ name: 'Invalid', ratePercent: 15, effectiveFrom: '2026-02-01T00:00:00.000Z', effectiveTo: '2026-01-01T00:00:00.000Z' }).success).toBe(false);
  });

  it('creates public SEO metadata and excludes private pages', () => {
    const metadata = buildSeoMetadata({ path: '/categories/phones', locale: 'en-BD', title: 'Phones', description: 'Browse phones.' });
    expect(metadata.alternates?.canonical).toContain('/en-BD/categories/phones');
    expect(metadata.openGraph?.locale).toBe('en-BD');
    expect(buildNoIndexMetadata('Admin', 'Private').robots).toEqual({ index: false, follow: false });
    expect(buildBreadcrumbJsonLd([{ name: 'Phones', path: '/categories/phones' }], 'en-BD')['@type']).toBe('BreadcrumbList');
  });
});
