import { describe, expect, it } from 'bun:test';
import { bn } from '@/i18n/translations/bn';
import { en } from '@/i18n/translations/en';
import {
  CATALOG_LOCALES,
  getDictionary,
  getCatalogLeafKeys,
  validateLaunchCatalogs,
} from '@/i18n/translations';
import { getCatalogPlaceholders, validateCatalogPair } from '@/i18n/translations/catalog-validation';

describe('English and Bangla translation catalogs (Milestone 052)', () => {
  it('declares the two canonical launch catalogs', () => {
    expect(CATALOG_LOCALES).toEqual(['en-BD', 'bn-BD']);
    expect(getDictionary('en-BD')).toBe(en);
    expect(getDictionary('bn-BD')).toBe(bn);
  });

  it('keeps English and Bangla leaf keys in parity', () => {
    expect(getCatalogLeafKeys(en)).toEqual(getCatalogLeafKeys(bn));
    expect(validateLaunchCatalogs()).toEqual([]);
  });

  it('keeps interpolation parameters identical across locales', () => {
    const englishKeys = getCatalogLeafKeys(en);

    for (const key of englishKeys) {
      const englishValue = key.split('.').reduce<unknown>((value, segment) => {
        return value && typeof value === 'object' ? (value as Record<string, unknown>)[segment] : undefined;
      }, en);
      const banglaValue = key.split('.').reduce<unknown>((value, segment) => {
        return value && typeof value === 'object' ? (value as Record<string, unknown>)[segment] : undefined;
      }, bn);

      expect(typeof englishValue).toBe('string');
      expect(typeof banglaValue).toBe('string');
      expect(getCatalogPlaceholders(englishValue as string)).toEqual(
        getCatalogPlaceholders(banglaValue as string)
      );
    }
  });

  it('reports missing, extra, empty, and placeholder-mismatched entries', () => {
    const issues = validateCatalogPair(
      {
        common: { greeting: 'Hello {name}', save: 'Save' },
        checkout: { total: 'Total' },
      },
      {
        common: { greeting: 'হ্যালো', extra: 'অতিরিক্ত' },
        checkout: { total: '' },
      }
    );

    expect(issues).toEqual([
      {
        type: 'placeholder-mismatch',
        key: 'common.greeting',
        detail: 'expected {name} but found {}',
      },
      { type: 'missing-key', key: 'common.save' },
      { type: 'empty-value', key: 'checkout.total' },
      { type: 'extra-key', key: 'common.extra' },
    ]);
  });
});
