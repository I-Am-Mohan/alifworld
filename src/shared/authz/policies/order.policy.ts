/**
 * AlifWorld Order & Fulfillment Authorization Policy
 * 
 * Enforces customer object-ownership, seller fulfillment-group tenant isolation,
 * delivery rider handovers, and administrative management.
 * 
 * Invariants: ADR-0003, ADR-0010, ADR-0022, ADR-0023, Milestone 042
 */

import { IPolicy, ActorContext, ResourceContext, PolicyDecision } from '../authz.types';
import { SystemRoleCode } from '@/features/identity/types';

export class OrderPolicy implements IPolicy {
  readonly name = 'OrderPolicy';
  readonly resourceType = 'ORDER';

  evaluate(actor: ActorContext, action: string, resource: ResourceContext): PolicyDecision {
    const isSuperAdmin = actor.roles.includes(SystemRoleCode.SUPER_ADMIN);
    const isPlatformAdmin = actor.roles.includes(SystemRoleCode.ADMIN);
    const isCustomer = actor.roles.includes(SystemRoleCode.CUSTOMER);
    const isRider = actor.roles.includes(SystemRoleCode.RIDER);
    const isSeller = actor.roles.includes(SystemRoleCode.SELLER_OWNER) || actor.roles.includes(SystemRoleCode.SELLER_STAFF);

    // 1. Super Administrator Global Bypass
    if (isSuperAdmin) {
      return { granted: true, code: 'GRANTED', reason: 'Super Administrator holds global order access.', policyName: this.name };
    }

    // 2. Read Action Evaluation
    if (action === 'read' || action === 'orders:read') {
      // Platform admin can view all orders globally
      if (isPlatformAdmin) {
        return { granted: true, code: 'GRANTED', reason: 'Administrator authorized to inspect orders.', policyName: this.name };
      }

      // Customer reading own order
      if (isCustomer && resource.ownerId) {
        if (resource.ownerId === actor.userId) {
          return { granted: true, code: 'GRANTED', reason: 'Customer accessing own order.', policyName: this.name };
        }
        return {
          granted: false,
          code: 'OWNERSHIP_VIOLATION',
          reason: 'Cannot view orders placed by another customer.',
          policyName: this.name,
          diagnostics: { actorId: actor.userId, orderOwnerId: resource.ownerId },
        };
      }

      // Seller reading order belonging to their fulfillment group
      if (isSeller && resource.sellerId) {
        if (actor.sellerId === resource.sellerId) {
          return { granted: true, code: 'GRANTED', reason: 'Seller accessing order in their fulfillment group.', policyName: this.name };
        }
        return {
          granted: false,
          code: 'TENANT_VIOLATION',
          reason: 'Cannot view orders assigned to a different merchant fulfillment group.',
          policyName: this.name,
          diagnostics: { actorSellerId: actor.sellerId, orderSellerId: resource.sellerId },
        };
      }

      // Delivery Rider assigned to order
      if (isRider && resource.data?.riderId) {
        if (resource.data.riderId === actor.userId) {
          return { granted: true, code: 'GRANTED', reason: 'Delivery rider accessing assigned fulfillment shipment.', policyName: this.name };
        }
        return {
          granted: false,
          code: 'OWNERSHIP_VIOLATION',
          reason: 'Rider can only inspect orders assigned to their delivery route.',
          policyName: this.name,
        };
      }

      if (actor.permissions.includes('orders:read') && !isCustomer && !isSeller) {
        return { granted: true, code: 'GRANTED', reason: 'Operator authorized to inspect orders.', policyName: this.name };
      }

      return {
        granted: false,
        code: 'FORBIDDEN',
        reason: 'Lacks privileges to read this order.',
        policyName: this.name,
      };
    }

    // 3. Order Processing & Fulfillment (manage)
    if (action === 'manage' || action === 'orders:manage') {
      if (isPlatformAdmin) {
        return { granted: true, code: 'GRANTED', reason: 'Admin authorized to manage orders.', policyName: this.name };
      }

      if (isSeller && resource.sellerId && actor.sellerId === resource.sellerId) {
        return { granted: true, code: 'GRANTED', reason: 'Seller authorized to process fulfillment group.', policyName: this.name };
      }

      if (isRider && resource.data?.riderId === actor.userId) {
        return { granted: true, code: 'GRANTED', reason: 'Rider authorized to complete delivery status updates.', policyName: this.name };
      }

      if (actor.permissions.includes('orders:manage') && !isCustomer && !isSeller) {
        return { granted: true, code: 'GRANTED', reason: 'Operator authorized to manage orders.', policyName: this.name };
      }

      return {
        granted: false,
        code: 'FORBIDDEN',
        reason: 'Unauthorized to process or fulfill this order.',
        policyName: this.name,
      };
    }

    // 4. Order Cancellation (cancel)
    if (action === 'cancel' || action === 'orders:cancel') {
      if (isPlatformAdmin || actor.permissions.includes('orders:cancel')) {
        return { granted: true, code: 'GRANTED', reason: 'Admin authorized to cancel orders.', policyName: this.name };
      }

      // Customer cancelling own pending order
      if (isCustomer && resource.ownerId === actor.userId) {
        const orderStatus = resource.status || resource.data?.status;
        const cancellableStates = ['PENDING', 'PLACED', 'PAYMENT_PENDING'];
        if (orderStatus && !cancellableStates.includes(orderStatus)) {
          return {
            granted: false,
            code: 'FORBIDDEN',
            reason: `Order cannot be cancelled in '${orderStatus}' status.`,
            policyName: this.name,
          };
        }
        return { granted: true, code: 'GRANTED', reason: 'Customer cancelling eligible pending order.', policyName: this.name };
      }

      return {
        granted: false,
        code: 'FORBIDDEN',
        reason: 'Lacks privileges to cancel this order.',
        policyName: this.name,
      };
    }

    // 5. Refund Issuance (refund)
    if (action === 'refund' || action === 'orders:refund') {
      if (isPlatformAdmin || actor.permissions.includes('orders:refund')) {
        return { granted: true, code: 'GRANTED', reason: 'Admin authorized to issue order refunds.', policyName: this.name };
      }
      return {
        granted: false,
        code: 'FORBIDDEN',
        reason: 'Only platform administrators can authorize and issue refunds.',
        policyName: this.name,
      };
    }

    return {
      granted: false,
      code: 'FORBIDDEN',
      reason: `Unrecognized order action '${action}'.`,
      policyName: this.name,
    };
  }
}
