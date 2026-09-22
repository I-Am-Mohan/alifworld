/**
 * Identity & Access Management (IAM) Zod Validation Schemas
 * 
 * Enforces strict input validation, Bangladesh phone normalization,
 * identifier structure checks, and versioned mutations.
 * 
 * Reference: docs/architecture/scope-boundaries-and-domain-map.md
 * Invariant: ADR-0003, ADR-0022, ADR-0023
 */

import { z } from 'zod';
import { UserStatus, SystemRoleCode, PermissionModule } from '../types';
import { normalizeBangladeshPhone, isValidBangladeshPhone } from '@/shared/utils/phone';
import { isValidId, ID_PREFIXES } from '@/shared/utils/id';

/**
 * Zod refinement for standardized ID validation with prefix.
 */
function createPrefixedIdSchema(expectedPrefix?: (typeof ID_PREFIXES)[keyof typeof ID_PREFIXES]) {
  return z.string().refine((val) => isValidId(val, expectedPrefix), {
    message: `Invalid identifier. Expected format: ${expectedPrefix ? expectedPrefix + '_' : ''}[0-9a-z]{16,40}`,
  });
}

export const UserIdSchema = createPrefixedIdSchema(ID_PREFIXES.USER);
export const RoleIdSchema = createPrefixedIdSchema(ID_PREFIXES.ROLE);
export const PermissionIdSchema = createPrefixedIdSchema(ID_PREFIXES.PERMISSION);
export const RoleAssignmentIdSchema = createPrefixedIdSchema(ID_PREFIXES.ROLE_ASSIGNMENT);
export const SellerIdSchema = createPrefixedIdSchema(ID_PREFIXES.SELLER);

/**
 * Bangladesh phone number Zod transformer.
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
 * Case-insensitive normalized email schema.
 */
export const EmailSchema = z
  .string()
  .transform((val) => val.trim().toLowerCase())
  .pipe(z.string().email('Invalid email address format'));

/**
 * Create User Input Schema
 * Requires at least an email or a valid Bangladesh phone number.
 */
export const CreateUserInputSchema = z
  .object({
    email: EmailSchema.optional(),
    phone: BangladeshPhoneSchema.optional(),
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100).optional(),
    avatarUrl: z.string().url('Invalid avatar URL').optional(),
    initialRoleCode: z.nativeEnum(SystemRoleCode).default(SystemRoleCode.CUSTOMER),
    sellerId: SellerIdSchema.optional(),
  })
  .refine((data) => Boolean(data.email || data.phone), {
    message: 'Either email or Bangladesh phone number must be provided for user registration',
    path: ['email'],
  });

export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;

/**
 * Update User Input Schema (OCC Version Protected)
 */
export const UpdateUserInputSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  avatarUrl: z.string().url().nullable().optional(),
  status: z.nativeEnum(UserStatus).optional(),
  version: z.number().int().positive('Optimistic concurrency version is required for update'),
});

export type UpdateUserInput = z.infer<typeof UpdateUserInputSchema>;

/**
 * User Filter Query Schema
 */
export const UserFilterQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.nativeEnum(UserStatus).optional(),
  roleCode: z.string().trim().optional(),
  sellerId: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type UserFilterQuery = z.infer<typeof UserFilterQuerySchema>;

/**
 * Create Role Input Schema
 */
export const CreateRoleInputSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(3, 'Role code must be at least 3 characters')
    .max(50)
    .regex(/^[A-Z0-9_]+$/, 'Role code must contain only uppercase letters, numbers, and underscores'),
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(255).optional(),
  permissionCodes: z.array(z.string()).default([]),
});

export type CreateRoleInput = z.infer<typeof CreateRoleInputSchema>;

/**
 * Update Role Input Schema (OCC Version Protected)
 */
export const UpdateRoleInputSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(255).optional(),
  version: z.number().int().positive('Optimistic concurrency version is required for role update'),
});

export type UpdateRoleInput = z.infer<typeof UpdateRoleInputSchema>;

/**
 * Create Permission Input Schema
 */
export const CreatePermissionInputSchema = z.object({
  code: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(100)
    .regex(/^[a-z0-9_]+:[a-z0-9_]+$/, 'Permission code must follow format "module:action" (e.g. users:read)'),
  name: z.string().trim().min(2).max(100),
  module: z.nativeEnum(PermissionModule),
  description: z.string().trim().max(255).optional(),
});

export type CreatePermissionInput = z.infer<typeof CreatePermissionInputSchema>;

/**
 * Assign Role to User Input Schema
 */
export const AssignRoleInputSchema = z.object({
  userId: UserIdSchema,
  roleId: RoleIdSchema,
  sellerId: SellerIdSchema.optional(),
});

export type AssignRoleInput = z.infer<typeof AssignRoleInputSchema>;

/**
 * Revoke Role from User Input Schema
 */
export const RevokeRoleInputSchema = z.object({
  assignmentId: RoleAssignmentIdSchema.optional(),
  userId: UserIdSchema.optional(),
  roleId: RoleIdSchema.optional(),
  sellerId: SellerIdSchema.optional(),
}).refine(
  (data) => Boolean(data.assignmentId || (data.userId && data.roleId)),
  {
    message: 'Either assignmentId or both userId and roleId must be specified to revoke a role',
  }
);

export type RevokeRoleInput = z.infer<typeof RevokeRoleInputSchema>;
