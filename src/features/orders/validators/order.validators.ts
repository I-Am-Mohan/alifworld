/**
 * Order & Fulfillment Query and Mutation Validators
 */

import { z } from 'zod';

export const OrderStatusEnum = z.enum([
  'PENDING_PAYMENT',
  'PROCESSING',
  'CONFIRMED',
  'PARTIALLY_SHIPPED',
  'SHIPPED',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
  'REFUNDED',
]);

export const QueryCustomerOrdersSchema = z.object({
  status: OrderStatusEnum.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

export const QuerySellerOrdersSchema = z.object({
  status: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const CancelOrderSchema = z.object({
  reason: z.string().min(3, 'Cancellation reason must be at least 3 characters').max(500),
});

export type QueryCustomerOrdersInput = z.infer<typeof QueryCustomerOrdersSchema>;
export type QuerySellerOrdersInput = z.infer<typeof QuerySellerOrdersSchema>;
export type CancelOrderInput = z.infer<typeof CancelOrderSchema>;
