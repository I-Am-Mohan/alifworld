/**
 * Address Validation & Delivery Serviceability Validators
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

export const ValidateAddressServiceabilitySchema = z.object({
  division: BangladeshDivisionEnum,
  district: z.string().min(2, 'District name is required').max(50),
  upazila: z.string().max(50).optional().nullable(),
  postalCode: z
    .string()
    .regex(/^\d{4}$/, 'Postal code must be a 4-digit number (e.g. 1212, 1000)')
    .optional()
    .nullable(),
  address: z.string().min(5, 'Detailed street address is required').max(500),
  orderSubtotalPoisha: z.number().int().nonnegative().optional().default(0),
  isB2B: z.boolean().optional().default(false),
});

export const GeoDistrictsQuerySchema = z.object({
  divisionCode: BangladeshDivisionEnum.optional(),
});

export const GeoUpazilasQuerySchema = z.object({
  districtId: z.string().min(1, 'District ID is required').optional(),
  districtName: z.string().optional(),
});

export type ValidateAddressServiceabilityInput = z.input<
  typeof ValidateAddressServiceabilitySchema
>;
export type ValidateAddressServiceabilityOutput = z.infer<
  typeof ValidateAddressServiceabilitySchema
>;
export type GeoDistrictsQueryInput = z.input<typeof GeoDistrictsQuerySchema>;
export type GeoUpazilasQueryInput = z.input<typeof GeoUpazilasQuerySchema>;
