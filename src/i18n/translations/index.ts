import { bn } from './bn';
import { en } from './en';

export type TranslationSchema = typeof en;

/**
 * Registry of language translation dictionaries.
 * Indexed by canonical BCP 47 locale codes and short codes.
 */
const dictionaries: Record<string, any> = {
  bn,
  en,
  'bn-bd': bn,
  'en-bd': en,
};

/**
 * Registers a translation dictionary for a given locale code.
 */
export function registerTranslation(localeCode: string, dictionary: any): void {
  const clean = localeCode.trim().toLowerCase().replace(/_/g, '-');
  dictionaries[clean] = dictionary;

  // Also register short prefix if length is 5 (e.g. 'bn-bd' -> 'bn')
  if (clean.includes('-')) {
    const short = clean.split('-')[0];
    if (!dictionaries[short]) {
      dictionaries[short] = dictionary;
    }
  }
}

/**
 * Retrieves the translation dictionary for a given locale with fallback chains.
 */
export function getDictionary(localeCode?: string | null): TranslationSchema {
  if (!localeCode) {
    return dictionaries['bn-bd'] || dictionaries['bn'] || dictionaries['en'];
  }

  const clean = localeCode.trim().toLowerCase().replace(/_/g, '-');

  // 1. Direct match (e.g. 'bn-bd', 'bn', 'en-bd', 'en')
  if (dictionaries[clean]) {
    return dictionaries[clean];
  }

  // 2. Short code match (e.g. 'bn-bd' -> 'bn')
  if (clean.includes('-')) {
    const short = clean.split('-')[0];
    if (dictionaries[short]) {
      return dictionaries[short];
    }
  }

  // 3. Fallback to default Bangladesh Bengali dictionary
  return dictionaries['bn-bd'] || dictionaries['bn'] || dictionaries['en'];
}

/**
 * Resolves a nested translation key (e.g. 'store.hero.title') from a dictionary
 * and interpolates dynamic parameters (e.g. {location}).
 */
export function resolveTranslationValue(
  dict: any,
  path: string,
  params?: Record<string, string | number>
): string | null {
  if (!dict || !path) return null;

  const keys = path.split('.');
  let current = dict;

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return null;
    }
  }

  if (typeof current !== 'string') {
    return null;
  }

  // Parameter interpolation: {name} -> value
  if (params && Object.keys(params).length > 0) {
    let result = current;
    for (const [paramKey, paramVal] of Object.entries(params)) {
      result = result.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
    }
    return result;
  }

  return current;
}

export { bn, en };
