import { z } from 'zod';
import { CatalogLocaleSchema } from './localization';

export const TaxonomySeoSchema = z.object({
  locale: CatalogLocaleSchema,
  seoTitle: z.string().trim().max(255).optional().nullable(),
  seoDescription: z.string().trim().max(500).optional().nullable(),
  breadcrumbLabel: z.string().trim().max(150).optional().nullable(),
});
export type TaxonomySeoInput = z.infer<typeof TaxonomySeoSchema>;

export const CategoryTranslationWriteSchema = z.object({
  locale: CatalogLocaleSchema,
  name: z.string().min(2).max(150),
  description: z.string().max(1000).optional().nullable(),
  seoTitle: z.string().trim().max(255).optional().nullable(),
  seoDescription: z.string().trim().max(500).optional().nullable(),
  breadcrumbLabel: z.string().trim().max(150).optional().nullable(),
});

export const BrandTranslationWriteSchema = z.object({
  locale: CatalogLocaleSchema,
  name: z.string().min(2).max(150),
  seoTitle: z.string().trim().max(255).optional().nullable(),
  seoDescription: z.string().trim().max(500).optional().nullable(),
  breadcrumbLabel: z.string().trim().max(150).optional().nullable(),
});
