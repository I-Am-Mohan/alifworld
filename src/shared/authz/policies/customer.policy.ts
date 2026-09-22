/**
 * AlifWorld Customer Domain Authorization Policy
 * 
 * Enforces self-service object ownership, personal data minimization,
 * customer address protection, and privilege escalation barriers.
 * 
 * Invariants: ADR-0003, ADR-0006, ADR-0022, ADR-0023, Milestone 046
 */

import { IPolicy, ActorContext, ResourceContext, PolicyDecision } from '../authz.types';
import { SystemRoleCode } from '@/features/identity/types';

export class CustomerPolicy implements IPolicy {
  readonly name = 'CustomerPolicy';
  readonly resourceType = 'CUSTOMER';

  evaluate(actor: ActorContext, action: string, resource: ResourceContext): PolicyDecision {
    const isSuperAdmin = actor.roles.includes(SystemRoleCode.SUPER_ADMIN);
    const isPlatformAdmin = actor.roles.includes(SystemRoleCode.ADMIN);
    const isSupport = actor.roles.includes(SystemRoleCode.SUPPORT);
    const targetCustomerId = resource.id || resource.ownerId;
    const isSelf = Boolean(targetCustomerId && actor.userId === targetCustomerId);

    // 1. Super Administrator Global Operational Bypass
    if (isSuperAdmin) {
      return {
        granted: true,
        code: 'GRANTED',
        reason: 'Super Administrator holds global customer administration privileges.',
        policyName: this.name,
      };
    }

    // 2. Personal Data Minimization & Anti-Tampering Check:
    // Regular customer attempting to access another customer's profile/data
    if (!isSelf && !isPlatformAdmin && !isSupport && !actor.permissions.includes('users:read')) {
      return {
        granted: false,
        code: 'OWNERSHIP_VIOLATION',
        reason: 'Customers are strictly prohibited from inspecting or modifying another customer\'s profile.',
        policyName: this.name,
        diagnostics: { actorId: actor.userId, targetCustomerId },
      };
    }

    switch (action) {
      case 'read':
      case 'customers:read':
      case 'customer:profile:read': {
        // Self-read or authorized Support/Admin
        if (isSelf) {
          return { granted: true, code: 'GRANTED', reason: 'Customer reading own profile and preferences.', policyName: this.name };
        }

        if (isPlatformAdmin || isSupport || actor.permissions.includes('users:read') || actor.permissions.includes('support:read')) {
          return {
            granted: true,
            code: 'GRANTED',
            reason: 'Authorized customer service operator inspecting customer profile.',
            policyName: this.name,
          };
        }

        return {
          granted: false,
          code: 'FORBIDDEN',
          reason: 'Lacks privileges to read customer personal data.',
          policyName: this.name,
        };
      }

      case 'update':
      case 'customer:profile:update': {
        // Customer self-update: cannot tamper with internal status, verified flags, or wallet balance
        if (isSelf) {
          const attemptedFields = resource.data ? Object.keys(resource.data) : [];
          const protectedFields = ['status', 'roles', 'isEmailVerified', 'isPhoneVerified', 'walletBalance', 'points'];
          const illegalAttempts = attemptedFields.filter((f) => protectedFields.includes(f));

          if (illegalAttempts.length > 0) {
            return {
              granted: false,
              code: 'PRIVILEGE_ESCALATION',
              reason: `Customers cannot modify protected security fields: ${illegalAttempts.join(', ')}.`,
              policyName: this.name,
              diagnostics: { illegalAttempts },
            };
          }

          return { granted: true, code: 'GRANTED', reason: 'Customer updating own self-service profile.', policyName: this.name };
        }

        if (isPlatformAdmin || actor.permissions.includes('users:write')) {
          return { granted: true, code: 'GRANTED', reason: 'Administrator updating customer profile.', policyName: this.name };
        }

        return {
          granted: false,
          code: 'FORBIDDEN',
          reason: 'Unauthorized to update this customer profile.',
          policyName: this.name,
        };
      }

      case 'addresses:read':
      case 'addresses:write':
      case 'addresses:delete':
      case 'customer:address:manage': {
        // Customer addresses: strict self-service ownership
        if (isSelf) {
          return { granted: true, code: 'GRANTED', reason: 'Customer managing own delivery addresses.', policyName: this.name };
        }

        if (isPlatformAdmin || (isSupport && action === 'addresses:read')) {
          return { granted: true, code: 'GRANTED', reason: 'Operator accessing customer delivery address.', policyName: this.name };
        }

        return {
          granted: false,
          code: 'OWNERSHIP_VIOLATION',
          reason: 'Cannot view or alter delivery addresses belonging to another customer.',
          policyName: this.name,
        };
      }

      case 'reviews:manage':
      case 'customer:review:write': {
        // Review creation/management: only the customer who purchased the product
        if (isSelf) {
          return { granted: true, code: 'GRANTED', reason: 'Customer authoring review for verified purchase.', policyName: this.name };
        }

        return {
          granted: false,
          code: 'OWNERSHIP_VIOLATION',
          reason: 'Cannot author or alter product reviews under another customer identity.',
          policyName: this.name,
        };
      }

      case 'export_data':
      case 'privacy:export': {
        // GDPR / Privacy Personal Data Export: Self-service only
        if (isSelf) {
          return { granted: true, code: 'GRANTED', reason: 'Customer downloading own personal data dossier.', policyName: this.name };
        }

        return {
          granted: false,
          code: 'OWNERSHIP_VIOLATION',
          reason: 'Personal data export requests can only be initiated by the account owner.',
          policyName: this.name,
        };
      }

      default:
        return {
          granted: false,
          code: 'FORBIDDEN',
          reason: `Unrecognized or unauthorized customer action '${action}'.`,
          policyName: this.name,
        };
    }
  }
}
