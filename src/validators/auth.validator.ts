/**
 * AlifWorld Authentication & Token Policy Validation Schemas
 * 
 * Zod validation contracts for authentication, token introspection,
 * refresh rotation, and session invalidation.
 * 
 * Invariants: ADR-0031
 */

import { z } from 'zod';
import { PASSWORD_POLICY } from '@/shared/auth/token-policy';

export const loginSchema = z.object({
  identifier: z
    .string()
    .min(3, 'Identifier must be at least 3 characters')
    .max(255, 'Identifier exceeds maximum allowed length')
    .transform((val) => val.trim().toLowerCase()),
  password: z.string().min(1, 'Password is required'),
  clientType: z
    .enum(['WEB', 'MOBILE_FLUTTER', 'POS', 'ADMIN_PORTAL'])
    .default('WEB'),
  deviceInfo: z.string().max(255).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerPasswordSchema = z
  .string()
  .min(PASSWORD_POLICY.MIN_LENGTH, `Password must be at least ${PASSWORD_POLICY.MIN_LENGTH} characters`)
  .max(PASSWORD_POLICY.MAX_LENGTH, `Password must not exceed ${PASSWORD_POLICY.MAX_LENGTH} characters`)
  .regex(PASSWORD_POLICY.PATTERN, 'Password does not meet required complexity standards');

export const customerRegistrationSchema = z.object({
  email: z
    .string()
    .min(5, 'Email is required')
    .max(255, 'Email exceeds maximum allowed length')
    .email('Please enter a valid email address')
    .transform((val) => val.trim().toLowerCase()),
  password: registerPasswordSchema,
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .trim(),
  phone: z
    .string()
    .regex(
      /^(\+8801[3-9]\d{8}|01[3-9]\d{8})$/,
      'Please provide a valid Bangladesh mobile number (+8801XXXXXXXXX or 01XXXXXXXXX)'
    )
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      let clean = val.replace(/\s+/g, '');
      if (clean.startsWith('01')) clean = `+88${clean}`;
      return clean;
    }),
  locale: z.enum(['bn-BD', 'en-BD']).default('bn-BD'),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms of service and privacy policy',
  }),
});

export type CustomerRegistrationInput = z.infer<typeof customerRegistrationSchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
  clientType: z
    .enum(['WEB', 'MOBILE_FLUTTER', 'POS', 'ADMIN_PORTAL'])
    .default('WEB'),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

export const tokenIntrospectSchema = z.object({
  token: z.string().min(1, 'Token to introspect is required'),
});

export type TokenIntrospectInput = z.infer<typeof tokenIntrospectSchema>;

export const revokeSessionSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  reason: z.string().max(255).optional(),
});

export type RevokeSessionInput = z.infer<typeof revokeSessionSchema>;

export const verifyEmailSchema = z.object({
  email: z
    .string()
    .min(5, 'Email is required')
    .max(255, 'Email exceeds maximum allowed length')
    .email('Please enter a valid email address')
    .transform((val) => val.trim().toLowerCase()),
  code: z
    .string()
    .length(6, 'Verification code must be exactly 6 digits')
    .regex(/^\d{6}$/, 'Verification code must contain only numbers'),
});

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

export const resendVerificationSchema = z.object({
  email: z
    .string()
    .min(5, 'Email is required')
    .max(255, 'Email exceeds maximum allowed length')
    .email('Please enter a valid email address')
    .transform((val) => val.trim().toLowerCase()),
});

export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;

