/**
 * Cash on Delivery (COD) Validation Schemas
 *
 * Invariant: Recipient phone automatically normalized to Bangladesh +880 E.164.
 * Invariant: Monetary limits strictly integer poisha.
 */

import { z } from 'zod';
import { normalizeBangladeshPhone } from '@/shared/utils/phone';

export const EvaluateCodEligibilitySchema = z.object({
  recipientPhone: z
    .string()
    .min(8, 'Phone number is required')
    .transform((val) => normalizeBangladeshPhone(val)),
  orderSubtotalPoisha: z.number().int().nonnegative(),
  division: z.string().min(2, 'Division is required'),
  district: z.string().min(2, 'District is required'),
  upazila: z.string().optional().nullable(),
  hasDigitalItems: z.boolean().default(false),
  cartId: z.string().optional().nullable(),
  clientIp: z.string().optional().nullable(),
});

export const SendCodOtpSchema = z.object({
  recipientPhone: z
    .string()
    .min(8, 'Recipient phone number is required')
    .transform((val) => normalizeBangladeshPhone(val)),
});

export const VerifyCodOtpSchema = z.object({
  recipientPhone: z
    .string()
    .min(8, 'Recipient phone number is required')
    .transform((val) => normalizeBangladeshPhone(val)),
  otp: z.string().regex(/^\d{6}$/, 'OTP must be a 6-digit numeric code'),
});

export const UpdateCodPolicySchema = z.object({
  maxCodOrderValuePoisha: z.number().int().positive().optional(),
  otpThresholdPoisha: z.number().int().positive().optional(),
  maxActivePendingCodOrders: z.number().int().positive().optional(),
  maxAllowedRtoRatePercent: z.number().int().min(1).max(100).optional(),
  isPhoneVerificationRequiredForNewUsers: z.boolean().optional(),
});

export const ManageCodBlacklistSchema = z.object({
  type: z.enum(['PHONE', 'EMAIL', 'IP_ADDRESS', 'DEVICE_FINGERPRINT']),
  identifier: z.string().min(1, 'Identifier is required'),
  reason: z.string().min(3, 'Reason must be at least 3 characters'),
  severity: z.enum(['BLOCK', 'OTP_REQUIRED', 'FLAG']).default('BLOCK'),
  expiresAt: z.string().datetime().optional().nullable(),
});

export type EvaluateCodEligibilityInput = z.infer<typeof EvaluateCodEligibilitySchema>;
export type SendCodOtpInput = z.infer<typeof SendCodOtpSchema>;
export type VerifyCodOtpInput = z.infer<typeof VerifyCodOtpSchema>;
export type UpdateCodPolicyInput = z.infer<typeof UpdateCodPolicySchema>;
export type ManageCodBlacklistInput = z.infer<typeof ManageCodBlacklistSchema>;
