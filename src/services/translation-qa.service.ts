import { z } from 'zod';
import { getCatalogMessage, buildLaunchCatalogQaReport } from '@/i18n/catalog-qa';
import { CANONICAL_LOCALES } from '@/i18n/config';
import { I18nService } from '@/services/i18n.service';

export const catalogQaQuerySchema = z.object({
  referenceLocale: z.enum(CANONICAL_LOCALES).default('en-BD'),
  targetLocale: z.enum(CANONICAL_LOCALES).default('bn-BD'),
  expansionLimit: z.coerce.number().finite().min(1).max(10).default(2.5),
});

export class TranslationQaService {
  constructor(private readonly i18nService = new I18nService()) {}

  async getOverview(referenceLocale: string, targetLocale: string, expansionLimit: number) {
    const reports = buildLaunchCatalogQaReport(expansionLimit).filter(
      (report) => report.referenceLocale === referenceLocale && report.targetLocale === targetLocale
    );
    const report = reports[0] ?? buildLaunchCatalogQaReport(expansionLimit)[0];
    const config = await this.i18nService.getConfig();
    return {
      ...report,
      configuredLanguages: config.languages,
      defaultLocale: config.defaultLocale,
      checkedAt: new Date().toISOString(),
    };
  }

  async getMessage(locale: string, key: string) {
    return {
      locale,
      key,
      value: getCatalogMessage(locale, key),
    };
  }
}
