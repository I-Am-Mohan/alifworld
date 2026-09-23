import { describe, expect, it } from 'bun:test';
import { validateCatalogPair } from '@/i18n/translations/catalog-validation';
import { buildCatalogQaReport } from '@/i18n/catalog-qa';
import { formatPluralMessage, translateWithFallback } from '@/i18n/fallback';
import { normalizeToCanonicalLocale } from '@/i18n/config';

describe('Milestone 060 localization fallback and QA tooling', () => {
  it('falls back from an unsupported locale to Bengali', () => {
    expect(normalizeToCanonicalLocale('fr-FR')).toBe('bn-BD');
    expect(translateWithFallback('common.save', 'fr-FR')).toBe('সংরক্ষণ করুন');
  });

  it('preserves placeholders during fallback interpolation', () => {
    expect(translateWithFallback('store.divisions.locationSet', 'fr-FR', { location: 'ঢাকা' })).toContain('ঢাকা');
  });

  it('supports English plural categories without losing count interpolation', () => {
    const template = '{count, plural, one {# item} other {# items}}';
    expect(formatPluralMessage(template, { count: 1 })).toBe('1 item');
    expect(formatPluralMessage(template, { count: 3 })).toBe('3 items');
  });

  it('reports catalog parity and expansion findings', () => {
    const issues = validateCatalogPair(
      { message: 'Short {name}' },
      { message: 'অনেক দীর্ঘ অনুবাদ {name}', extra: 'অতিরিক্ত' }
    );
    expect(issues.some((issue) => issue.type === 'extra-key')).toBe(true);

    const report = buildCatalogQaReport('en-BD', 'bn-BD', 1);
    expect(report.keys.length).toBeGreaterThan(0);
    expect(report.referenceLocale).toBe('en-BD');
    expect(report.targetLocale).toBe('bn-BD');
    expect(report.summary).toHaveProperty('expansion');
  });
});
