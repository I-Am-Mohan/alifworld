/**
 * AlifWorld Customer Domain Zod Validators
 * 
 * Strict validation for profile updates, communication preferences,
 * privacy consent, password changes, and B2B organization registration.
 * 
 * Invariants: ADR-0003, ADR-0022
 */

import { z } from 'zod';

export const BD_PHONE_REGEX = /^(\+?8801|01)[3-9]\d{8}$/;

export const UpdateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  avatarUrl: z.string().url('Avatar must be a valid URL').optional().nullable(),
  locale: z.enum(['en-BD', 'bn-BD']).default('en-BD'),
  version: z.number().int().min(1, 'Version is required for optimistic concurrency control'),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

export const UpdatePreferencesSchema = z.object({
  emailMarketing: z.boolean().default(false),
  smsMarketing: z.boolean().default(false),
  orderStatusUpdates: z.boolean().default(true),
  promotionalPush: z.boolean().default(false),
});

export type UpdatePreferencesInput = z.infer<typeof UpdatePreferencesSchema>;

export const UpdateConsentSchema = z.object({
  termsAccepted: z.boolean(),
  termsVersion: z.string().min(1, 'Terms version is required'),
  privacyAccepted: z.boolean(),
  privacyVersion: z.string().min(1, 'Privacy version is required'),
  marketingConsent: z.boolean().default(false),
});

export type UpdateConsentInput = z.infer<typeof UpdateConsentSchema>;

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .max(100)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one digit')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'New password and confirm password do not match',
  path: ['confirmPassword'],
});

export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

export const RegisterBusinessBuyerSchema = z.object({
  companyName: z.string().trim().min(3, 'Company name must be at least 3 characters').max(150),
  businessType: z.enum(['CORPORATION', 'LLC', 'PARTNERSHIP', 'SOLE_PROPRIETORSHIP']),
  tradeLicenseNumber: z.string().trim().min(5, 'Valid trade license number is required').max(50),
  binNumber: z.string().trim().regex(/^\d{9,13}$/, 'BIN number must be 9-13 digits').optional().nullable(),
  tinNumber: z.string().trim().regex(/^\d{10,12}$/, 'TIN number must be 10-12 digits').optional().nullable(),
});

export type RegisterBusinessBuyerInput = z.infer<typeof RegisterBusinessBuyerSchema>;

export * from './wishlist.validators';
export * from './b2b.validators';

