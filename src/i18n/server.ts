/**
 * AlifWorld Server-Side Translation & Locale Access Utilities
 * 
 * Provides server-side translation resolution, message interpolation,
 * and locale extraction for Next.js Server Components and Route Handlers.
 * 
 * Invariants: ADR-0003, Phase 06 Milestone 051
 */

import { headers } from 'next/headers';
import { CanonicalLocale } from './types';
import { DEFAULT_LOCALE, normalizeToCanonicalLocale } from './config';
import { getDictionary, resolveTranslationValue, TranslationSchema } from './translations';
import { formatPluralMessage } from './fallback';
import { formatLocalizedText } from '@/shared/utils/localization';

/**
 * Extracts the negotiated locale from request headers in Server Components.
 */
export function getServerLocale(headersList?: Headers): CanonicalLocale {
  try {
    const activeHeaders = headersList || headers();
    const headerLocale = activeHeaders.get('x-locale');
    if (headerLocale) {
      return normalizeToCanonicalLocale(headerLocale);
    }
  } catch {
    // headers() might not be available in certain isolated test contexts
  }
  return DEFAULT_LOCALE;
}

/**
 * Retrieves the translation dictionary for server-side rendering.
 */
export function getServerTranslations(locale?: string): TranslationSchema {
  const activeLocale = locale ? normalizeToCanonicalLocale(locale) : getServerLocale();
  return getDictionary(activeLocale);
}

/**
 * Formats a localized message on the server with parameter interpolation.
 */
export function formatServerMessage(
  path: string,
  params?: Record<string, string | number>,
  locale?: string
): string {
  const dict = getServerTranslations(locale);
  const resolved = resolveTranslationValue(dict, path, params);

  const formatResolved = (message: string): string =>
    params && message.includes('{count, plural,')
      ? formatPluralMessage(message, {
          count: typeof params.count === 'number' ? params.count : Number(params.count ?? 0),
          params,
        })
      : formatLocalizedText(message, params);

  if (resolved !== null) {
    return formatResolved(resolved);
  }

  // Fallback to default dictionary if missing in requested language
  const fallbackDict = getDictionary(DEFAULT_LOCALE);
  const fallback = resolveTranslationValue(fallbackDict, path, params);
  if (fallback !== null) {
    return formatResolved(fallback);
  }

  // Return key path if missing from all dictionaries
  return path;
}

/**
 * Creates a pre-bound translation function for a specific locale.
 */
export function createTranslator(
  locale?: string
): (path: string, params?: Record<string, string | number>) => string {
  const activeLocale = locale ? normalizeToCanonicalLocale(locale) : getServerLocale();
  return (path: string, params?: Record<string, string | number>) => {
    return formatServerMessage(path, params, activeLocale);
  };
}
