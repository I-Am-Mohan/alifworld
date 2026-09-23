import { z } from 'zod';

export const OnboardingLocaleSchema = z.enum(['bn-BD', 'en-BD']);
export const OnboardingContentSchema = z.object({
  templateKey: z.string().trim().min(2).max(160).regex(/^[a-z0-9]+(?::[a-z0-9-]+)?$/),
  categoryId: z.string().min(4).optional().nullable(),
  locale: OnboardingLocaleSchema,
  name: z.string().trim().min(2).max(150),
  requiredFields: z.array(z.string().trim().min(1).max(80)).max(50),
  recommendedFields: z.array(z.string().trim().min(1).max(80)).max(50),
  attributeGuidance: z.array(z.object({ attributeId: z.string().min(4), label: z.string().trim().min(1).max(150), guidance: z.string().trim().max(500) })).max(100),
  mediaGuidance: z.array(z.string().trim().min(1).max(500)).max(20),
  titleExample: z.string().trim().max(200).optional().nullable(),
  descriptionExample: z.string().trim().max(2000).optional().nullable(),
  validationHints: z.array(z.string().trim().max(500)).max(50),
  version: z.number().int().positive().optional(),
  isActive: z.boolean().default(true),
});
export type OnboardingContentInput = z.infer<typeof OnboardingContentSchema>;

export const OnboardingProgressSchema = z.object({
  templateId: z.string().min(4),
  completedItems: z.array(z.string().trim().min(1).max(100)).max(100),
  dismissed: z.boolean().default(false),
});
export type OnboardingProgressInput = z.infer<typeof OnboardingProgressSchema>;
