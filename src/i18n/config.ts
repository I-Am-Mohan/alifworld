import { LanguageDefinition, I18nConfig } from './types';

export const DEFAULT_LOCALE = 'bn';
export const LOCALE_COOKIE_NAME = 'aw_locale';
export const LOCALE_STORAGE_KEY = 'alifworld_locale';

/**
 * Default supported languages in AlifWorld.
 * Dynamic addition of future languages (e.g. Arabic, Hindi) is supported via Admin API.
 */
export const INITIAL_LANGUAGES: LanguageDefinition[] = [
  {
    code: 'bn',
    name: 'বাংলা',
    nativeName: 'বাংলা',
    wordForLanguage: 'ভাষা',
    direction: 'ltr',
    isDefault: true,
    isActive: true,
  },
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    wordForLanguage: 'Language',
    direction: 'ltr',
    isDefault: false,
    isActive: true,
  },
];

export const INITIAL_I18N_CONFIG: I18nConfig = {
  defaultLocale: DEFAULT_LOCALE,
  languages: INITIAL_LANGUAGES,
};

export type LanguageSwitchMode =
  | { mode: 'hidden' }
  | {
      mode: 'dropdown';
      label: string;
      currentLanguage: LanguageDefinition;
      availableLanguages: LanguageDefinition[];
      rule: 'two_language_opposite' | 'multi_language_current';
    };

/**
 * Evaluates the UX rules for displaying the language switcher:
 * 1. If language list has <= 1 active language: Do NOT show language change option (mode: 'hidden').
 * 2. If language list has exactly 2 active languages:
 *    - Mode is 'dropdown' (shows options in dropdown, does NOT directly switch).
 *    - Button label displays opposite language word (e.g. if site in English, shows "ভাষা"; if in Bengali, shows "Language").
 *    - Has a proper SVG dropdown icon (ChevronDown).
 * 3. If language list has >= 3 active languages:
 *    - Mode is 'dropdown' displaying current chosen language native name and list of all options.
 */
export function getLanguageSwitchMode(
  currentLocale: string,
  languages: LanguageDefinition[]
): LanguageSwitchMode {
  const activeLanguages = languages.filter((l) => l.isActive);

  // Rule 1: Only 1 active language -> hide
  if (activeLanguages.length <= 1) {
    return { mode: 'hidden' };
  }

  // Rule 2: Exactly 2 active languages -> dropdown with opposite language word on button
  if (activeLanguages.length === 2) {
    const current = activeLanguages.find((l) => l.code === currentLocale) || activeLanguages[0];
    const opposite = activeLanguages.find((l) => l.code !== current.code) || activeLanguages[1];

    // If site is in English ('en'), button label is Bengali word "ভাষা"
    // If site is in Bengali ('bn'), button label is English word "Language"
    return {
      mode: 'dropdown',
      label: opposite.wordForLanguage,
      currentLanguage: current,
      availableLanguages: activeLanguages,
      rule: 'two_language_opposite',
    };
  }

  // Rule 3: 3 or more active languages -> dropdown with current chosen language on button
  const currentLanguage =
    activeLanguages.find((l) => l.code === currentLocale) || activeLanguages[0];

  return {
    mode: 'dropdown',
    label: currentLanguage.nativeName || currentLanguage.name,
    currentLanguage,
    availableLanguages: activeLanguages,
    rule: 'multi_language_current',
  };
}
