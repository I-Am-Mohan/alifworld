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

// ─── Seller Fulfillment Action Workflow Schemas (Milestone 143) ───

export const RejectionReasonCodeEnum = z.enum([
  'OUT_OF_STOCK',
  'PRICING_DISCREPANCY',
  'UNSERVICEABLE_LOCATION',
  'SUSPECTED_FRAUD',
  'MERCHANT_CAPACITY_EXCEEDED',
  'DAMAGED_INVENTORY',
  'OTHER',
]);

export const AcceptFulfillmentOrderSchema = z.object({
  note: z.string().max(500).optional(),
});

export const RejectFulfillmentOrderSchema = z.object({
  reason: z.string().min(5, 'Rejection reason must be at least 5 characters').max(500),
  rejectionCode: RejectionReasonCodeEnum.default('OUT_OF_STOCK'),
});

export const StartPackingOrderSchema = z.object({
  packingNotes: z.string().max(500).optional(),
});

export const ReadyForPickupOrderSchema = z.object({
  packageCount: z.coerce.number().int().min(1).default(1),
  totalWeightGrams: z.coerce.number().int().positive().optional(),
  packageLengthMm: z.coerce.number().int().positive().optional(),
  packageWidthMm: z.coerce.number().int().positive().optional(),
  packageHeightMm: z.coerce.number().int().positive().optional(),
  packagingNotes: z.string().max(500).optional(),
});

export const HandoverOrderSchema = z.object({
  courierProvider: z
    .enum(['PATHAO', 'STEADFAST', 'REDX', 'PAPERFLY', 'IN_HOUSE'])
    .default('PATHAO'),
  consignmentId: z.string().min(1).max(100).optional(),
  trackingNumber: z.string().min(1).max(100).optional(),
  pickupDate: z.string().datetime().optional(),
  handoverNotes: z.string().max(500).optional(),
});

export type RejectionReasonCode = z.infer<typeof RejectionReasonCodeEnum>;
export type AcceptFulfillmentOrderInput = z.infer<typeof AcceptFulfillmentOrderSchema>;
export type RejectFulfillmentOrderInput = z.infer<typeof RejectFulfillmentOrderSchema>;
export type StartPackingOrderInput = z.infer<typeof StartPackingOrderSchema>;
export type ReadyForPickupOrderInput = z.infer<typeof ReadyForPickupOrderSchema>;
export type HandoverOrderInput = z.infer<typeof HandoverOrderSchema>;
