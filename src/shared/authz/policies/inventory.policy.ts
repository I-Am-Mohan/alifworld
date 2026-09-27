import { ActorContext } from '../authz.types';

export interface InventoryResource {
  sellerId?: string | null;
  warehouseSellerId?: string | null;
}

export class InventoryPolicy {
  /**
   * Admin can read all inventory stock balances and movement ledgers.
   * Seller can read stock balances for products they own or platform hubs.
   */
  static canReadInventory(actor: ActorContext, resource?: InventoryResource): boolean {
    const isAdmin = actor.roles.includes('ADMIN') || actor.roles.includes('SUPER_ADMIN');
    if (isAdmin) {
      return true;
    }

    const isSeller =
      actor.roles.includes('SELLER') ||
      actor.roles.includes('SELLER_OWNER') ||
      actor.roles.includes('SELLER_ADMIN') ||
      actor.roles.includes('SELLER_MANAGER') ||
      actor.roles.includes('SELLER_STAFF');

    if (isSeller && actor.sellerId) {
      if (!resource || !resource.sellerId) {
        return true;
      }
      return resource.sellerId === actor.sellerId;
    }

    return false;
  }

  /**
   * Admin can perform intake, adjustments, and quarantine operations across all inventory.
   * Seller can manage stock for products they own.
   */
  static canManageInventory(actor: ActorContext, resource?: InventoryResource): boolean {
    const isAdmin = actor.roles.includes('ADMIN') || actor.roles.includes('SUPER_ADMIN');
    if (isAdmin) {
      return true;
    }

    const isSeller =
      actor.roles.includes('SELLER') ||
      actor.roles.includes('SELLER_OWNER') ||
      actor.roles.includes('SELLER_ADMIN') ||
      actor.roles.includes('SELLER_MANAGER') ||
      actor.roles.includes('SELLER_STAFF');

    if (isSeller && actor.sellerId) {
      if (!resource || !resource.sellerId) {
        return true;
      }
      return resource.sellerId === actor.sellerId;
    }

    return false;
  }
}
