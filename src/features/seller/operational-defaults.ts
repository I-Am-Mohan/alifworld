import { z } from 'zod';

export const SellerOperationalDefaultsSchema = z.object({
  sellerId: z.string().regex(/^sel_[A-Za-z0-9]+$/),
  taxJurisdiction: z.string().trim().length(2).default('BD'),
  taxRuleVersion: z.string().trim().max(50).nullable().optional(),
  taxEffectiveFrom: z.coerce.date().nullable().optional(),
  shippingMode: z.enum(['PLATFORM', 'SELLER_DEFAULT', 'DISABLED']).default('PLATFORM'),
  defaultHandlingDays: z.number().int().min(0).max(30),
  orderCutoffTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable().optional(),
  autoAcceptOrders: z.boolean(),
  defaultOrderStatus: z.literal('PENDING'),
  version: z.number().int().positive(),
});

export type SellerOperationalDefaultsInput = z.infer<typeof SellerOperationalDefaultsSchema>;

export const SellerNotificationDefaultsSchema = z.object({
  sellerId: z.string().regex(/^sel_[A-Za-z0-9]+$/),
  preferences: z.array(z.object({
    channel: z.enum(['EMAIL', 'SMS', 'PUSH', 'IN_APP']),
    eventType: z.enum(['SECURITY', 'TRANSACTIONAL', 'MARKETING']),
    enabled: z.boolean(),
  })).min(1).max(20),
});

export type SellerNotificationDefaultsInput = z.infer<typeof SellerNotificationDefaultsSchema>;
