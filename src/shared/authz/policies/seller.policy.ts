/**
 * AlifWorld Multi-Tenant Seller Storefront & Settings Authorization Policy
 * 
 * Enforces strict merchant tenant isolation.
 * Prohibits cross-tenant leaks while preserving Super Admin platform oversight.
 * 
 * Invariants: ADR-0003, ADR-0006, ADR-0022, ADR-0023, Milestone 042
 */

import { IPolicy, ActorContext, ResourceContext, PolicyDecision } from '../authz.types';
import { SystemRoleCode } from '@/features/identity/types';

export class SellerPolicy implements IPolicy {
  readonly name = 'SellerPolicy';
  readonly resourceType = 'SELLER';

  evaluate(actor: ActorContext, action: string, resource: ResourceContext): PolicyDecision {
    const isSuperAdmin = actor.roles.includes(SystemRoleCode.SUPER_ADMIN);
    const targetSellerId = resource.sellerId || resource.id;

    // 1. Super Administrator Global Bypass
    if (isSuperAdmin) {
      return {
        granted: true,
        code: 'GRANTED',
        reason: 'Super Administrator holds global operational privileges.',
        policyName: this.name,
      };
    }

    // 2. Seller application administration and applicant ownership.
    if (action === 'seller_application:read' || action === 'seller_application:create' || action === 'seller_application:update' || action === 'seller_application:submit') {
      if (resource.ownerId && resource.ownerId === actor.userId) {
        return { granted: true, code: 'GRANTED', reason: 'Applicant owns the seller application.', policyName: this.name };
      }
      if (resource.sellerId && actor.sellerId === resource.sellerId) {
        return { granted: true, code: 'GRANTED', reason: 'Actor belongs to the seller application tenant.', policyName: this.name };
      }
      return { granted: false, code: 'OWNERSHIP_VIOLATION', reason: 'Seller application access is limited to its applicant or seller tenant.', policyName: this.name };
    }

    if (action === 'seller_application:review' || action === 'seller_application:approve' || action === 'seller_application:reject' || action === 'seller_application:request_changes') {
      const isSellerRole = actor.roles.includes(SystemRoleCode.SELLER_OWNER) || actor.roles.includes(SystemRoleCode.SELLER_STAFF) || actor.roles.includes('SELLER_MANAGER');
      if (isSellerRole) {
        return { granted: false, code: 'PRIVILEGE_ESCALATION', reason: 'Seller users cannot review or approve seller applications.', policyName: this.name };
      }
      if (actor.permissions.includes('sellers:verify')) {
        return { granted: true, code: 'GRANTED', reason: 'Authorized platform reviewer.', policyName: this.name };
      }
      return { granted: false, code: 'MISSING_PERMISSION', reason: 'The actor lacks sellers:verify permission.', policyName: this.name };
    }

    // 3. Platform Administrative Actions
    if (action === 'verify' || action === 'sellers:verify') {
      if (actor.permissions.includes('sellers:verify')) {
        return { granted: true, code: 'GRANTED', reason: 'Authorized to verify merchant KYC dossiers.', policyName: this.name };
      }
      return {
        granted: false,
        code: 'FORBIDDEN',
        reason: 'Lacks sellers:verify administrative permission.',
        policyName: this.name,
      };
    }

    if (action === 'suspend' || action === 'sellers:suspend') {
      if (actor.permissions.includes('sellers:suspend')) {
        return { granted: true, code: 'GRANTED', reason: 'Authorized to suspend merchant store operations.', policyName: this.name };
      }
      return {
        granted: false,
        code: 'FORBIDDEN',
        reason: 'Lacks sellers:suspend administrative permission.',
        policyName: this.name,
      };
    }

    if (action === 'read_directory' || action === 'sellers:read') {
      if (actor.permissions.includes('sellers:read')) {
        return { granted: true, code: 'GRANTED', reason: 'Authorized to view merchant directory.', policyName: this.name };
      }
      // Public directory view for approved/active storefronts
      if (resource.status === 'VERIFIED' || resource.status === 'ACTIVE') {
        return { granted: true, code: 'GRANTED', reason: 'Public storefront directory read.', policyName: this.name };
      }
    }

    // 3. Multi-Tenant Scoping for Store-Level Actions
    if (!targetSellerId) {
      return {
        granted: false,
        code: 'TENANT_VIOLATION',
        reason: 'Target seller tenant identifier must be specified.',
        policyName: this.name,
      };
    }

    // Must be assigned to this specific seller tenant
    if (actor.sellerId !== targetSellerId) {
      return {
        granted: false,
        code: 'TENANT_VIOLATION',
        reason: `Cross-tenant access violation: Actor belongs to '${actor.sellerId || 'none'}' but requested tenant '${targetSellerId}'.`,
        policyName: this.name,
        diagnostics: { actorSellerId: actor.sellerId, targetSellerId },
      };
    }

    // 4. Granular Store Role & Permission Checks
    const isOwner = actor.roles.includes(SystemRoleCode.SELLER_OWNER);
    const isStaff = actor.roles.includes(SystemRoleCode.SELLER_STAFF);

    switch (action) {
      case 'read':
      case 'seller:read':
      case 'staff:read':
      case 'seller:staff:read':
        return { granted: true, code: 'GRANTED', reason: 'Authorized store staff/owner read access.', policyName: this.name };

      case 'manage':
      case 'seller:profile:manage':
        if (isOwner || actor.permissions.includes('seller:profile:manage')) {
          return { granted: true, code: 'GRANTED', reason: 'Authorized to manage store profile and settings.', policyName: this.name };
        }
        return {
          granted: false,
          code: 'FORBIDDEN',
          reason: 'Only the store owner or authorized staff can manage store settings.',
          policyName: this.name,
        };

      case 'staff:manage':
      case 'seller:staff:manage':
        if (isOwner || actor.permissions.includes('seller:staff:manage')) {
          return { granted: true, code: 'GRANTED', reason: 'Authorized to manage store staff.', policyName: this.name };
        }
        return {
          granted: false,
          code: 'FORBIDDEN',
          reason: 'Only the store owner can delegate staff roles.',
          policyName: this.name,
        };

      default:
        return {
          granted: false,
          code: 'FORBIDDEN',
          reason: `Unrecognized or unauthorized seller action '${action}'.`,
          policyName: this.name,
        };
    }
  }
}
