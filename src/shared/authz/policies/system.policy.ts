/**
 * AlifWorld Platform System Settings & Root Operations Authorization Policy
 * 
 * Enforces strict separation between Admin and Super Admin capabilities
 * for platform system settings, payment/storage credentials, maintenance mode,
 * and immutable security audit logs.
 * 
 * Invariants: ADR-0003, ADR-0006, ADR-0022, ADR-0023, Milestone 044
 */

import { IPolicy, ActorContext, ResourceContext, PolicyDecision } from '../authz.types';
import { SystemRoleCode } from '@/features/identity/types';

/**
 * Root credentials and locked invariant keys that strictly require SUPER_ADMIN authority.
 */
export const SUPER_ADMIN_ONLY_CONFIG_KEYS = new Set([
  'STORAGE_S3_ACCESS_KEY',
  'STORAGE_S3_SECRET_KEY',
  'STORAGE_S3_ENDPOINT',
  'STORAGE_S3_BUCKET',
  'STORAGE_R2_ACCESS_KEY',
  'STORAGE_R2_SECRET_KEY',
  'STORAGE_R2_ENDPOINT',
  'STORAGE_R2_BUCKET',
  'PAYMENT_BKASH_APP_KEY',
  'PAYMENT_BKASH_APP_SECRET',
  'PAYMENT_BKASH_PASSWORD',
  'PAYMENT_NAGAD_PRIVATE_KEY',
  'COURIER_PATHAO_CLIENT_SECRET',
  'COURIER_PATHAO_PASSWORD',
  'COURIER_STEADFAST_SECRET_KEY',
  'SMS_GATEWAY_API_KEY',
  'FEATURE_POINTS_CASH_CONVERTIBLE', // Locked Invariant
  'FEATURE_MAINTENANCE_MODE',        // Emergency platform kill-switch
  'PLATFORM_CURRENCY',              // Root base currency
  'PLATFORM_TIMEZONE',              // Business timezone invariant
  'MAKER_CHECKER_THRESHOLD_POISHA',
]);

export class SystemPolicy implements IPolicy {
  readonly name = 'SystemPolicy';
  readonly resourceType = 'SYSTEM';

  evaluate(actor: ActorContext, action: string, resource: ResourceContext): PolicyDecision {
    const isSuperAdmin = actor.roles.includes(SystemRoleCode.SUPER_ADMIN);
    const isPlatformAdmin = actor.roles.includes(SystemRoleCode.ADMIN);

    // 1. Super Administrator Global System Bypass
    if (isSuperAdmin) {
      return {
        granted: true,
        code: 'GRANTED',
        reason: 'Super Administrator holds full platform root authority.',
        policyName: this.name,
      };
    }

    switch (action) {
      case 'read':
      case 'system:read':
      case 'system:config:read': {
        // Operational admins can read standard settings
        if (isPlatformAdmin || actor.permissions.includes('system:config')) {
          return { granted: true, code: 'GRANTED', reason: 'Admin authorized to read operational configuration.', policyName: this.name };
        }
        return {
          granted: false,
          code: 'FORBIDDEN',
          reason: 'Lacks system configuration read privileges.',
          policyName: this.name,
        };
      }

      case 'write':
      case 'update':
      case 'config':
      case 'system:config': {
        if (!isPlatformAdmin && !actor.permissions.includes('system:config')) {
          return {
            granted: false,
            code: 'FORBIDDEN',
            reason: 'Lacks system:config administrative permission.',
            policyName: this.name,
          };
        }

        // Check if any attempted keys are Super Admin only
        const keysBeingUpdated: string[] = resource.data?.keys || (resource.data?.config ? Object.keys(resource.data.config) : []);
        const sensitiveKeys = keysBeingUpdated.filter((k) => SUPER_ADMIN_ONLY_CONFIG_KEYS.has(k));

        if (sensitiveKeys.length > 0) {
          return {
            granted: false,
            code: 'PRIVILEGE_ESCALATION',
            reason: `Privilege escalation blocked: Modifying root security credentials or locked invariants (${sensitiveKeys.join(', ')}) strictly requires Super Administrator privileges.`,
            policyName: this.name,
            diagnostics: { sensitiveKeys },
          };
        }

        return {
          granted: true,
          code: 'GRANTED',
          reason: 'Platform Administrator authorized to update routine operational configuration.',
          policyName: this.name,
        };
      }

      case 'audit_read':
      case 'audit:read':
      case 'system:audit_read': {
        if (actor.permissions.includes('system:audit_read')) {
          return { granted: true, code: 'GRANTED', reason: 'Authorized to inspect operational audit logs.', policyName: this.name };
        }
        return {
          granted: false,
          code: 'FORBIDDEN',
          reason: 'Lacks system:audit_read permission.',
          policyName: this.name,
        };
      }

      default:
        return {
          granted: false,
          code: 'FORBIDDEN',
          reason: `Unrecognized system action '${action}'.`,
          policyName: this.name,
        };
    }
  }
}
