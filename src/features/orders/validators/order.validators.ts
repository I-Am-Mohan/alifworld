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

// ─── State Machine Transition Validators ───

export const FulfillmentGroupStatusEnum = z.enum([
  'PENDING',
  'ACCEPTED',
  'PACKING',
  'READY_FOR_PICKUP',
  'HANDED_OVER_TO_COURIER',
  'IN_TRANSIT',
  'DELIVERED',
  'CANCELLED',
  'REJECTED',
]);

export const OrderItemStatusEnum = z.enum([
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
]);

export const ActorRoleEnum = z.enum(['CUSTOMER', 'SELLER', 'ADMIN', 'SYSTEM']);

export const TransitionIdempotencyKeySchema = z
  .string()
  .min(1)
  .max(200)
  .regex(/\S/, 'Idempotency key must not be empty');

export const TransitionOrderStatusSchema = z.object({
  nextStatus: OrderStatusEnum,
  reason: z.string().min(3).max(500).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const TransitionFulfillmentGroupStatusSchema = z.object({
  nextStatus: FulfillmentGroupStatusEnum,
  reason: z.string().min(3).max(500).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const TransitionOrderItemStatusSchema = z.object({
  nextStatus: OrderItemStatusEnum,
  reason: z.string().min(3).max(500).optional(),
});

export type QueryCustomerOrdersInput = z.infer<typeof QueryCustomerOrdersSchema>;
export type QuerySellerOrdersInput = z.infer<typeof QuerySellerOrdersSchema>;
export type CancelOrderInput = z.infer<typeof CancelOrderSchema>;
export type TransitionOrderStatusInput = z.infer<typeof TransitionOrderStatusSchema>;
export type TransitionFulfillmentGroupStatusInput = z.infer<
  typeof TransitionFulfillmentGroupStatusSchema
>;
export type TransitionOrderItemStatusInput = z.infer<typeof TransitionOrderItemStatusSchema>;
