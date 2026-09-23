import { getCatalogLeafKeys, getCatalogPlaceholders, validateCatalogPair } from '@/i18n/translations/catalog-validation';
import { getDictionary } from '@/i18n/translations';
import { CANONICAL_LOCALES, normalizeToCanonicalLocale } from '@/i18n/config';
import type { TranslationDictionary } from './types';

export interface CatalogExpansionIssue {
  key: string;
  referenceLength: number;
  targetLength: number;
  ratio: number;
  limit: number;
}

export interface CatalogQaReport {
  referenceLocale: string;
  targetLocale: string;
  keys: string[];
  issues: ReturnType<typeof validateCatalogPair>;
  expansionIssues: CatalogExpansionIssue[];
  summary: {
    missing: number;
    extra: number;
    placeholderMismatch: number;
    empty: number;
    expansion: number;
  };
}

function flattenCatalog(value: TranslationDictionary, prefix = ''): Record<string, string> {
  const flattened: Record<string, string> = {};
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof child === 'string') flattened[path] = child;
    else if (child && typeof child === 'object') Object.assign(flattened, flattenCatalog(child, path));
  }
  return flattened;
}

export function buildCatalogQaReport(
  referenceLocale: string = CANONICAL_LOCALES[1],
  targetLocale: string = CANONICAL_LOCALES[0],
  expansionLimit = 2.5
): CatalogQaReport {
  const reference = getDictionary(referenceLocale) as unknown as TranslationDictionary;
  const target = getDictionary(targetLocale) as unknown as TranslationDictionary;
  const referenceFlat = flattenCatalog(reference);
  const targetFlat = flattenCatalog(target);
  const issues = validateCatalogPair(reference, target);
  const expansionIssues: CatalogExpansionIssue[] = [];

  for (const key of Object.keys(referenceFlat)) {
    const sourceLength = Math.max(referenceFlat[key].trim().length, 1);
    const targetLength = targetFlat[key]?.trim().length ?? 0;
    if (targetLength / sourceLength > expansionLimit) {
      expansionIssues.push({
        key,
        referenceLength: sourceLength,
        targetLength,
        ratio: Number((targetLength / sourceLength).toFixed(2)),
        limit: expansionLimit,
      });
    }
  }

  return {
    referenceLocale: normalizeToCanonicalLocale(referenceLocale),
    targetLocale: normalizeToCanonicalLocale(targetLocale),
    keys: getCatalogLeafKeys(reference),
    issues,
    expansionIssues,
    summary: {
      missing: issues.filter((issue) => issue.type === 'missing-key').length,
      extra: issues.filter((issue) => issue.type === 'extra-key').length,
      placeholderMismatch: issues.filter((issue) => issue.type === 'placeholder-mismatch').length,
      empty: issues.filter((issue) => issue.type === 'empty-value').length,
      expansion: expansionIssues.length,
    },
  };
}

export function buildLaunchCatalogQaReport(expansionLimit = 2.5): CatalogQaReport[] {
  return [
    buildCatalogQaReport('en-BD', 'bn-BD', expansionLimit),
    buildCatalogQaReport('bn-BD', 'en-BD', expansionLimit),
  ];
}

export function getCatalogMessage(locale: string, key: string): string | null {
  const flat = flattenCatalog(getDictionary(locale) as unknown as TranslationDictionary);
  return flat[key] ?? null;
}

export function getCatalogMessagePlaceholders(locale: string, key: string): string[] {
  const message = getCatalogMessage(locale, key);
  return message ? getCatalogPlaceholders(message) : [];
}
