import { ActorContext } from '../authz.types';

export interface PromotionResource {
  id?: string;
  sellerId?: string | null;
  fundingType?: string;
  createdBy?: string | null;
}

export interface PromotionAttributionResource {
  id?: string;
  sellerId?: string | null;
  orderId?: string;
}

export class PromotionPolicy {
  /**
   * Only Admin or Super Admin can create sitewide or co-funded promotions, or configure funding splits.
   * Sellers can only request/create seller-funded promotions scoped to their own sellerId.
   */
  static canCreatePromotion(actor: ActorContext, promotion: PromotionResource): boolean {
    const isAdmin = actor.roles.includes('ADMIN') || actor.roles.includes('SUPER_ADMIN');
    if (isAdmin) {
      return true;
    }

    const isSeller = actor.roles.includes('SELLER');
    if (isSeller && actor.sellerId) {
      // Seller can only create seller-funded promotions for their own store
      const isOwnedSeller = promotion.sellerId === actor.sellerId;
      const isSellerFunded = promotion.fundingType === 'SELLER_FUNDED';
      return isOwnedSeller && isSellerFunded;
    }

    return false;
  }

  /**
   * Only Admin or Super Admin can update promotion funding splits or status.
   * Sellers can update details of their own seller-funded promotions.
   */
  static canUpdatePromotion(actor: ActorContext, promotion: PromotionResource): boolean {
    const isAdmin = actor.roles.includes('ADMIN') || actor.roles.includes('SUPER_ADMIN');
    if (isAdmin) {
      return true;
    }

    const isSeller = actor.roles.includes('SELLER');
    if (isSeller && actor.sellerId && promotion.sellerId === actor.sellerId) {
      // Seller cannot alter fundingType if it was set by admin to co-funded/platform-funded
      return promotion.fundingType === 'SELLER_FUNDED';
    }

    return false;
  }

  /**
   * Admin/SuperAdmin can read all promotion attributions.
   * Seller can read attributions ONLY for their own sellerId.
   */
  static canReadAttribution(actor: ActorContext, attribution: PromotionAttributionResource): boolean {
    const isAdmin = actor.roles.includes('ADMIN') || actor.roles.includes('SUPER_ADMIN');
    if (isAdmin) {
      return true;
    }

    const isSeller = actor.roles.includes('SELLER');
    if (isSeller && actor.sellerId) {
      return attribution.sellerId === actor.sellerId;
    }

    return false;
  }

  /**
   * Check if user is allowed to access attribution reporting for a given sellerId.
   */
  static canAccessSellerAttributionReport(actor: ActorContext, targetSellerId: string): boolean {
    const isAdmin = actor.roles.includes('ADMIN') || actor.roles.includes('SUPER_ADMIN');
    if (isAdmin) {
      return true;
    }

    const isSeller = actor.roles.includes('SELLER');
    if (isSeller && actor.sellerId) {
      return actor.sellerId === targetSellerId;
    }

    return false;
  }
}
