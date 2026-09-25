import { z } from 'zod';

export const PriceListChannelEnum = z.enum(['RETAIL', 'B2B', 'CAMPAIGN', 'NEGOTIATED']);
export const PriceListStatusEnum = z.enum(['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED']);

export const CreatePriceListSchema = z.object({
  code: z.string().min(3).max(30).regex(/^[A-Za-z0-9_-]+$/).transform((v) => v.toUpperCase()),
  name: z.string().min(3).max(200),
  description: z.string().max(1000).optional(),
  channel: PriceListChannelEnum.default('RETAIL'),
  currency: z.string().default('BDT'),
  buyerSegment: z.string().max(100).optional().nullable(),
  priority: z.number().int().min(0).default(0),
  startsAt: z.string().datetime().or(z.date()).optional().nullable(),
  endsAt: z.string().datetime().or(z.date()).optional().nullable(),
  status: PriceListStatusEnum.default('ACTIVE'),
  sellerId: z.string().uuid().optional().nullable(),
});

export const UpdatePriceListSchema = CreatePriceListSchema.partial();

export const CreatePriceListRuleSchema = z.object({
  priceListId: z.string().uuid(),
  productId: z.string().uuid().optional().nullable(),
  variantId: z.string().uuid().optional().nullable(),
  pricePoisha: z.union([z.string(), z.number(), z.bigint()]).transform((val) => BigInt(val)),
  compareAtPricePoisha: z.union([z.string(), z.number(), z.bigint()]).optional().nullable().transform((val) => val != null ? BigInt(val) : null),
  minQuantity: z.number().int().min(1).default(1),
  maxQuantity: z.number().int().min(1).optional().nullable(),
  productPointOverride: z.number().int().min(0).optional().nullable(),
}).refine((data) => data.productId || data.variantId, {
  message: 'At least one of productId or variantId must be specified for a price list rule',
  path: ['variantId'],
});

export const ResolvePriceQuerySchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1).default(1),
  channel: PriceListChannelEnum.default('RETAIL'),
  buyerSegment: z.string().optional(),
});

export const QuoteLineItemInputSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1).default(1),
  sellerId: z.string().uuid().optional(),
});

export const CalculateQuoteSchema = z.object({
  lineItems: z.array(QuoteLineItemInputSchema).min(1, 'At least one line item is required'),
  channel: PriceListChannelEnum.default('RETAIL'),
  buyerSegment: z.string().optional().nullable(),
  couponCode: z.string().optional().nullable(),
  shippingFeePoisha: z.union([z.string(), z.number(), z.bigint()]).default(0).transform((val) => BigInt(val)),
  priceIncludesTax: z.boolean().default(false),
});

export const QueryPriceHistorySchema = z.object({
  variantId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  sellerId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const QueryScheduledPricesSchema = z.object({
  variantId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  sellerId: z.string().uuid().optional(),
  channel: PriceListChannelEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const UpdateVariantPriceSchema = z.object({
  variantId: z.string().uuid(),
  pricePoisha: z.union([z.string(), z.number(), z.bigint()]).transform((val) => BigInt(val)),
  compareAtPricePoisha: z.union([z.string(), z.number(), z.bigint()]).optional().nullable().transform((val) => val != null ? BigInt(val) : null).default(null),
  reason: z.string().max(500).optional(),
});

export type CreatePriceListInput = z.infer<typeof CreatePriceListSchema>;
export type UpdatePriceListInput = z.infer<typeof UpdatePriceListSchema>;
export type CreatePriceListRuleInput = z.infer<typeof CreatePriceListRuleSchema>;
export type ResolvePriceQueryInput = z.infer<typeof ResolvePriceQuerySchema>;
export type QuoteLineItemInput = z.infer<typeof QuoteLineItemInputSchema>;
export type CalculateQuoteInput = z.infer<typeof CalculateQuoteSchema>;
export type CalculateQuoteRawInput = z.input<typeof CalculateQuoteSchema>;
export type QueryPriceHistoryInput = z.infer<typeof QueryPriceHistorySchema>;
export type QueryPriceHistoryRawInput = z.input<typeof QueryPriceHistorySchema>;
export type QueryScheduledPricesInput = z.infer<typeof QueryScheduledPricesSchema>;
export type QueryScheduledPricesRawInput = z.input<typeof QueryScheduledPricesSchema>;
export type UpdateVariantPriceInput = z.infer<typeof UpdateVariantPriceSchema>;
export type UpdateVariantPriceRawInput = z.input<typeof UpdateVariantPriceSchema>;
