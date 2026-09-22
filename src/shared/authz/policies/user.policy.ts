/**
 * AlifWorld User Account Authorization Policy
 * 
 * Governs read, write, suspension, and deletion operations on User profiles.
 * Enforces self-ownership, admin delegation, and privilege escalation barriers.
 * 
 * Invariants: ADR-0003, ADR-0022, ADR-0023, Milestone 042
 */

import { IPolicy, ActorContext, ResourceContext, PolicyDecision } from '../authz.types';
import { SystemRoleCode } from '@/features/identity/types';

export class UserPolicy implements IPolicy {
  readonly name = 'UserPolicy';
  readonly resourceType = 'USER';

  evaluate(actor: ActorContext, action: string, resource: ResourceContext): PolicyDecision {
    const isSuperAdmin = actor.roles.includes(SystemRoleCode.SUPER_ADMIN);
    const isPlatformAdmin = actor.roles.includes(SystemRoleCode.ADMIN);
    const isSelf = Boolean(resource.id && actor.userId === resource.id);
    const targetRoles = (resource.data?.roles as string[] | undefined) || [];

    // 1. Target Privilege Escalation Defense:
    // Only a SUPER_ADMIN can modify, suspend, or delete another SUPER_ADMIN or ADMIN
    const targetIsAdmin = targetRoles.includes(SystemRoleCode.SUPER_ADMIN) || targetRoles.includes(SystemRoleCode.ADMIN);
    if (targetIsAdmin && !isSuperAdmin && !isSelf && (action === 'update' || action === 'suspend' || action === 'delete')) {
      return {
        granted: false,
        code: 'PRIVILEGE_ESCALATION',
        reason: 'Only a Super Administrator can modify or suspend an administrative operator.',
        policyName: this.name,
        diagnostics: { actorId: actor.userId, targetId: resource.id, targetRoles },
      };
    }

    switch (action) {
      case 'read':
      case 'users:read': {
        // Self-read or users:read permission
        if (isSelf || isSuperAdmin || actor.permissions.includes('users:read')) {
          return { granted: true, code: 'GRANTED', reason: 'User is authorized to read this profile.', policyName: this.name };
        }
        return {
          granted: false,
          code: 'FORBIDDEN',
          reason: 'Lacks permission to view other user profiles.',
          policyName: this.name,
        };
      }

      case 'update':
      case 'users:write': {
        // Self-update or users:write permission
        if (isSelf || isSuperAdmin || actor.permissions.includes('users:write')) {
          return { granted: true, code: 'GRANTED', reason: 'User is authorized to update this profile.', policyName: this.name };
        }
        return {
          granted: false,
          code: 'FORBIDDEN',
          reason: 'Lacks permission to update this profile.',
          policyName: this.name,
        };
      }

      case 'suspend':
      case 'users:suspend': {
        if (isSelf) {
          return {
            granted: false,
            code: 'FORBIDDEN',
            reason: 'Cannot suspend your own account.',
            policyName: this.name,
          };
        }
        if (isSuperAdmin || actor.permissions.includes('users:suspend')) {
          return { granted: true, code: 'GRANTED', reason: 'Authorized to suspend user accounts.', policyName: this.name };
        }
        return {
          granted: false,
          code: 'FORBIDDEN',
          reason: 'Lacks users:suspend permission.',
          policyName: this.name,
        };
      }

      case 'delete':
      case 'users:delete': {
        if (isSelf) {
          return {
            granted: false,
            code: 'FORBIDDEN',
            reason: 'Cannot soft-delete your own active account directly through administrative endpoints.',
            policyName: this.name,
          };
        }
        if (isSuperAdmin) {
          return { granted: true, code: 'GRANTED', reason: 'Super Administrator authorized to soft-delete user accounts.', policyName: this.name };
        }
        return {
          granted: false,
          code: 'FORBIDDEN',
          reason: 'Only a Super Administrator has account soft-deletion privileges.',
          policyName: this.name,
        };
      }

      default:
        return {
          granted: false,
          code: 'FORBIDDEN',
          reason: `Unrecognized user action '${action}'.`,
          policyName: this.name,
        };
    }
  }
}
