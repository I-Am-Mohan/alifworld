/**
 * Checkout Orchestration Validators
 */

import { z } from 'zod';

export const BangladeshDivisionEnum = z.enum([
  'DHAKA',
  'CHITTAGONG',
  'RAJSHAHI',
  'KHULNA',
  'BARISAL',
  'SYLHET',
  'RANGPUR',
  'MYMENSINGH',
]);

export const CheckoutShippingAddressSchema = z.object({
  shippingName: z.string().min(2, 'Recipient name is required').max(100),
  shippingPhone: z
    .string()
    .regex(
      /^(\+?8801|01)[3-9]\d{8}$/,
      'Valid Bangladesh mobile number required (+8801XXXXXXXXX or 01XXXXXXXXX)'
    ),
  shippingDivision: BangladeshDivisionEnum,
  shippingDistrict: z.string().min(2, 'District is required').max(50),
  shippingUpazila: z.string().max(50).optional().nullable(),
  shippingAddress: z.string().min(5, 'Detailed delivery address is required').max(500),
  shippingPostalCode: z.string().max(10).optional().nullable(),
  billingAddress: z.string().max(500).optional().nullable(),
  customerNotes: z.string().max(500).optional().nullable(),
  purchaseOrderRef: z.string().max(100).optional().nullable(),
  paymentMethod: z.string().max(50).optional().nullable(),
  codVerificationToken: z.string().max(100).optional().nullable(),
});

export const CartCheckoutPayloadSchema = z.object({
  cartId: z.string().min(1, 'Cart ID is required'),
  checkout: CheckoutShippingAddressSchema,
  couponCode: z.string().max(50).optional().nullable(),
});

export const IdempotencyKeyHeaderSchema = z
  .string()
  .min(8, 'Idempotency key must be at least 8 characters')
  .max(128, 'Idempotency key cannot exceed 128 characters')
  .regex(/^[A-Za-z0-9._:-]+$/, 'Idempotency key format is invalid');

export type CheckoutShippingAddressInput = z.infer<typeof CheckoutShippingAddressSchema>;
export type CartCheckoutPayloadInput = z.infer<typeof CartCheckoutPayloadSchema>;
