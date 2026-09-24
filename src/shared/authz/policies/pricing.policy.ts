import { ActorContext } from '../authz.types';

export interface PriceListResource {
  id?: string;
  sellerId?: string | null;
  channel?: string;
}

export class PricingPolicy {
  /**
   * Admin can create any price list. Seller can create price lists scoped to their own sellerId.
   */
  static canCreatePriceList(actor: ActorContext, resource: PriceListResource): boolean {
    const isAdmin = actor.roles.includes('ADMIN') || actor.roles.includes('SUPER_ADMIN');
    if (isAdmin) {
      return true;
    }

    const isSeller = actor.roles.includes('SELLER');
    if (isSeller && actor.sellerId) {
      return resource.sellerId === actor.sellerId;
    }

    return false;
  }

  /**
   * Admin can update any price list. Seller can only update price lists they own.
   */
  static canUpdatePriceList(actor: ActorContext, resource: PriceListResource): boolean {
    const isAdmin = actor.roles.includes('ADMIN') || actor.roles.includes('SUPER_ADMIN');
    if (isAdmin) {
      return true;
    }

    const isSeller = actor.roles.includes('SELLER');
    if (isSeller && actor.sellerId) {
      return resource.sellerId === actor.sellerId;
    }

    return false;
  }

  /**
   * Admin can read all price lists. Seller can read sitewide (null sellerId) or own price lists.
   */
  static canReadPriceList(actor: ActorContext, resource: PriceListResource): boolean {
    const isAdmin = actor.roles.includes('ADMIN') || actor.roles.includes('SUPER_ADMIN');
    if (isAdmin) {
      return true;
    }

    const isSeller = actor.roles.includes('SELLER');
    if (isSeller && actor.sellerId) {
      return resource.sellerId === null || resource.sellerId === actor.sellerId;
    }

    return true; // Customers / guest can read public price lists
  }
}
