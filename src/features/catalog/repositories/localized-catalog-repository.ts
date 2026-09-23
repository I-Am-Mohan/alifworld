import { prisma } from '@/shared/database/prisma';
import { generatePrefixedId, ENTITY_PREFIXES } from '@/shared/utils/id';
import { localeCandidates } from '../localization';

export class LocalizedCatalogRepository {
  async findProductTranslation(productId: string, locale?: string) {
    const rows = await (prisma as any).productTranslation.findMany({
      where: { productId, locale: { in: localeCandidates(locale) } },
      orderBy: { updatedAt: 'desc' },
    });
    return this.selectBest(rows, locale);
  }

  async findCategoryTranslation(categoryId: string, locale?: string) {
    const rows = await (prisma as any).categoryTranslation.findMany({
      where: { categoryId, locale: { in: localeCandidates(locale) } },
      orderBy: { updatedAt: 'desc' },
    });
    return this.selectBest(rows, locale);
  }

  async findBrandTranslation(brandId: string, locale?: string) {
    const rows = await (prisma as any).brandTranslation.findMany({
      where: { brandId, locale: { in: localeCandidates(locale) } },
      orderBy: { updatedAt: 'desc' },
    });
    return this.selectBest(rows, locale);
  }

  async upsertProductTranslation(productId: string, input: { locale: string; title: string; description: string; warranty?: string | null; version?: number }) {
    return (prisma as any).productTranslation.upsert({
      where: { productId_locale: { productId, locale: input.locale } },
      create: { id: generatePrefixedId(ENTITY_PREFIXES.PRODUCT_TRANSLATION), productId, ...input, version: 1 },
      update: { title: input.title, description: input.description, warranty: input.warranty, version: { increment: 1 } },
    });
  }

  async upsertCategoryTranslation(categoryId: string, input: { locale: string; name: string; description?: string | null; seoTitle?: string | null; seoDescription?: string | null; breadcrumbLabel?: string | null }) {
    return (prisma as any).categoryTranslation.upsert({
      where: { categoryId_locale: { categoryId, locale: input.locale } },
      create: { id: generatePrefixedId(ENTITY_PREFIXES.CATEGORY_TRANSLATION), categoryId, ...input, version: 1 },
      update: { name: input.name, description: input.description, seoTitle: input.seoTitle, seoDescription: input.seoDescription, breadcrumbLabel: input.breadcrumbLabel, version: { increment: 1 } },
    });
  }

  async upsertBrandTranslation(brandId: string, input: { locale: string; name: string; seoTitle?: string | null; seoDescription?: string | null; breadcrumbLabel?: string | null }) {
    return (prisma as any).brandTranslation.upsert({
      where: { brandId_locale: { brandId, locale: input.locale } },
      create: { id: generatePrefixedId(ENTITY_PREFIXES.BRAND_TRANSLATION), brandId, ...input, version: 1 },
      update: { name: input.name, seoTitle: input.seoTitle, seoDescription: input.seoDescription, breadcrumbLabel: input.breadcrumbLabel, version: { increment: 1 } },
    });
  }

  private selectBest<T extends { locale: string }>(rows: T[], locale?: string): T | null {
    const candidates = localeCandidates(locale);
    for (const candidate of candidates) {
      const match = rows.find((row) => row.locale === candidate);
      if (match) return match;
    }
    return null;
  }
}
