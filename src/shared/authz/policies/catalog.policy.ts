/**
 * AlifWorld Product Catalog & Media Authorization Policy
 * 
 * Governs Categories, Brands, Products, Variants, and Media assets.
 * Supports public storefront reads and tenant-isolated merchant catalog management.
 * 
 * Invariants: ADR-0003, ADR-0022, ADR-0023, Milestone 042
 */

import { IPolicy, ActorContext, ResourceContext, PolicyDecision } from '../authz.types';
import { SystemRoleCode } from '@/features/identity/types';

export class CatalogPolicy implements IPolicy {
  readonly name = 'CatalogPolicy';
  readonly resourceType = 'CATALOG';

  evaluate(actor: ActorContext, action: string, resource: ResourceContext): PolicyDecision {
    const isSuperAdmin = actor.roles.includes(SystemRoleCode.SUPER_ADMIN);
    const isPlatformAdmin = actor.roles.includes(SystemRoleCode.ADMIN);
    const targetSellerId = resource.sellerId;

    // 1. Public Storefront Reading
    if (action === 'read' || action === 'catalog:read') {
      const isPublished = resource.status === 'PUBLISHED' || resource.status === 'ACTIVE' || !resource.status;
      if (isPublished) {
        return { granted: true, code: 'GRANTED', reason: 'Public catalog browse access permitted.', policyName: this.name };
      }

      // Draft or Archived product: requires admin or matching seller owner/staff
      if (isSuperAdmin || isPlatformAdmin || actor.permissions.includes('catalog:read')) {
        return { granted: true, code: 'GRANTED', reason: 'Admin access to draft/archived catalog item.', policyName: this.name };
      }

      if (targetSellerId && actor.sellerId === targetSellerId) {
        return { granted: true, code: 'GRANTED', reason: 'Merchant owner access to unpublished catalog item.', policyName: this.name };
      }

      return {
        granted: false,
        code: 'FORBIDDEN',
        reason: 'Unpublished catalog item is only visible to store staff or platform administrators.',
        policyName: this.name,
      };
    }

    // 2. Super Administrator Global Write Bypass
    if (isSuperAdmin) {
      return { granted: true, code: 'GRANTED', reason: 'Super Administrator holds global catalog privileges.', policyName: this.name };
    }

    // 3. Merchant Multi-Tenant Scope Check
    const isSeller = actor.roles.includes(SystemRoleCode.SELLER_OWNER) || actor.roles.includes(SystemRoleCode.SELLER_STAFF);
    if (isSeller) {
      if (!actor.sellerId || (targetSellerId && actor.sellerId !== targetSellerId)) {
        return {
          granted: false,
          code: 'TENANT_VIOLATION',
          reason: `Seller cannot modify catalog items belonging to store '${targetSellerId || 'unassigned'}'.`,
          policyName: this.name,
          diagnostics: { actorSellerId: actor.sellerId, targetSellerId },
        };
      }
    }

    switch (action) {
      case 'create':
      case 'update':
      case 'catalog:write':
        if (isPlatformAdmin || actor.permissions.includes('catalog:write')) {
          return { granted: true, code: 'GRANTED', reason: 'Authorized to create or update catalog item.', policyName: this.name };
        }
        return {
          granted: false,
          code: 'FORBIDDEN',
          reason: 'Lacks catalog:write permission.',
          policyName: this.name,
        };

      case 'publish':
      case 'catalog:publish':
        if (isPlatformAdmin || actor.permissions.includes('catalog:publish')) {
          return { granted: true, code: 'GRANTED', reason: 'Authorized to publish product to live storefront.', policyName: this.name };
        }
        return {
          granted: false,
          code: 'FORBIDDEN',
          reason: 'Lacks catalog:publish permission.',
          policyName: this.name,
        };

      case 'archive':
      case 'catalog:archive':
        if (isPlatformAdmin || actor.permissions.includes('catalog:archive')) {
          return { granted: true, code: 'GRANTED', reason: 'Authorized to archive product.', policyName: this.name };
        }
        return {
          granted: false,
          code: 'FORBIDDEN',
          reason: 'Lacks catalog:archive permission.',
          policyName: this.name,
        };

      default:
        return {
          granted: false,
          code: 'FORBIDDEN',
          reason: `Unrecognized catalog action '${action}'.`,
          policyName: this.name,
        };
    }
  }
}
