import { describe, it, expect, beforeEach } from 'bun:test';
import { getLanguageSwitchMode, INITIAL_LANGUAGES, DEFAULT_LOCALE } from '../../src/i18n/config';
import { LanguageDefinition } from '../../src/i18n/types';
import { I18nService } from '../../src/services/i18n.service';
import { ValidationError, NotFoundError, ConflictError } from '../../src/shared/errors/app-error';

describe('Dynamic i18n & Language Switcher Rules', () => {
  // Test 1: 1 Language -> Mode is 'hidden'
  describe('Rule 1: Single Language Active', () => {
    it('returns mode "hidden" when only 1 active language is configured', () => {
      const singleLang: LanguageDefinition[] = [
        {
          code: 'bn',
          name: 'বাংলা',
          nativeName: 'বাংলা',
          wordForLanguage: 'ভাষা',
          direction: 'ltr',
          isDefault: true,
          isActive: true,
        },
      ];

      const result = getLanguageSwitchMode('bn', singleLang);
      expect(result.mode).toBe('hidden');
    });

    it('returns mode "hidden" when multiple exist but only 1 is active', () => {
      const languages: LanguageDefinition[] = [
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
          isActive: false, // Inactive
        },
      ];

      const result = getLanguageSwitchMode('bn', languages);
      expect(result.mode).toBe('hidden');
    });
  });

  // Test 2: Exactly 2 Languages -> Mode is 'dropdown' with opposite word
  describe('Rule 2: Exactly Two Active Languages (Dropdown with Opposite Language Word)', () => {
    const twoLanguages: LanguageDefinition[] = [
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

    it('when current language is English ("en"), switcher mode is "dropdown" with Bengali label "ভাষা"', () => {
      const result = getLanguageSwitchMode('en', twoLanguages);
      expect(result.mode).toBe('dropdown');
      if (result.mode === 'dropdown') {
        expect(result.label).toBe('ভাষা');
        expect(result.availableLanguages.length).toBe(2);
        expect(result.rule).toBe('two_language_opposite');
      }
    });

    it('when current language is Bengali ("bn"), switcher mode is "dropdown" with English label "Language"', () => {
      const result = getLanguageSwitchMode('bn', twoLanguages);
      expect(result.mode).toBe('dropdown');
      if (result.mode === 'dropdown') {
        expect(result.label).toBe('Language');
        expect(result.availableLanguages.length).toBe(2);
        expect(result.rule).toBe('two_language_opposite');
      }
    });
  });

  // Test 3: 3+ Languages -> Mode is 'dropdown'
  describe('Rule 3: Three or More Active Languages (Dropdown with Current Language)', () => {
    const threeLanguages: LanguageDefinition[] = [
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
      {
        code: 'ar',
        name: 'Arabic',
        nativeName: 'العربية',
        wordForLanguage: 'لغة',
        direction: 'rtl',
        isDefault: false,
        isActive: true,
      },
    ];

    it('returns mode "dropdown" with current language displayed', () => {
      const result = getLanguageSwitchMode('bn', threeLanguages);
      expect(result.mode).toBe('dropdown');
      if (result.mode === 'dropdown') {
        expect(result.currentLanguage.code).toBe('bn');
        expect(result.currentLanguage.name).toBe('বাংলা');
        expect(result.availableLanguages.length).toBe(3);
      }
    });

    it('correctly sets currentLanguage when switching to Arabic', () => {
      const result = getLanguageSwitchMode('ar', threeLanguages);
      expect(result.mode).toBe('dropdown');
      if (result.mode === 'dropdown') {
        expect(result.currentLanguage.code).toBe('ar');
        expect(result.currentLanguage.nativeName).toBe('العربية');
      }
    });
  });

  // Test 4: I18nService Dynamic Language Operations
  describe('I18nService Operations & Data Validation', () => {
    let mockPrisma: any;
    let storedConfigJson: string;

    beforeEach(() => {
      storedConfigJson = JSON.stringify({
        defaultLocale: 'bn',
        languages: [...INITIAL_LANGUAGES],
      });

      mockPrisma = {
        systemConfig: {
          findUnique: async () => ({ value: storedConfigJson }),
          upsert: async (args: any) => {
            if (args.update?.value) storedConfigJson = args.update.value;
            if (args.create?.value) storedConfigJson = args.create.value;
            return { value: storedConfigJson };
          },
        },
      };
    });

    it('retrieves default initial configuration with bn and en', async () => {
      const service = new I18nService(mockPrisma);
      const config = await service.getConfig();

      expect(config.defaultLocale).toBe('bn');
      expect(config.languages.length).toBe(2);
      expect(config.languages.map((l) => l.code)).toEqual(['bn', 'en']);
    });

    it('adds a new language dynamically (e.g. Arabic)', async () => {
      const service = new I18nService(mockPrisma);
      const updatedConfig = await service.addLanguage({
        code: 'ar',
        name: 'Arabic',
        nativeName: 'العربية',
        wordForLanguage: 'لغة',
        direction: 'rtl',
      });

      expect(updatedConfig.languages.length).toBe(3);
      const ar = updatedConfig.languages.find((l) => l.code === 'ar');
      expect(ar).toBeDefined();
      expect(ar?.nativeName).toBe('العربية');
      expect(ar?.direction).toBe('rtl');
      expect(ar?.isActive).toBe(true);
    });

    it('rejects adding duplicate language code', async () => {
      const service = new I18nService(mockPrisma);
      expect(
        service.addLanguage({
          code: 'en',
          name: 'English duplicate',
          nativeName: 'English',
          wordForLanguage: 'Language',
        })
      ).rejects.toThrow(ConflictError);
    });

    it('rejects invalid language codes', async () => {
      const service = new I18nService(mockPrisma);
      expect(
        service.addLanguage({
          code: '1',
          name: 'Bad Code',
          nativeName: 'Bad Code',
          wordForLanguage: 'Word',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('updates platform default language to English', async () => {
      const service = new I18nService(mockPrisma);
      const config = await service.setDefaultLocale('en');

      expect(config.defaultLocale).toBe('en');
      const enLang = config.languages.find((l) => l.code === 'en');
      const bnLang = config.languages.find((l) => l.code === 'bn');
      expect(enLang?.isDefault).toBe(true);
      expect(bnLang?.isDefault).toBe(false);
    });

    it('rejects setting unregistered language as default', async () => {
      const service = new I18nService(mockPrisma);
      expect(service.setDefaultLocale('fr')).rejects.toThrow(NotFoundError);
    });

    it('prevents deactivating the default language', async () => {
      const service = new I18nService(mockPrisma);
      expect(service.updateLanguage('bn', { isActive: false })).rejects.toThrow(ValidationError);
    });

    it('prevents deleting the default language', async () => {
      const service = new I18nService(mockPrisma);
      expect(service.deleteLanguage('bn')).rejects.toThrow(ValidationError);
    });

    it('allows deleting a non-default language', async () => {
      const service = new I18nService(mockPrisma);
      const config = await service.deleteLanguage('en');

      expect(config.languages.length).toBe(1);
      expect(config.languages[0].code).toBe('bn');
    });
  });
});
