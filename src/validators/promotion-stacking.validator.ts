import { z } from 'zod';
import { EvaluateDiscountLineItemSchema } from './discount-rule.validator';

export const EvaluateStackingSchema = z.object({
  lineItems: z.array(EvaluateDiscountLineItemSchema).min(1),
  shippingFeePoisha: z.union([z.string(), z.number(), z.bigint()]).optional().default(0n).transform((v) => v != null ? BigInt(v) : 0n),
  buyerSegment: z.string().optional(),
  couponCodes: z.array(z.string().min(1)).optional().default([]),
  channel: z.string().optional().default('RETAIL'),
});

export type EvaluateStackingInput = z.infer<typeof EvaluateStackingSchema>;
