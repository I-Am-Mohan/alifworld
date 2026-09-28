/**
 * Cart Validators
 */

import { z } from 'zod';

export const AddCartItemSchema = z.object({
  variantId: z.string().min(1, 'Variant ID is required'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  guestCartToken: z.string().optional().nullable(),
});

export const UpdateCartItemSchema = z.object({
  quantity: z.number().int().nonnegative('Quantity cannot be negative'),
  guestCartToken: z.string().optional().nullable(),
});

export const MergeGuestCartSchema = z.object({
  guestCartToken: z.string().min(1, 'Guest cart token is required'),
});

export const ApplyCouponSchema = z.object({
  couponCode: z.string().trim().min(1, 'Coupon code is required').max(50),
  guestCartToken: z.string().optional().nullable(),
});

export type AddCartItemInput = z.infer<typeof AddCartItemSchema>;
export type UpdateCartItemInput = z.infer<typeof UpdateCartItemSchema>;
export type MergeGuestCartInput = z.infer<typeof MergeGuestCartSchema>;
export type ApplyCouponInput = z.infer<typeof ApplyCouponSchema>;
