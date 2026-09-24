import { ActorContext } from '../authz.types';

export interface DiscountRuleResource {
  id?: string;
  sellerId?: string | null;
  fundingType?: string;
}

export class DiscountRulePolicy {
  /**
   * Admin can create any discount rule. Seller can create seller-funded rules scoped to their own sellerId.
   */
  static canCreateDiscountRule(actor: ActorContext, resource: DiscountRuleResource): boolean {
    const isAdmin = actor.roles.includes('ADMIN') || actor.roles.includes('SUPER_ADMIN');
    if (isAdmin) {
      return true;
    }

    const isSeller = actor.roles.includes('SELLER');
    if (isSeller && actor.sellerId) {
      const isOwnedSeller = resource.sellerId === actor.sellerId;
      const isSellerFunded = resource.fundingType === 'SELLER_FUNDED';
      return isOwnedSeller && isSellerFunded;
    }

    return false;
  }

  /**
   * Admin can update any discount rule. Seller can update owned seller-funded rules.
   */
  static canUpdateDiscountRule(actor: ActorContext, resource: DiscountRuleResource): boolean {
    const isAdmin = actor.roles.includes('ADMIN') || actor.roles.includes('SUPER_ADMIN');
    if (isAdmin) {
      return true;
    }

    const isSeller = actor.roles.includes('SELLER');
    if (isSeller && actor.sellerId && resource.sellerId === actor.sellerId) {
      return resource.fundingType === 'SELLER_FUNDED';
    }

    return false;
  }

  /**
   * Read access check for discount rules.
   */
  static canReadDiscountRule(actor: ActorContext, resource: DiscountRuleResource): boolean {
    const isAdmin = actor.roles.includes('ADMIN') || actor.roles.includes('SUPER_ADMIN');
    if (isAdmin) {
      return true;
    }

    const isSeller = actor.roles.includes('SELLER');
    if (isSeller && actor.sellerId) {
      return resource.sellerId === null || resource.sellerId === actor.sellerId;
    }

    return true; // Public evaluation for storefront / checkout
  }
}
