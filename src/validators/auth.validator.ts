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
