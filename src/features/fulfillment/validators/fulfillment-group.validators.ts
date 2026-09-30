/**
 * Seller Fulfillment Group Validation Schemas
 *
 * Invariant: Input validation prevents unauthorized modification of financial fields.
 * Invariant: State machine transitions strictly validated against FULFILLMENT_GROUP_TRANSITIONS.
 */

import { z } from 'zod';
import { CourierCodeEnum } from '@/features/shipping/validators/courier.validators';

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

export const TransitionGroupStatusSchema = z.object({
  status: FulfillmentGroupStatusEnum,
  reason: z.string().max(500).optional().nullable(),
});

export const DispatchGroupToCourierSchema = z.object({
  courierProvider: CourierCodeEnum,
  weightGrams: z.number().int().positive().optional(),
  specialInstructions: z.string().max(500).optional().nullable(),
  pickupDate: z.string().datetime().optional().nullable(),
});

export const FulfillmentGroupQuerySchema = z.object({
  status: FulfillmentGroupStatusEnum.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sellerId: z.string().optional(),
});

export type TransitionGroupStatusInput = z.infer<typeof TransitionGroupStatusSchema>;
export type DispatchGroupToCourierInput = z.infer<typeof DispatchGroupToCourierSchema>;
export type FulfillmentGroupQueryInput = z.infer<typeof FulfillmentGroupQuerySchema>;

export {
  RejectionReasonCodeEnum,
  AcceptFulfillmentOrderSchema,
  RejectFulfillmentOrderSchema,
  StartPackingOrderSchema,
  ReadyForPickupOrderSchema,
  HandoverOrderSchema,
  type RejectionReasonCode,
  type AcceptFulfillmentOrderInput,
  type RejectFulfillmentOrderInput,
  type StartPackingOrderInput,
  type ReadyForPickupOrderInput,
  type HandoverOrderInput,
} from '@/features/orders/validators/order.validators';
