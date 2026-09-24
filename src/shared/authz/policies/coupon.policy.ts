import { ActorContext } from '../authz.types';

export interface CouponRedemptionResource {
  id?: string;
  customerId?: string;
  sellerId?: string | null;
}

export class CouponPolicy {
  /**
   * Customers can apply coupons for themselves.
   */
  static canApplyCoupon(actor: ActorContext, customerId: string): boolean {
    const isAdmin = actor.roles.includes('ADMIN') || actor.roles.includes('SUPER_ADMIN');
    if (isAdmin) return true;
    return actor.userId === customerId;
  }

  /**
   * Customers can view their own redemptions. Sellers can view their store's redemptions. Admins view all.
   */
  static canReadRedemption(actor: ActorContext, resource: CouponRedemptionResource): boolean {
    const isAdmin = actor.roles.includes('ADMIN') || actor.roles.includes('SUPER_ADMIN');
    if (isAdmin) return true;

    if (actor.userId === resource.customerId) return true;

    const isSeller = actor.roles.includes('SELLER');
    if (isSeller && actor.sellerId && resource.sellerId === actor.sellerId) {
      return true;
    }

    return false;
  }

  /**
   * Customer can release/cancel their own reserved coupon redemption.
   */
  static canReleaseRedemption(actor: ActorContext, resource: CouponRedemptionResource): boolean {
    const isAdmin = actor.roles.includes('ADMIN') || actor.roles.includes('SUPER_ADMIN');
    if (isAdmin) return true;
    return actor.userId === resource.customerId;
  }
}
