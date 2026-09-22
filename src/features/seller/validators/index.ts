/**
 * Seller Domain Zod Validation Schemas
 * 
 * Enforces strict input validation, tenant identifier verification,
 * NBR BIN/TIN syntax checks, and KYC document upload constraints.
 * 
 * Reference: docs/architecture/scope-boundaries-and-domain-map.md
 * Invariant: ADR-0003, ADR-0022, ADR-0024
 */

import { z } from 'zod';
import { SellerStatus, KycDocumentType, KycDocumentStatus, CourierProvider } from '../types';
import { normalizeBangladeshPhone } from '@/shared/utils/phone';
import { isValidId, ID_PREFIXES } from '@/shared/utils/id';

/**
 * Prefixed identifier validation schema.
 */
function createPrefixedIdSchema(expectedPrefix: (typeof ID_PREFIXES)[keyof typeof ID_PREFIXES]) {
  return z.string().refine((val) => isValidId(val, expectedPrefix), {
    message: `Invalid identifier. Expected prefix: '${expectedPrefix}_'`,
  });
}

export const SellerIdSchema = createPrefixedIdSchema(ID_PREFIXES.SELLER);
export const UserIdSchema = createPrefixedIdSchema(ID_PREFIXES.USER);
export const KycDocumentIdSchema = createPrefixedIdSchema(ID_PREFIXES.KYC_DOCUMENT);
export const StaffIdSchema = createPrefixedIdSchema(ID_PREFIXES.STAFF);

/**
 * Bangladesh phone number transformer for support phone.
 */
export const BangladeshPhoneSchema = z
  .string()
  .transform((val, ctx) => {
    try {
      return normalizeBangladeshPhone(val);
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid Bangladesh mobile number. Must match +8801[3-9]XXXXXXXX',
      });
      return z.NEVER;
    }
  });

/**
 * Address Zod Schema
 */
export const AddressSchema = z.object({
  division: z.string().trim().min(2, 'Division is required'),
  district: z.string().trim().min(2, 'District is required'),
  upazila: z.string().trim().min(2, 'Upazila is required'),
  streetAddress: z.string().trim().min(5, 'Street address is required'),
  postalCode: z.string().trim().optional(),
});

/**
 * Create Seller Registration Input Schema
 */
export const CreateSellerInputSchema = z.object({
  businessName: z.string().trim().min(3, 'Business name must be at least 3 characters').max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Store slug must be lowercase alphanumeric characters separated by single hyphens'),
  tradeLicenseNumber: z.string().trim().max(50).optional(),
  binNumber: z
    .string()
    .trim()
    .regex(/^\d{9,13}$/, 'BIN Number must be 9 to 13 digits')
    .optional(),
  tinNumber: z
    .string()
    .trim()
    .regex(/^\d{10,12}$/, 'TIN Number must be 10 to 12 digits')
    .optional(),
});

export type CreateSellerInput = z.infer<typeof CreateSellerInputSchema>;

/**
 * Update Seller Input Schema (OCC Version Protected)
 */
export const UpdateSellerInputSchema = z.object({
  businessName: z.string().trim().min(3).max(120).optional(),
  tradeLicenseNumber: z.string().trim().max(50).optional(),
  binNumber: z
    .string()
    .trim()
    .regex(/^\d{9,13}$/, 'BIN Number must be 9 to 13 digits')
    .optional(),
  tinNumber: z
    .string()
    .trim()
    .regex(/^\d{10,12}$/, 'TIN Number must be 10 to 12 digits')
    .optional(),
  version: z.number().int().positive('Optimistic concurrency version is required for update'),
});

export type UpdateSellerInput = z.infer<typeof UpdateSellerInputSchema>;

/**
 * Submit KYC Document Input Schema
 */
export const SubmitKycDocumentInputSchema = z.object({
  sellerId: SellerIdSchema,
  documentType: z.nativeEnum(KycDocumentType),
  documentNumber: z.string().trim().max(100).optional(),
  fileUrl: z.string().trim().min(5, 'File storage path or URL is required'),
  fileSize: z
    .number()
    .int()
    .positive()
    .max(10 * 1024 * 1024, 'Document file size cannot exceed 10 MB'),
  mimeType: z.enum([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
  ]),
});

export type SubmitKycDocumentInput = z.infer<typeof SubmitKycDocumentInputSchema>;

/**
 * Review / Verify KYC Document Input Schema (Admin Only)
 */
export const VerifyKycDocumentInputSchema = z
  .object({
    documentId: KycDocumentIdSchema,
    status: z.enum([KycDocumentStatus.VERIFIED, KycDocumentStatus.REJECTED]),
    rejectionReason: z.string().trim().max(255).optional(),
  })
  .refine(
    (data) => {
      if (data.status === KycDocumentStatus.REJECTED && !data.rejectionReason) {
        return false;
      }
      return true;
    },
    {
      message: 'Rejection reason is mandatory when rejecting a KYC document',
      path: ['rejectionReason'],
    }
  );

export type VerifyKycDocumentInput = z.infer<typeof VerifyKycDocumentInputSchema>;

/**
 * Add Seller Staff Input Schema
 */
export const AddSellerStaffInputSchema = z.object({
  sellerId: SellerIdSchema,
  userId: UserIdSchema,
  roleCode: z.string().trim().default('SELLER_STAFF'),
  permissions: z.array(z.string().trim()).default([]),
});

export type AddSellerStaffInput = z.infer<typeof AddSellerStaffInputSchema>;

/**
 * Update Seller Store Settings Schema (OCC Version Protected)
 */
export const UpdateStoreSettingsInputSchema = z.object({
  sellerId: SellerIdSchema,
  logoUrl: z.string().url('Invalid logo URL').nullable().optional(),
  bannerUrl: z.string().url('Invalid banner URL').nullable().optional(),
  supportEmail: z.string().email('Invalid support email').nullable().optional(),
  supportPhone: BangladeshPhoneSchema.nullable().optional(),
  pickupAddress: AddressSchema.nullable().optional(),
  returnAddress: AddressSchema.nullable().optional(),
  defaultCourier: z.nativeEnum(CourierProvider).nullable().optional(),
  vacationMode: z.boolean().optional(),
  vacationMessage: z.string().trim().max(255).nullable().optional(),
  version: z.number().int().positive('Optimistic concurrency version is required for settings update'),
});

export type UpdateStoreSettingsInput = z.infer<typeof UpdateStoreSettingsInputSchema>;

// Backward-compatible schema definitions for seller domain testing
export const CreateSellerSchema = z.object({
  name: z.string().trim().min(3).max(120).optional(),
  businessName: z.string().trim().min(3).max(120).optional(),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Store slug must be lowercase alphanumeric characters separated by single hyphens'),
  ownerUserId: z.string().optional(),
  companyName: z.string().optional(),
  tradeLicenseNumber: z.string().trim().max(50).optional(),
  binNumber: z
    .string()
    .trim()
    .regex(/^\d{9,13}$/, 'BIN Number must be 9 to 13 digits')
    .optional(),
  tinNumber: z
    .string()
    .trim()
    .regex(/^\d{10,12}$/, 'TIN Number must be 10 to 12 digits')
    .optional(),
  defaultCommissionRate: z.number().min(0).max(100).optional(),
  supportEmail: z.string().email().optional(),
  supportPhone: z.string().optional(),
});

export const UpdateSellerSchema = z.object({
  name: z.string().trim().min(3).max(120).optional(),
  businessName: z.string().trim().min(3).max(120).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING', 'VERIFIED']).optional(),
  isVerified: z.boolean().optional(),
  defaultCommissionRate: z.number().min(0).max(100).optional(),
  tradeLicenseNumber: z.string().trim().max(50).optional(),
  binNumber: z
    .string()
    .trim()
    .regex(/^\d{9,13}$/, 'BIN Number must be 9 to 13 digits')
    .optional(),
  tinNumber: z
    .string()
    .trim()
    .regex(/^\d{10,12}$/, 'TIN Number must be 10 to 12 digits')
    .optional(),
  version: z.number().int().positive().optional(),
});

export const CreateSellerStaffSchema = z.object({
  sellerId: z.string(),
  userId: z.string(),
  role: z.string().optional(),
  roleCode: z.string().optional(),
  permissions: z.array(z.string()).default([]),
});

export const CreateSellerKycDocumentSchema = z.object({
  sellerId: z.string(),
  documentType: z.string(),
  documentNumber: z.string().optional(),
  fileUrl: z.string().optional(),
  fileKey: z.string().optional(),
  fileSize: z.number().int().positive(),
  mimeType: z.string(),
});

export const VerifyKycDocumentSchema = z
  .object({
    documentId: z.string().optional(),
    verifiedByAdminId: z.string().optional(),
    status: z.enum(['VERIFIED', 'REJECTED', 'PENDING']),
    rejectionReason: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.status === 'REJECTED' && !data.rejectionReason) {
        return false;
      }
      return true;
    },
    {
      message: 'Rejection reason is mandatory when rejecting a KYC document',
      path: ['rejectionReason'],
    }
  );

export const UpdateStoreSettingsSchema = z.object({
  sellerId: z.string().optional(),
  autoAcceptOrders: z.boolean().optional(),
  vacationMode: z.boolean().optional(),
  defaultCourier: z.string().optional(),
  shippingCutoffTime: z.string().optional(),
  warehouseAddress: z
    .object({
      addressLine1: z.string().optional(),
      division: z.string().optional(),
      district: z.string().optional(),
      upazilaOrThana: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
    })
    .optional(),
  logoUrl: z.string().url().nullable().optional(),
  bannerUrl: z.string().url().nullable().optional(),
  supportEmail: z.string().email().nullable().optional(),
  supportPhone: z.any().optional(),
  pickupAddress: z.any().optional(),
  returnAddress: z.any().optional(),
  vacationMessage: z.string().nullable().optional(),
  version: z.number().int().positive().optional(),
});
