/**
 * Bangladesh Courier & Delivery Validation Schemas
 *
 * Invariant: Recipient phone automatically normalized to Bangladesh +880 E.164.
 * Invariant: Monetary amounts strictly integer poisha.
 */

import { z } from 'zod';
import { normalizeBangladeshPhone } from '@/shared/utils/phone';

export const CourierCodeEnum = z.enum(['PATHAO', 'STEADFAST', 'REDX', 'PAPERFLY', 'IN_HOUSE']);

export const ShipmentStatusEnum = z.enum([
  'PENDING',
  'LABEL_CREATED',
  'ASSIGNED',
  'PICKED_UP',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'FAILED_DELIVERY',
  'RETURNED_TO_SELLER',
  'CANCELLED',
]);

export const ListConsignmentsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sellerId: z.string().min(1).max(200).optional(),
  courierProvider: CourierCodeEnum.optional(),
  status: ShipmentStatusEnum.optional(),
});

export const QueryShipmentsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sellerId: z.string().optional(),
  courierProvider: CourierCodeEnum.optional(),
  status: ShipmentStatusEnum.optional(),
  search: z.string().optional(),
});

export const AppendShipmentEventSchema = z.object({
  status: ShipmentStatusEnum,
  location: z.string().max(200).optional().nullable(),
  description: z.string().min(3, 'Event description must be at least 3 characters').max(500),
  occurredAt: z.string().datetime().optional(),
  carrierPayload: z.record(z.unknown()).optional(),
});

export const UpdateShipmentStatusSchema = z.object({
  status: ShipmentStatusEnum,
  description: z.string().min(3).max(500).optional(),
  location: z.string().max(200).optional().nullable(),
  trackingNumber: z.string().min(1).max(100).optional().nullable(),
  consignmentId: z.string().min(1).max(100).optional().nullable(),
  occurredAt: z.string().datetime().optional(),
});

export const CreateConsignmentSchema = z.object({
  fulfillmentGroupId: z.string().min(1, 'Fulfillment group ID is required'),
  courierProvider: CourierCodeEnum,
  recipientName: z.string().min(2, 'Recipient name must be at least 2 characters'),
  recipientPhone: z
    .string()
    .min(8, 'Phone number is required')
    .transform((val) => normalizeBangladeshPhone(val)),
  recipientAlternativePhone: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val ? normalizeBangladeshPhone(val) : null)),
  deliveryAddress: z.string().min(5, 'Delivery address is required'),
  division: z.string().min(2, 'Division is required'),
  district: z.string().min(2, 'District is required'),
  upazila: z.string().optional().nullable(),
  postalCode: z.string().max(10).optional().nullable(),
  itemDescription: z.string().default('AlifWorld Verified Package'),
  itemQuantity: z.number().int().positive().default(1),
  totalWeightGrams: z.number().int().positive().default(500),
  codAmountPoisha: z.number().int().nonnegative().default(0),
  isPrepaid: z.boolean().default(false),
  specialInstructions: z.string().max(500).optional().nullable(),
});

export const VerifyInHouseDeliverySchema = z.object({
  shipmentId: z.string().min(1, 'Shipment ID or Consignment ID is required'),
  otpCode: z.string().regex(/^\d{4,6}$/, 'OTP must be a 4-6 digit numeric code'),
  riderId: z.string().min(1, 'Rider ID is required'),
  deliveryNotes: z.string().max(500).optional().nullable(),
  recipientSignedName: z.string().max(100).optional().nullable(),
  proofOfDeliveryPhotoUrl: z.string().url().optional().nullable(),
});

export const CancelConsignmentSchema = z.object({
  consignmentId: z.string().min(1, 'Consignment ID is required'),
  reason: z.string().max(255).optional().nullable(),
});

export const CourierWebhookParamsSchema = z.object({
  courier: z.enum(['pathao', 'steadfast', 'redx', 'paperfly']),
});

export type CreateConsignmentInput = z.infer<typeof CreateConsignmentSchema>;
export type VerifyInHouseDeliveryInput = z.infer<typeof VerifyInHouseDeliverySchema>;
export type CancelConsignmentInput = z.infer<typeof CancelConsignmentSchema>;
export type QueryShipmentsInput = z.infer<typeof QueryShipmentsSchema>;
export type AppendShipmentEventInput = z.infer<typeof AppendShipmentEventSchema>;
export type UpdateShipmentStatusInput = z.infer<typeof UpdateShipmentStatusSchema>;
