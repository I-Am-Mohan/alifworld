import { getDictionary } from './translations';
import { formatLocalizedText } from '@/shared/utils/localization';
import { normalizeToCanonicalLocale } from './config';

export interface PluralMessageOptions {
  count: number | bigint;
  params?: Record<string, string | number | bigint>;
}

/**
 * Resolves a compact ICU-like plural contract: `{count, plural, one {...} other {...}}`.
 * Existing catalogs remain plain strings; this helper is additive and safe for fallback.
 */
export function formatPluralMessage(
  template: string,
  { count, params = {} }: PluralMessageOptions
): string {
  const numericCount = typeof count === 'bigint' ? Number(count) : count;
  const pluralCategory = new Intl.PluralRules('en-BD').select(numericCount);
  const match = template.match(/^\{count,\s*plural,\s*one\s*\{([^{}]*)\}\s*other\s*\{([^{}]*)\}\s*\}$/);
  if (!match) {
    return formatLocalizedText(template, { ...params, count });
  }

  const selected = pluralCategory === 'one' ? match[1] : match[2];
  return formatLocalizedText(selected.replace(/#/g, String(count)), { ...params, count });
}

export function translateWithFallback(
  key: string,
  locale: string,
  params: Record<string, string | number | bigint> = {}
): string {
  const requested = getDictionary(normalizeToCanonicalLocale(locale)) as any;
  const fallback = getDictionary('bn-BD') as any;
  const english = getDictionary('en-BD') as any;

  const resolve = (dictionary: any): string | undefined => {
    const value = key.split('.').reduce((current, segment) => current?.[segment], dictionary);
    return typeof value === 'string' ? value : undefined;
  };

  const template = resolve(requested) ?? resolve(fallback) ?? resolve(english) ?? key;
  return template.includes('{count, plural,')
    ? formatPluralMessage(template, {
        count: typeof params.count === 'bigint' || typeof params.count === 'number' ? params.count : Number(params.count ?? 0),
        params,
      })
    : formatLocalizedText(template, params);
}
