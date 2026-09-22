/**
 * AlifWorld Immutable Audit Trail Interface & Action Constants
 * 
 * Captures actor, action, resource, before/after redaction-safe diffs,
 * request IDs, IP, user-agent, and timestamps for compliance and security forensics.
 * 
 * Invariants: ADR-0022, ADR-0031, NIST SP 800-63B, Milestone 040
 */

export const AUDIT_ACTIONS = {
  // Authentication & Session Lifecycle
  AUTH_LOGIN_SUCCESS: 'AUTH_LOGIN_SUCCESS',
  AUTH_LOGIN_FAILED: 'AUTH_LOGIN_FAILED',
  AUTH_LOGOUT: 'AUTH_LOGOUT',
  AUTH_TOKEN_ROTATED: 'AUTH_TOKEN_ROTATED',
  AUTH_BREACH_DETECTED: 'AUTH_BREACH_DETECTED',
  AUTH_SESSION_REVOKED: 'AUTH_SESSION_REVOKED',
  AUTH_SESSION_REVOKE_OTHERS: 'AUTH_SESSION_REVOKE_OTHERS',
  AUTH_SESSION_REVOKE_ALL: 'AUTH_SESSION_REVOKE_ALL',
  AUTH_RATE_LIMIT_EXCEEDED: 'AUTH_RATE_LIMIT_EXCEEDED',

  // Registration & Onboarding
  CUSTOMER_REGISTERED: 'CUSTOMER_REGISTERED',
  OAUTH_USER_REGISTERED: 'OAUTH_USER_REGISTERED',
  OAUTH_ACCOUNT_LINKED: 'OAUTH_ACCOUNT_LINKED',

  // Phone & SMS OTP Verification
  OTP_DISPATCHED: 'OTP_DISPATCHED',
  OTP_VERIFIED: 'OTP_VERIFIED',
  OTP_FAILED: 'OTP_FAILED',

  // Email Verification
  EMAIL_VERIFICATION_SENT: 'EMAIL_VERIFICATION_SENT',
  EMAIL_VERIFIED: 'EMAIL_VERIFIED',

  // Credential Security
  PASSWORD_RESET_REQUESTED: 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_SUCCESS: 'PASSWORD_RESET_SUCCESS',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  PASSWORD_CHANGE_FAILED: 'PASSWORD_CHANGE_FAILED',

  // Authorization & Tenancy
  ROLE_ASSIGNED: 'ROLE_ASSIGNED',
  ROLE_REVOKED: 'ROLE_REVOKED',
  PERMISSION_GRANTED: 'PERMISSION_GRANTED',
  AUTHZ_GRANTED: 'AUTHZ_GRANTED',
  AUTHZ_DENIED: 'AUTHZ_DENIED',
  AUTHZ_TENANT_VIOLATION: 'AUTHZ_TENANT_VIOLATION',
  AUTHZ_MAKER_CHECKER_REQUIRED: 'AUTHZ_MAKER_CHECKER_REQUIRED',
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS] | string;

export interface AuditStateDiff {
  [field: string]: {
    from: any;
    to: any;
  };
}

export interface AuditLogEntry {
  actorId?: string | null;
  actorRole?: string | null;
  action: AuditAction;
  resource: string;
  resourceId?: string | null;
  requestId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
  createdAt?: Date;
}

export interface SanitizedAuditMetadata {
  requestId?: string | null;
  diff?: AuditStateDiff | null;
  [key: string]: any;
}
