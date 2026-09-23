import { z } from 'zod';

export const CatalogLocaleSchema = z
  .string()
  .trim()
  .regex(/^[a-z]{2}(?:-[A-Z]{2})?$/, 'Locale must be a valid BCP 47 language or regional tag');

export type CatalogLocale = z.infer<typeof CatalogLocaleSchema>;

export const LocalizedProductTranslationSchema = z.object({
  locale: CatalogLocaleSchema,
  title: z.string().min(3).max(200),
  description: z.string().min(10),
  warranty: z.string().max(255).optional().nullable(),
  version: z.number().int().min(1).optional(),
});

export const LocalizedCategoryTranslationSchema = z.object({
  locale: CatalogLocaleSchema,
  name: z.string().min(2).max(150),
  description: z.string().max(1000).optional().nullable(),
  seoTitle: z.string().trim().max(255).optional().nullable(),
  seoDescription: z.string().trim().max(500).optional().nullable(),
  breadcrumbLabel: z.string().trim().max(150).optional().nullable(),
  version: z.number().int().min(1).optional(),
});

export const LocalizedBrandTranslationSchema = z.object({
  locale: CatalogLocaleSchema,
  name: z.string().min(2).max(150),
  seoTitle: z.string().trim().max(255).optional().nullable(),
  seoDescription: z.string().trim().max(500).optional().nullable(),
  breadcrumbLabel: z.string().trim().max(150).optional().nullable(),
  version: z.number().int().min(1).optional(),
});

export const TaxRuleStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']);
const TaxRuleWriteBaseSchema = z.object({
  jurisdiction: z.literal('BD').default('BD'),
  categoryId: z.string().min(4).optional().nullable(),
  name: z.string().trim().min(2).max(150),
  taxType: z.string().trim().min(2).max(40).default('VAT'),
  ratePercent: z.number().min(0).max(100),
  priceIncludesTax: z.boolean().default(false),
  effectiveFrom: z.coerce.date(),
  effectiveTo: z.coerce.date().optional().nullable(),
  status: TaxRuleStatusSchema.default('DRAFT'),
});
export const TaxRuleWriteSchema = TaxRuleWriteBaseSchema.superRefine((input, ctx) => {
  if (input.effectiveTo && input.effectiveTo <= input.effectiveFrom) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['effectiveTo'], message: 'Effective end must be after effective start.' });
});
export const TaxRuleUpdateSchema = TaxRuleWriteBaseSchema.partial().extend({ version: z.number().int().positive() });
export type TaxRuleWriteInput = z.infer<typeof TaxRuleWriteSchema>;
export type TaxRuleUpdateInput = z.infer<typeof TaxRuleUpdateSchema>;

export const CmsContentStatusSchema = z.enum(['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED']);
export type CmsContentStatus = z.infer<typeof CmsContentStatusSchema>;

export const CreateCmsContentSchema = z.object({
  contentType: z.string().trim().min(2).max(80),
  slug: z.string().trim().min(2).max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  status: CmsContentStatusSchema.default('DRAFT'),
  translations: z.array(
    z.object({
      locale: CatalogLocaleSchema,
      title: z.string().min(1).max(200),
      body: z.record(z.unknown()),
      seoTitle: z.string().max(255).optional().nullable(),
      seoDescription: z.string().max(500).optional().nullable(),
    })
  ).min(1),
});

export const UpdateCmsContentSchema = CreateCmsContentSchema.partial().extend({
  version: z.number().int().min(1),
});

export type CreateCmsContentInput = z.infer<typeof CreateCmsContentSchema>;
export type UpdateCmsContentInput = z.infer<typeof UpdateCmsContentSchema>;

export function normalizeCatalogLocale(locale?: string | null): string {
  const clean = (locale || 'bn-BD').trim().replace(/_/g, '-');
  const [language, region] = clean.split('-');
  return region ? `${language.toLowerCase()}-${region.toUpperCase()}` : language.toLowerCase();
}

export function localeCandidates(locale?: string | null): string[] {
  const normalized = normalizeCatalogLocale(locale);
  const short = normalized.split('-')[0];
  const fallback = normalized.startsWith('en') ? ['en-BD', 'en'] : ['bn-BD', 'bn'];
  return [...new Set([normalized, short, ...fallback])];
}
