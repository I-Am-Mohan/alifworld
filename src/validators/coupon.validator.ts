import { z } from 'zod';

export const RedemptionStatusEnum = z.enum(['RESERVED', 'COMMITTED', 'REVERSED']);

export const ApplyCouponSchema = z.object({
  couponCode: z.string().min(1).transform((v) => v.toUpperCase()),
  subtotalPoisha: z.union([z.string(), z.number(), z.bigint()]).transform((v) => BigInt(v)),
  sellerId: z.string().uuid().optional().nullable(),
});

export const ReleaseCouponSchema = z.object({
  redemptionId: z.string().uuid(),
  reason: z.string().max(500).default('Checkout cancelled or cart updated'),
});

export const RedemptionQuerySchema = z.object({
  customerId: z.string().uuid().optional(),
  sellerId: z.string().uuid().optional(),
  couponCode: z.string().optional(),
  status: RedemptionStatusEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ApplyCouponInput = z.infer<typeof ApplyCouponSchema>;
export type ReleaseCouponInput = z.infer<typeof ReleaseCouponSchema>;
export type RedemptionQueryInput = z.infer<typeof RedemptionQuerySchema>;
