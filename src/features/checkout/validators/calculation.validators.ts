/**
 * Server-Side Checkout Calculation Validation Schemas
 *
 * Invariant: Validates address, items, and coupon inputs.
 * Invariant: Client-side prices or totals are never trusted; validated against database records.
 */

import { z } from 'zod';
import { ShippingMethodCodeEnum } from '@/features/shipping/validators/shipping-rate.validators';

export const CheckoutCalculationItemSchema = z.object({
  variantId: z.string().min(1, 'Variant ID is required'),
  quantity: z.number().int().positive('Quantity must be greater than zero'),
});

export const CheckoutCalculationAddressSchema = z.object({
  division: z.string().min(2, 'Division is required'),
  district: z.string().min(2, 'District is required'),
  upazila: z.string().optional().nullable(),
  postalCode: z.string().max(10).optional().nullable(),
  streetAddress: z.string().optional().nullable(),
});

export const CheckoutCalculationInputSchema = z
  .object({
    cartId: z.string().optional(),
    items: z.array(CheckoutCalculationItemSchema).optional(),
    shippingAddress: CheckoutCalculationAddressSchema,
    couponCode: z.string().trim().max(64).optional().nullable(),
    shippingMethod: ShippingMethodCodeEnum.default('STANDARD'),
  })
  .refine(
    (data) => Boolean(data.cartId) || (Array.isArray(data.items) && data.items.length > 0),
    {
      message: 'Either cartId or a non-empty items array must be provided.',
      path: ['cartId'],
    }
  );

export type CheckoutCalculationInput = z.infer<typeof CheckoutCalculationInputSchema>;
