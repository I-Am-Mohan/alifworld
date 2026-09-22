import { bn } from './bn';
import { en } from './en';

export type TranslationSchema = typeof en;

/**
 * Registry of language translation dictionaries.
 * Additional languages can be dynamically registered at runtime via registerTranslation().
 */
const dictionaries: Record<string, any> = {
  bn,
  en,
};

export function registerTranslation(localeCode: string, dictionary: any) {
  dictionaries[localeCode.toLowerCase()] = dictionary;
}

export function getDictionary(localeCode: string): TranslationSchema {
  const code = localeCode.toLowerCase();
  if (dictionaries[code]) {
    return dictionaries[code];
  }
  // Fallback to Bengali or English
  return dictionaries['bn'] || dictionaries['en'];
}

export { bn, en };
