export type CanonicalLocale = 'bn-BD' | 'en-BD';
export type SupportedLocale = 'bn-BD' | 'en-BD' | 'bn' | 'en';
export type LocaleDirection = 'ltr' | 'rtl';

export type LocaleNegotiationSource =
  | 'path'
  | 'query'
  | 'header'
  | 'cookie'
  | 'accept-language'
  | 'default';

export interface LanguageDefinition {
  code: string; // e.g. 'bn-BD', 'en-BD', 'bn', 'en', 'ar'
  name: string; // e.g. 'বাংলা (বাংলাদেশ)', 'English (Bangladesh)'
  nativeName: string; // e.g. 'বাংলা', 'English'
  wordForLanguage: string; // e.g. 'ভাষা' for Bengali, 'Language' for English
  direction?: LocaleDirection;
  isDefault?: boolean;
  isActive: boolean;
  flag?: string;
}

export interface I18nConfig {
  defaultLocale: string;
  languages: LanguageDefinition[];
}

export interface TranslationDictionary {
  [key: string]: string | TranslationDictionary;
}

export interface ResolvedLocaleInfo {
  locale: CanonicalLocale | string;
  shortCode: string;
  source: LocaleNegotiationSource;
  direction: LocaleDirection;
  language: LanguageDefinition;
}
