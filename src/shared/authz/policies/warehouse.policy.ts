import { ActorContext } from '../authz.types';

export interface WarehouseResource {
  id?: string;
  sellerId?: string | null;
  isPlatformHub?: boolean;
}

export class WarehousePolicy {
  /**
   * Admin can create any warehouse (platform hub or seller warehouse).
   * Seller can create warehouse for their own sellerId (cannot create platform hubs).
   */
  static canCreateWarehouse(actor: ActorContext, resource: WarehouseResource): boolean {
    const isAdmin = actor.roles.includes('ADMIN') || actor.roles.includes('SUPER_ADMIN');
    if (isAdmin) {
      return true;
    }

    const isSeller = actor.roles.includes('SELLER');
    if (isSeller && actor.sellerId) {
      if (resource.isPlatformHub) {
        return false; // Sellers cannot create platform hubs
      }
      return resource.sellerId === actor.sellerId;
    }

    return false;
  }

  /**
   * Admin can update any warehouse.
   * Seller can update warehouses they own (cannot designate as platform hub).
   */
  static canUpdateWarehouse(actor: ActorContext, resource: WarehouseResource): boolean {
    const isAdmin = actor.roles.includes('ADMIN') || actor.roles.includes('SUPER_ADMIN');
    if (isAdmin) {
      return true;
    }

    const isSeller = actor.roles.includes('SELLER');
    if (isSeller && actor.sellerId) {
      if (resource.isPlatformHub) {
        return false;
      }
      return resource.sellerId === actor.sellerId;
    }

    return false;
  }

  /**
   * Admin can read all warehouses.
   * Seller can read own warehouses or platform fulfillment hubs.
   */
  static canReadWarehouse(actor: ActorContext, resource: WarehouseResource): boolean {
    const isAdmin = actor.roles.includes('ADMIN') || actor.roles.includes('SUPER_ADMIN');
    if (isAdmin) {
      return true;
    }

    const isSeller = actor.roles.includes('SELLER');
    if (isSeller && actor.sellerId) {
      if (resource.isPlatformHub) {
        return true;
      }
      return resource.sellerId === actor.sellerId;
    }

    return false;
  }

  /**
   * Admin can delete any warehouse.
   * Seller can soft-delete warehouses they own.
   */
  static canDeleteWarehouse(actor: ActorContext, resource: WarehouseResource): boolean {
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
}
