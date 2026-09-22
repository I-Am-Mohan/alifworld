/**
 * AlifWorld Customer Domain Validation Schemas
 * 
 * Enforces strong validation for customer profiles, personal data minimization,
 * anti-tampering guards, and Bangladesh geographic address structures.
 * 
 * Invariants: ADR-0003, ADR-0022, ADR-0023, Milestone 046, Milestone 047
 */

import { z } from 'zod';

export const BANGLADESH_DIVISIONS = [
  'DHAKA',
  'CHITTAGONG',
  'RAJSHAHI',
  'KHULNA',
  'BARISAL',
  'SYLHET',
  'RANGPUR',
  'MYMENSINGH',
] as const;

export const BD_PHONE_REGEX = /^(\+?8801|01)[3-9]\d{8}$/;

/**
 * Customer self-service profile update schema.
 * Note: Security and financial fields (status, roles, walletBalance, points)
 * are forbidden and rejected by the policy engine.
 */
export const UpdateCustomerProfileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100).optional(),
  avatarUrl: z.string().url('Avatar must be a valid URL').optional().or(z.literal('')),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be YYYY-MM-DD').optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  preferredLanguage: z.enum(['en-BD', 'bn-BD']).optional(),
});

export type UpdateCustomerProfileInput = z.infer<typeof UpdateCustomerProfileSchema>;

/**
 * Customer delivery address schema.
 */
export const CustomerAddressSchema = z.object({
  label: z.string().trim().min(1, 'Address label is required (e.g. Home, Office)').max(50),
  recipientName: z.string().trim().min(2, 'Recipient name is required').max(100),
  recipientPhone: z.string().regex(BD_PHONE_REGEX, 'Valid Bangladesh mobile number required (+8801XXXXXXXXX or 01XXXXXXXXX)'),
  division: z.enum(BANGLADESH_DIVISIONS, { errorMap: () => ({ message: 'Valid Bangladesh division required' }) }),
  district: z.string().trim().min(2, 'District is required'),
  upazila: z.string().trim().optional(),
  addressLine: z.string().trim().min(5, 'Detailed street address is required').max(255),
  postalCode: z.string().trim().regex(/^\d{4}$/, 'Bangladesh postal code must be 4 digits').optional(),
  isDefault: z.boolean().default(false),
});

export type CustomerAddressInput = z.infer<typeof CustomerAddressSchema>;
