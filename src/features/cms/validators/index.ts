/**
 * AlifWorld CMS Validators
 *
 * Strict validation for storefront homepage sections, banners, and layout updates.
 *
 * Invariants: ADR-0003, ADR-0022
 */

import { z } from 'zod';

export const HeroBannerSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(2, 'Banner title is required'),
  titleBn: z.string().optional().nullable(),
  subtitle: z.string().optional().nullable(),
  subtitleBn: z.string().optional().nullable(),
  imageUrl: z.string().min(1, 'Image URL is required'),
  ctaText: z.string().min(1, 'CTA text is required'),
  ctaTextBn: z.string().optional().nullable(),
  ctaLink: z.string().min(1, 'CTA link is required'),
  badgeText: z.string().optional().nullable(),
  badgeTextBn: z.string().optional().nullable(),
  bgColor: z.string().optional().nullable(),
  order: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const HomeSectionTypeEnum = z.enum([
  'HERO_CAROUSEL',
  'FEATURE_HIGHLIGHTS',
  'FEATURED_CATEGORIES',
  'FLASH_SALE',
  'SPECIAL_REWARDS',
  'BRAND_SHOWCASE',
  'PROMO_BANNER',
]);

export const HomeSectionSchema = z.object({
  id: z.string().min(1),
  type: HomeSectionTypeEnum,
  title: z.string().min(2, 'Section title is required'),
  titleBn: z.string().optional().nullable(),
  subtitle: z.string().optional().nullable(),
  subtitleBn: z.string().optional().nullable(),
  order: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  data: z.record(z.any()).default({}),
});

export const UpdateHomepageLayoutSchema = z.object({
  version: z.number().int().min(1, 'Version is required for optimistic concurrency control'),
  status: z.enum(['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED']).default('PUBLISHED'),
  sections: z.array(HomeSectionSchema).min(1, 'At least one home section is required'),
});

export type UpdateHomepageLayoutInput = z.infer<typeof UpdateHomepageLayoutSchema>;

export const GetHomepageQuerySchema = z.object({
  locale: z.enum(['en-BD', 'bn-BD']).default('en-BD'),
});

export type GetHomepageQueryInput = z.infer<typeof GetHomepageQuerySchema>;
