export interface LanguageDefinition {
  code: string; // e.g. 'bn', 'en', 'ar'
  name: string; // e.g. 'বাংলা', 'English'
  nativeName: string; // e.g. 'বাংলা', 'English'
  wordForLanguage: string; // e.g. 'ভাষা' for Bengali, 'Language' for English
  direction?: 'ltr' | 'rtl';
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
