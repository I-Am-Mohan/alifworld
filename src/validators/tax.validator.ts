import { z } from 'zod';

export const TaxStatusEnum = z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']);

export const CalculateTaxLineItemSchema = z.object({
  lineItemId: z.string().optional(),
  title: z.string().min(1),
  netPricePoisha: z.union([z.string(), z.number(), z.bigint()]).transform((val) => BigInt(val)),
  quantity: z.number().int().min(1).default(1),
  taxRatePercent: z.number().min(0).max(100).optional(),
  productTaxRatePercent: z.number().min(0).max(100).optional().nullable(),
  categoryTaxRatePercent: z.number().min(0).max(100).optional().nullable(),
  priceIncludesTax: z.boolean().default(false),
  taxType: z.string().default('VAT'),
  taxRuleId: z.string().optional().nullable(),
});

export const CalculateTaxSchema = z.object({
  jurisdiction: z.string().default('BD'),
  effectiveDate: z.string().datetime().or(z.date()).optional(),
  lines: z.array(CalculateTaxLineItemSchema).min(1),
});

export const CreateTaxRuleSchema = z.object({
  jurisdiction: z.string().default('BD'),
  categoryId: z.string().uuid().optional().nullable(),
  name: z.string().min(3).max(200),
  taxType: z.string().default('VAT'),
  ratePercent: z.number().min(0).max(100),
  priceIncludesTax: z.boolean().default(false),
  effectiveFrom: z.string().datetime().or(z.date()),
  effectiveTo: z.string().datetime().or(z.date()).optional().nullable(),
  status: TaxStatusEnum.default('ACTIVE'),
});

export const UpdateTaxRuleSchema = CreateTaxRuleSchema.partial().extend({
  version: z.number().int().optional(),
});

export type CalculateTaxInput = z.infer<typeof CalculateTaxSchema>;
export type CreateTaxRuleInput = z.infer<typeof CreateTaxRuleSchema>;
export type UpdateTaxRuleInput = z.infer<typeof UpdateTaxRuleSchema>;
