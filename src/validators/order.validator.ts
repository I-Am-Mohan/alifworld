/**
 * Order, Cart, and Fulfillment Validators
 * 
 * Defines runtime Zod validation schemas for carts, checkouts, seller fulfillment groups,
 * courier dispatches, and shipment tracking events.
 * 
 * Reference: docs/architecture/carts-orders-fulfillment-groups-and-shipments.md
 */

import { z } from 'zod';

export const AddCartItemSchema = z.object({
  variantId: z.string().min(1, 'Variant ID is required'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
});

export const UpdateCartItemSchema = z.object({
  quantity: z.number().int().nonnegative('Quantity cannot be negative'),
});

export const CheckoutInputSchema = z.object({
  shippingName: z.string().min(2, 'Recipient name is required'),
  shippingPhone: z
    .string()
    .regex(/^(\+?8801|01)[3-9]\d{8}$/, 'Valid Bangladesh mobile number required (+8801XXXXXXXXX or 01XXXXXXXXX)'),
  shippingDivision: z.enum([
    'DHAKA',
    'CHITTAGONG',
    'RAJSHAHI',
    'KHULNA',
    'BARISAL',
    'SYLHET',
    'RANGPUR',
    'MYMENSINGH',
  ]),
  shippingDistrict: z.string().min(2, 'District is required'),
  shippingUpazila: z.string().optional(),
  shippingAddress: z.string().min(5, 'Detailed delivery address is required'),
  shippingPostalCode: z.string().optional(),
  billingAddress: z.string().optional(),
  customerNotes: z.string().max(500).optional(),
});

export const FulfillmentStatusTransitionSchema = z.object({
  status: z.enum([
    'ACCEPTED',
    'PACKING',
    'READY_FOR_PICKUP',
    'HANDED_OVER_TO_COURIER',
    'IN_TRANSIT',
    'DELIVERED',
    'CANCELLED',
    'REJECTED',
  ]),
  reason: z.string().max(500).optional(),
});

export const DispatchShipmentSchema = z.object({
  courierProvider: z.enum(['PATHAO', 'STEADFAST', 'PAPERFLY', 'REDX', 'IN_HOUSE']),
  trackingNumber: z.string().min(3).optional(),
  consignmentId: z.string().optional(),
  weightGrams: z.number().int().positive().optional(),
  packageCount: z.number().int().positive().default(1),
  shippingCostPoisha: z.bigint().or(z.number().int().nonnegative().transform(BigInt)).optional(),
});

export const RecordShipmentEventSchema = z.object({
  status: z.string().min(1),
  description: z.string().min(2),
  location: z.string().optional(),
  carrierPayload: z.record(z.unknown()).optional(),
});

export const CancelOrderSchema = z.object({
  reason: z.string().trim().min(3, 'Cancellation reason must be at least 3 characters').max(500),
});

export type AddCartItemInput = z.infer<typeof AddCartItemSchema>;
export type UpdateCartItemInput = z.infer<typeof UpdateCartItemSchema>;
export type CheckoutInput = z.infer<typeof CheckoutInputSchema>;
export type FulfillmentStatusTransitionInput = z.infer<typeof FulfillmentStatusTransitionSchema>;
export type DispatchShipmentInput = z.infer<typeof DispatchShipmentSchema>;
export type RecordShipmentEventInput = z.infer<typeof RecordShipmentEventSchema>;
export type CancelOrderInput = z.infer<typeof CancelOrderSchema>;
