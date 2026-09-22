/**
 * AlifWorld Dynamic Internationalization & Language Management Service
 * 
 * Supports:
 * - Dynamic addition of new platform languages (e.g. Arabic, Hindi, Urdu)
 * - Administrative setting of system-wide default language
 * - Status activation/deactivation of languages
 * - Dynamic language list retrieval with 1-lang / 2-lang / 3+-lang rule evaluation
 * 
 * Invariants: ADR-0022, ADR-0030
 */

import { prisma as defaultPrisma, getPrismaClient } from '@/shared/database/prisma';
import { ValidationError, NotFoundError, ConflictError } from '@/shared/errors/app-error';
import { LanguageDefinition, I18nConfig } from '@/i18n/types';
import { INITIAL_I18N_CONFIG, DEFAULT_LOCALE, INITIAL_LANGUAGES } from '@/i18n/config';

export const I18N_CONFIG_KEY = 'i18n.locale_config';

export interface AddLanguageInput {
  code: string;
  name: string;
  nativeName: string;
  wordForLanguage: string;
  direction?: 'ltr' | 'rtl';
  isActive?: boolean;
}

export interface UpdateLanguageInput {
  name?: string;
  nativeName?: string;
  wordForLanguage?: string;
  direction?: 'ltr' | 'rtl';
  isActive?: boolean;
}

export class I18nService {
  private prisma: any;
  // In-memory fallback / cache for fast access & resilience
  private static cachedConfig: I18nConfig = INITIAL_I18N_CONFIG;

  constructor(prismaClient?: any) {
    this.prisma = prismaClient || defaultPrisma || getPrismaClient();
  }

  /**
   * Retrieves the current system language configuration.
   * If not yet persisted in SystemConfig, initializes with default config.
   */
  async getConfig(): Promise<I18nConfig> {
    try {
      if (this.prisma?.systemConfig) {
        const record = await this.prisma.systemConfig.findUnique({
          where: { key: I18N_CONFIG_KEY },
        });

        if (record && record.value) {
          const parsed = JSON.parse(record.value) as I18nConfig;
          I18nService.cachedConfig = parsed;
          return parsed;
        }

        // Initialize default record
        await this.prisma.systemConfig.upsert({
          where: { key: I18N_CONFIG_KEY },
          create: {
            key: I18N_CONFIG_KEY,
            value: JSON.stringify(INITIAL_I18N_CONFIG),
            description: 'Platform supported languages and system default locale',
            isPublic: true,
          },
          update: {},
        });
      }
    } catch {
      // In-memory fallback if database query fails
    }

    return I18nService.cachedConfig;
  }

  /**
   * Sets the platform default language.
   * Only an active, registered language can be designated as the default.
   */
  async setDefaultLocale(code: string): Promise<I18nConfig> {
    const cleanCode = code.trim().toLowerCase();
    const config = await this.getConfig();

    const targetLang = config.languages.find((l) => l.code === cleanCode);
    if (!targetLang) {
      throw new NotFoundError(`Language '${cleanCode}' is not registered in system`);
    }

    if (!targetLang.isActive) {
      throw new ValidationError(`Cannot set inactive language '${cleanCode}' as default language`);
    }

    // Update flags
    const updatedLanguages = config.languages.map((l) => ({
      ...l,
      isDefault: l.code === cleanCode,
    }));

    const newConfig: I18nConfig = {
      defaultLocale: cleanCode,
      languages: updatedLanguages,
    };

    await this.persistConfig(newConfig);
    return newConfig;
  }

  /**
   * Dynamically registers a new language in the platform.
   */
  async addLanguage(input: AddLanguageInput): Promise<I18nConfig> {
    const code = input.code.trim().toLowerCase();

    if (!code || code.length < 2 || code.length > 8 || !/^[a-z]+(-[a-z]+)?$/i.test(code)) {
      throw new ValidationError(
        'Language code must be 2-8 characters matching ISO format (e.g. "ar", "hi", "en-US")'
      );
    }

    if (!input.name?.trim()) {
      throw new ValidationError('Language display name is required');
    }

    if (!input.nativeName?.trim()) {
      throw new ValidationError('Language native name is required (e.g. "العربية", "हिन्दी")');
    }

    if (!input.wordForLanguage?.trim()) {
      throw new ValidationError(
        'Word for language in this language is required (e.g. "لغة", "भाषा")'
      );
    }

    const config = await this.getConfig();
    if (config.languages.some((l) => l.code === code)) {
      throw new ConflictError(`Language with code '${code}' already exists`);
    }

    const newLang: LanguageDefinition = {
      code,
      name: input.name.trim(),
      nativeName: input.nativeName.trim(),
      wordForLanguage: input.wordForLanguage.trim(),
      direction: input.direction || 'ltr',
      isActive: input.isActive !== false,
      isDefault: false,
    };

    const newConfig: I18nConfig = {
      ...config,
      languages: [...config.languages, newLang],
    };

    await this.persistConfig(newConfig);
    return newConfig;
  }

  /**
   * Updates metadata or active status for an existing language.
   */
  async updateLanguage(code: string, updates: UpdateLanguageInput): Promise<I18nConfig> {
    const cleanCode = code.trim().toLowerCase();
    const config = await this.getConfig();

    const existingIndex = config.languages.findIndex((l) => l.code === cleanCode);
    if (existingIndex === -1) {
      throw new NotFoundError(`Language '${cleanCode}' not found`);
    }

    // Safety check: Cannot deactivate default language
    if (updates.isActive === false && config.defaultLocale === cleanCode) {
      throw new ValidationError(
        `Cannot deactivate default language '${cleanCode}'. Please change default language first.`
      );
    }

    const updatedLang = {
      ...config.languages[existingIndex],
      ...(updates.name ? { name: updates.name.trim() } : {}),
      ...(updates.nativeName ? { nativeName: updates.nativeName.trim() } : {}),
      ...(updates.wordForLanguage ? { wordForLanguage: updates.wordForLanguage.trim() } : {}),
      ...(updates.direction ? { direction: updates.direction } : {}),
      ...(updates.isActive !== undefined ? { isActive: updates.isActive } : {}),
    };

    const newLanguages = [...config.languages];
    newLanguages[existingIndex] = updatedLang;

    const newConfig: I18nConfig = {
      ...config,
      languages: newLanguages,
    };

    await this.persistConfig(newConfig);
    return newConfig;
  }

  /**
   * Deactivates or removes a language from the system.
   */
  async deleteLanguage(code: string): Promise<I18nConfig> {
    const cleanCode = code.trim().toLowerCase();
    const config = await this.getConfig();

    if (config.defaultLocale === cleanCode) {
      throw new ValidationError(
        `Cannot remove default language '${cleanCode}'. Please change default language first.`
      );
    }

    if (config.languages.length <= 1) {
      throw new ValidationError('Cannot remove the only registered language in the platform');
    }

    const newLanguages = config.languages.filter((l) => l.code !== cleanCode);
    if (newLanguages.length === config.languages.length) {
      throw new NotFoundError(`Language '${cleanCode}' not found`);
    }

    const newConfig: I18nConfig = {
      ...config,
      languages: newLanguages,
    };

    await this.persistConfig(newConfig);
    return newConfig;
  }

  /**
   * Writes the updated configuration to SystemConfig and cache.
   */
  private async persistConfig(newConfig: I18nConfig): Promise<void> {
    I18nService.cachedConfig = newConfig;

    try {
      if (this.prisma?.systemConfig) {
        await this.prisma.systemConfig.upsert({
          where: { key: I18N_CONFIG_KEY },
          create: {
            key: I18N_CONFIG_KEY,
            value: JSON.stringify(newConfig),
            description: 'Platform supported languages and system default locale',
            isPublic: true,
          },
          update: {
            value: JSON.stringify(newConfig),
            updatedAt: new Date(),
          },
        });
      }
    } catch {
      // Retain memory cache if database write fails
    }
  }
}
