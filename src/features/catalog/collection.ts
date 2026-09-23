import { z } from 'zod';

export const CollectionRuleSchema = z.object({
  status: z.enum(['PUBLISHED']).optional(),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  sellerId: z.string().optional(),
  minPricePoisha: z.number().int().nonnegative().optional(),
  maxPricePoisha: z.number().int().nonnegative().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
}).strict().refine((rule) => !rule.minPricePoisha || !rule.maxPricePoisha || rule.minPricePoisha <= rule.maxPricePoisha, { message: 'Minimum price cannot exceed maximum price.' });

const CollectionInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().toLowerCase().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().max(1000).nullable().optional(),
  collectionType: z.enum(['CURATED', 'RULE_BASED']),
  rule: CollectionRuleSchema.nullable().optional(),
  displayOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

const validateCollectionInput = (value: z.infer<typeof CollectionInputSchema>, ctx: z.RefinementCtx) => {
  if (value.collectionType === 'RULE_BASED' && !value.rule) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['rule'], message: 'Rule-based collections require a rule.' });
  if (value.collectionType === 'CURATED' && value.rule) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['rule'], message: 'Curated collections do not accept a rule.' });
};

export const CreateCollectionSchema = CollectionInputSchema.superRefine(validateCollectionInput);
export const UpdateCollectionSchema = CollectionInputSchema.partial().extend({ version: z.number().int().positive() });
export const CollectionProductsSchema = z.object({ productIds: z.array(z.string().min(4)).min(1).max(500), version: z.number().int().positive() });
export type CreateCollectionInput = z.infer<typeof CreateCollectionSchema>;
export type UpdateCollectionInput = z.infer<typeof UpdateCollectionSchema>;
export type CollectionProductsInput = z.infer<typeof CollectionProductsSchema>;
