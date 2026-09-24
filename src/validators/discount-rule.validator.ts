import { z } from 'zod';

export const DiscountTypeEnum = z.enum(['PERCENTAGE', 'FIXED_AMOUNT', 'BUY_X_GET_Y', 'FREE_SHIPPING']);
export const TargetScopeEnum = z.enum(['CART_SUBTOTAL', 'SPECIFIC_PRODUCTS', 'SPECIFIC_CATEGORIES', 'SPECIFIC_BRANDS', 'SHIPPING_FEE']);
export const DiscountStatusEnum = z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED', 'ARCHIVED']);
export const FundingTypeEnum = z.enum(['PLATFORM_FUNDED', 'SELLER_FUNDED', 'CO_FUNDED']);

export const BaseDiscountRuleSchema = z.object({
  code: z.string().min(3).max(30).regex(/^[A-Za-z0-9_-]+$/).optional().nullable().transform((v) => v ? v.toUpperCase() : null),
  title: z.string().min(3).max(200),
  titleBn: z.string().max(200).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  discountType: DiscountTypeEnum.default('PERCENTAGE'),
  targetScope: TargetScopeEnum.default('CART_SUBTOTAL'),
  discountValue: z.number().min(0).default(0),
  maxDiscountPoisha: z.union([z.string(), z.number(), z.bigint()]).optional().nullable().transform((v) => v != null ? BigInt(v) : null),
  minOrderSubtotalPoisha: z.union([z.string(), z.number(), z.bigint()]).optional().transform((v) => v != null ? BigInt(v) : 0n),
  minQuantity: z.number().int().min(1).default(1),
  buyQuantity: z.number().int().min(1).optional().nullable(),
  getQuantity: z.number().int().min(1).optional().nullable(),
  getDiscountPercent: z.number().min(0).max(100).optional().nullable(),
  isAutomatic: z.boolean().default(true),
  fundingType: FundingTypeEnum.default('PLATFORM_FUNDED'),
  sellerSharePercent: z.number().min(0).max(100).default(0),
  platformSharePercent: z.number().min(0).max(100).default(100),
  sellerId: z.string().uuid().optional().nullable(),
  buyerSegment: z.string().max(100).optional().nullable(),
  priority: z.number().int().min(0).default(0),
  startsAt: z.string().datetime().or(z.date()),
  endsAt: z.string().datetime().or(z.date()).optional().nullable(),
  usageLimit: z.number().int().min(1).optional().nullable(),
  status: DiscountStatusEnum.default('ACTIVE'),
  targets: z.array(z.object({
    targetType: z.enum(['PRODUCT', 'CATEGORY', 'BRAND']),
    targetId: z.string().min(1),
  })).optional(),
});

export const CreateDiscountRuleSchema = BaseDiscountRuleSchema.refine((data) => {
  if (data.discountType === 'BUY_X_GET_Y') {
    return (data.buyQuantity ?? 0) >= 1 && (data.getQuantity ?? 0) >= 1;
  }
  return true;
}, {
  message: 'BUY_X_GET_Y rules require buyQuantity and getQuantity of at least 1',
  path: ['buyQuantity'],
});

export const UpdateDiscountRuleSchema = BaseDiscountRuleSchema.partial().extend({
  status: DiscountStatusEnum.optional(),
});

export const EvaluateDiscountLineItemSchema = z.object({
  lineItemId: z.string(),
  productId: z.string(),
  variantId: z.string().optional(),
  categoryId: z.string().optional().nullable(),
  brandId: z.string().optional().nullable(),
  sellerId: z.string(),
  unitPricePoisha: z.union([z.string(), z.number(), z.bigint()]).transform((v) => BigInt(v)),
  quantity: z.number().int().min(1),
});

export const EvaluateDiscountRulesSchema = z.object({
  lineItems: z.array(EvaluateDiscountLineItemSchema).min(1),
  shippingFeePoisha: z.union([z.string(), z.number(), z.bigint()]).optional().default(0n).transform((v) => v != null ? BigInt(v) : 0n),
  buyerSegment: z.string().optional(),
  couponCode: z.string().optional(),
});

export type CreateDiscountRuleInput = z.infer<typeof CreateDiscountRuleSchema>;
export type UpdateDiscountRuleInput = z.infer<typeof UpdateDiscountRuleSchema>;
export type EvaluateDiscountRulesInput = z.infer<typeof EvaluateDiscountRulesSchema>;
