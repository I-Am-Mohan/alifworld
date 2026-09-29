/**
 * Payment Method Discovery & Selection Validation Schemas
 *
 * Invariant: Input validation guarantees BDT poisha non-negative integers.
 * Invariant: Supported payment methods: BKASH, NAGAD, UPAY, ROCKET, SSLCOMMERZ, COD, CUSTOMER_WALLET.
 */

import { z } from 'zod';

export const PaymentGatewayCodeEnum = z.enum([
  'BKASH',
  'NAGAD',
  'UPAY',
  'ROCKET',
  'SSLCOMMERZ',
  'COD',
  'CUSTOMER_WALLET',
]);

export const ClientPlatformEnum = z.enum(['WEB', 'ANDROID', 'IOS', 'FLUTTER']);

export const DiscoverPaymentMethodsSchema = z.object({
  orderTotalPoisha: z.number().int().nonnegative().optional(),
  orderSubtotalPoisha: z.number().int().nonnegative().optional(),
  cartId: z.string().optional().nullable(),
  shippingAddress: z
    .object({
      division: z.string().min(2),
      district: z.string().min(2),
      upazila: z.string().optional().nullable(),
      recipientPhone: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
  hasDigitalItems: z.boolean().default(false),
  clientPlatform: ClientPlatformEnum.default('WEB'),
});

export const SelectPaymentMethodSchema = z.object({
  paymentMethod: PaymentGatewayCodeEnum,
  cartId: z.string().optional().nullable(),
  orderId: z.string().optional().nullable(),
  codVerificationToken: z.string().max(128).optional().nullable(),
  walletType: z.enum(['MAIN', 'SHOPPING']).default('MAIN').optional(),
  clientReturnUrl: z.string().url().optional().nullable(),
});

export type DiscoverPaymentMethodsInput = z.infer<typeof DiscoverPaymentMethodsSchema>;
export type SelectPaymentMethodInput = z.infer<typeof SelectPaymentMethodSchema>;
