/**
 * AlifWorld RBAC Role & Permission Assignment Authorization Policy
 * 
 * Enforces role delegation boundaries, privilege escalation barriers,
 * and seller-tenant scoping requirements.
 * 
 * Invariants: ADR-0003, ADR-0022, ADR-0023, Milestone 042
 */

import { IPolicy, ActorContext, ResourceContext, PolicyDecision } from '../authz.types';
import { SystemRoleCode } from '@/features/identity/types';

export class RolePolicy implements IPolicy {
  readonly name = 'RolePolicy';
  readonly resourceType = 'ROLE';

  evaluate(actor: ActorContext, action: string, resource: ResourceContext): PolicyDecision {
    const isSuperAdmin = actor.roles.includes(SystemRoleCode.SUPER_ADMIN);
    const isPlatformAdmin = actor.roles.includes(SystemRoleCode.ADMIN);
    const targetRoleCode = (resource.data?.roleCode || resource.data?.code || '').toUpperCase();
    const targetSellerId = resource.sellerId || resource.data?.sellerId;

    switch (action) {
      case 'read':
      case 'roles:read':
        if (isSuperAdmin || isPlatformAdmin || actor.permissions.includes('roles:read')) {
          return { granted: true, code: 'GRANTED', reason: 'Authorized to view roles catalogue.', policyName: this.name };
        }
        return {
          granted: false,
          code: 'FORBIDDEN',
          reason: 'Lacks roles:read permission.',
          policyName: this.name,
        };

      case 'manage':
      case 'roles:manage':
        if (isSuperAdmin || actor.permissions.includes('roles:manage')) {
          return { granted: true, code: 'GRANTED', reason: 'Authorized to manage custom roles.', policyName: this.name };
        }
        return {
          granted: false,
          code: 'FORBIDDEN',
          reason: 'Lacks roles:manage permission.',
          policyName: this.name,
        };

      case 'assign':
      case 'roles:assign': {
        // 1. Only SUPER_ADMIN can assign SUPER_ADMIN
        if (targetRoleCode === SystemRoleCode.SUPER_ADMIN && !isSuperAdmin) {
          return {
            granted: false,
            code: 'PRIVILEGE_ESCALATION',
            reason: 'Only a Super Administrator can assign the SUPER_ADMIN role.',
            policyName: this.name,
          };
        }

        // 2. Seller roles strictly require sellerId scoping
        const isSellerRole =
          targetRoleCode === SystemRoleCode.SELLER_OWNER ||
          targetRoleCode === SystemRoleCode.SELLER_STAFF ||
          targetRoleCode === 'SELLER_MANAGER';

        if (isSellerRole && !targetSellerId) {
          return {
            granted: false,
            code: 'TENANT_VIOLATION',
            reason: `Role '${targetRoleCode}' requires a non-empty 'sellerId' tenant scope.`,
            policyName: this.name,
          };
        }

        // 3. Platform Admin or Super Admin can assign platform and seller roles
        if (isSuperAdmin || isPlatformAdmin || actor.permissions.includes('roles:assign')) {
          return { granted: true, code: 'GRANTED', reason: 'Administrator authorized to assign role.', policyName: this.name };
        }

        // 4. Store Owner delegating staff role within their own store
        const isStoreOwner = actor.roles.includes(SystemRoleCode.SELLER_OWNER);
        if (isStoreOwner && targetSellerId && actor.sellerId === targetSellerId) {
          const delegatableRoles = [SystemRoleCode.SELLER_STAFF, 'SELLER_MANAGER'];
          if (delegatableRoles.includes(targetRoleCode as any)) {
            return { granted: true, code: 'GRANTED', reason: 'Store owner delegating store staff role.', policyName: this.name };
          }
        }

        return {
          granted: false,
          code: 'FORBIDDEN',
          reason: 'Insufficient privileges to assign this role.',
          policyName: this.name,
        };
      }

      case 'revoke':
      case 'roles:revoke': {
        if (isSuperAdmin || isPlatformAdmin || actor.permissions.includes('roles:assign')) {
          return { granted: true, code: 'GRANTED', reason: 'Administrator authorized to revoke role.', policyName: this.name };
        }

        const isStoreOwner = actor.roles.includes(SystemRoleCode.SELLER_OWNER);
        if (isStoreOwner && targetSellerId && actor.sellerId === targetSellerId) {
          return { granted: true, code: 'GRANTED', reason: 'Store owner revoking store staff role.', policyName: this.name };
        }

        return {
          granted: false,
          code: 'FORBIDDEN',
          reason: 'Insufficient privileges to revoke this role.',
          policyName: this.name,
        };
      }

      default:
        return {
          granted: false,
          code: 'FORBIDDEN',
          reason: `Unrecognized role action '${action}'.`,
          policyName: this.name,
        };
    }
  }
}
