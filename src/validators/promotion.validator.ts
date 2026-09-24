import { z } from 'zod';

export const PromotionTypeEnum = z.enum(['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING']);
export const PromotionFundingTypeEnum = z.enum(['PLATFORM_FUNDED', 'SELLER_FUNDED', 'CO_FUNDED']);
export const PromotionStatusEnum = z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED', 'ARCHIVED']);

export const BaseCreatePromotionSchema = z.object({
  code: z.string().min(3).max(30).regex(/^[A-Za-z0-9_-]+$/).transform((v) => v.toUpperCase()),
  title: z.string().min(3).max(200),
  titleBn: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  promotionType: PromotionTypeEnum.default('PERCENTAGE'),
  fundingType: PromotionFundingTypeEnum.default('PLATFORM_FUNDED'),
  sellerSharePercent: z.number().min(0).max(100).default(0),
  platformSharePercent: z.number().min(0).max(100).default(100),
  sellerId: z.string().uuid().optional().nullable(),
  discountValue: z.number().min(0),
  maxDiscountPoisha: z.union([z.string(), z.number(), z.bigint()]).optional().transform((val) => val != null ? BigInt(val) : undefined),
  minOrderSubtotalPoisha: z.union([z.string(), z.number(), z.bigint()]).optional().transform((val) => val != null ? BigInt(val) : 0n),
  usageLimit: z.number().int().min(1).optional().nullable(),
  perCustomerLimit: z.number().int().min(1).default(1),
  startsAt: z.string().datetime().or(z.date()),
  endsAt: z.string().datetime().or(z.date()).optional().nullable(),
  status: PromotionStatusEnum.default('ACTIVE'),
});

export const CreatePromotionSchema = BaseCreatePromotionSchema.refine((data) => {
  if (data.fundingType === 'CO_FUNDED') {
    return data.sellerSharePercent > 0 && data.sellerSharePercent < 100;
  }
  return true;
}, {
  message: 'CO_FUNDED promotions must have a sellerSharePercent greater than 0 and less than 100',
  path: ['sellerSharePercent'],
});

export const UpdatePromotionSchema = BaseCreatePromotionSchema.partial().extend({
  status: PromotionStatusEnum.optional(),
});

export const AttributionQuerySchema = z.object({
  sellerId: z.string().uuid().optional(),
  orderId: z.string().optional(),
  couponCode: z.string().optional(),
  fundingType: PromotionFundingTypeEnum.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const EvaluatePromotionSchema = z.object({
  couponCode: z.string().min(1),
  subtotalPoisha: z.union([z.string(), z.number(), z.bigint()]).transform((val) => BigInt(val)),
  sellerId: z.string().uuid().optional(),
});

export type CreatePromotionInput = z.infer<typeof CreatePromotionSchema>;
export type UpdatePromotionInput = z.infer<typeof UpdatePromotionSchema>;
export type AttributionQueryInput = z.infer<typeof AttributionQuerySchema>;
export type EvaluatePromotionInput = z.infer<typeof EvaluatePromotionSchema>;
