/**
 * Order Review, Consent, and Place-Order Validation Schemas
 *
 * Invariant: Terms, Privacy, and Return policy consent are mandatory.
 * Invariant: COD agreement is mandatory when COD is chosen.
 * Invariant: Phone number normalized to +880 Bangladesh E.164.
 */

import { z } from 'zod';
import { normalizeBangladeshPhone } from '@/shared/utils/phone';
import { BangladeshDivisionEnum } from './checkout.validators';

export const CustomerConsentSchema = z
  .object({
    termsAccepted: z.boolean(),
    termsVersion: z.string().min(1, 'Terms version is required'),
    privacyAccepted: z.boolean(),
    privacyVersion: z.string().min(1, 'Privacy policy version is required'),
    returnPolicyAccepted: z.boolean(),
    returnPolicyVersion: z.string().min(1, 'Return policy version is required'),
    codAgreementAccepted: z.boolean().optional(),
    marketingConsent: z.boolean().optional().default(false),
  })
  .refine((data) => data.termsAccepted === true, {
    message: 'You must accept the Terms & Conditions to place an order.',
    path: ['termsAccepted'],
  })
  .refine((data) => data.privacyAccepted === true, {
    message: 'You must accept the Privacy Policy to place an order.',
    path: ['privacyAccepted'],
  })
  .refine((data) => data.returnPolicyAccepted === true, {
    message: 'You must accept the Return & Refund Policy to place an order.',
    path: ['returnPolicyAccepted'],
  });

export const OrderReviewRecipientInputSchema = z.object({
  name: z.string().min(2, 'Recipient name is required').max(100),
  phone: z
    .string()
    .min(8, 'Phone number is required')
    .transform((val) => normalizeBangladeshPhone(val)),
  division: BangladeshDivisionEnum,
  district: z.string().min(2, 'District is required').max(50),
  upazila: z.string().max(50).optional().nullable(),
  address: z.string().min(5, 'Delivery address is required').max(500),
  postalCode: z.string().max(10).optional().nullable(),
  customerNotes: z.string().max(500).optional().nullable(),
  purchaseOrderRef: z.string().max(100).optional().nullable(),
});

export const GenerateOrderReviewSchema = z.object({
  cartId: z.string().min(1, 'Cart ID is required'),
  recipient: OrderReviewRecipientInputSchema,
  paymentMethod: z.string().min(2).default('COD'),
  couponCode: z.string().max(64).optional().nullable(),
  codVerificationToken: z.string().max(128).optional().nullable(),
});

export const PlaceOrderSchema = z
  .object({
    cartId: z.string().min(1, 'Cart ID is required'),
    reviewFingerprint: z.string().optional().nullable(),
    recipient: OrderReviewRecipientInputSchema,
    paymentMethod: z.string().min(2),
    codVerificationToken: z.string().max(128).optional().nullable(),
    couponCode: z.string().max(64).optional().nullable(),
    consent: CustomerConsentSchema,
    idempotencyKey: z
      .string()
      .min(8, 'Idempotency key must be at least 8 characters')
      .max(128, 'Idempotency key cannot exceed 128 characters')
      .regex(/^[A-Za-z0-9._:-]+$/, 'Idempotency key format is invalid'),
  })
  .refine(
    (data) => {
      if (data.paymentMethod.toUpperCase() === 'COD') {
        return data.consent.codAgreementAccepted === true;
      }
      return true;
    },
    {
      message: 'You must agree to the Cash on Delivery Terms to place a COD order.',
      path: ['consent', 'codAgreementAccepted'],
    }
  );

export type CustomerConsentInput = z.infer<typeof CustomerConsentSchema>;
export type GenerateOrderReviewInput = z.infer<typeof GenerateOrderReviewSchema>;
export type PlaceOrderInput = z.infer<typeof PlaceOrderSchema>;
