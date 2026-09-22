/**
 * Cart Repository
 * 
 * Manages shopping cart and cart item persistence with active status filtering,
 * soft deletion, and variant price/point snapshotting.
 * 
 * Reference: docs/architecture/carts-orders-fulfillment-groups-and-shipments.md
 * Invariant: ADR-0027
 */

import { BaseRepository } from '@/shared/database/base-repository';
import { generateId, ID_PREFIXES } from '@/shared/utils/id';
import { NotFoundError, ValidationError } from '@/shared/errors/app-error';

export interface AddCartItemInput {
  variantId: string;
  sellerId: string;
  quantity: number;
  pricePoisha: bigint;
  productPoint?: number;
}

export class CartRepository extends BaseRepository {
  /**
   * Finds an active cart for an authenticated user with active items.
   */
  async findActiveCartByUserId(userId: string) {
    return this.executeSafe(async () => {
      return (this.db as any).cart.findFirst({
        where: this.whereNotDeleted({
          userId,
          status: 'ACTIVE',
        }),
        include: {
          items: {
            where: { deletedAt: null },
            include: {
              variant: {
                include: {
                  product: true,
                },
              },
              seller: {
                select: {
                  id: true,
                  businessName: true,
                  slug: true,
                  status: true,
                },
              },
            },
          },
        },
      });
    }, 'CartRepository.findActiveCartByUserId');
  }

  /**
   * Finds a cart by ID.
   */
  async findById(cartId: string) {
    return this.executeSafe(async () => {
      return (this.db as any).cart.findFirst({
        where: this.whereNotDeleted({ id: cartId }),
        include: {
          items: {
            where: { deletedAt: null },
            include: {
              variant: true,
              seller: true,
            },
          },
        },
      });
    }, 'CartRepository.findById');
  }

  /**
   * Gets an existing active cart or creates a new one.
   */
  async getOrCreateCart(userId?: string) {
    return this.executeSafe(async () => {
      if (userId) {
        const existing = await (this.db as any).cart.findFirst({
          where: this.whereNotDeleted({
            userId,
            status: 'ACTIVE',
          }),
          include: {
            items: {
              where: { deletedAt: null },
            },
          },
        });
        if (existing) {
          return existing;
        }
      }

      return (this.db as any).cart.create({
        data: {
          id: generateId(ID_PREFIXES.CART),
          userId: userId ?? null,
          currency: 'BDT',
          status: 'ACTIVE',
        },
        include: {
          items: true,
        },
      });
    }, 'CartRepository.getOrCreateCart');
  }

  /**
   * Adds or increments an item in a cart.
   */
  async addItem(cartId: string, input: AddCartItemInput) {
    if (input.quantity <= 0) {
      throw new ValidationError('Item quantity must be greater than zero');
    }

    return this.executeSafe(async () => {
      const existingItem = await (this.db as any).cartItem.findFirst({
        where: this.whereNotDeleted({
          cartId,
          variantId: input.variantId,
        }),
      });

      if (existingItem) {
        const newQty = existingItem.quantity + input.quantity;
        return (this.db as any).cartItem.update({
          where: { id: existingItem.id },
          data: {
            quantity: newQty,
            pricePoisha: input.pricePoisha,
            productPoint: input.productPoint ?? existingItem.productPoint,
            version: { increment: 1 },
          },
        });
      }

      return (this.db as any).cartItem.create({
        data: {
          id: generateId(ID_PREFIXES.CART_ITEM),
          cartId,
          variantId: input.variantId,
          sellerId: input.sellerId,
          quantity: input.quantity,
          pricePoisha: input.pricePoisha,
          productPoint: input.productPoint ?? 0,
        },
      });
    }, 'CartRepository.addItem');
  }

  /**
   * Updates an item's quantity. Soft-deletes if quantity is zero or less.
   */
  async updateItemQuantity(itemId: string, quantity: number, actorId?: string) {
    return this.executeSafe(async () => {
      if (quantity <= 0) {
        return (this.db as any).cartItem.update({
          where: { id: itemId },
          data: {
            ...this.createSoftDeletePatch(actorId),
            version: { increment: 1 },
          },
        });
      }

      return (this.db as any).cartItem.update({
        where: { id: itemId },
        data: {
          quantity,
          version: { increment: 1 },
        },
      });
    }, 'CartRepository.updateItemQuantity');
  }

  /**
   * Soft-deletes a single item from the cart.
   */
  async removeItem(itemId: string, actorId?: string) {
    return this.executeSafe(async () => {
      return (this.db as any).cartItem.update({
        where: { id: itemId },
        data: {
          ...this.createSoftDeletePatch(actorId),
          version: { increment: 1 },
        },
      });
    }, 'CartRepository.removeItem');
  }

  /**
   * Soft-deletes all items in a cart.
   */
  async clearCart(cartId: string, actorId?: string) {
    return this.executeSafe(async () => {
      return (this.db as any).cartItem.updateMany({
        where: this.whereNotDeleted({ cartId }),
        data: this.createSoftDeletePatch(actorId),
      });
    }, 'CartRepository.clearCart');
  }

  /**
   * Marks cart as converted into an order.
   */
  async markConverted(cartId: string) {
    return this.executeSafe(async () => {
      return (this.db as any).cart.update({
        where: { id: cartId },
        data: {
          status: 'CONVERTED',
          version: { increment: 1 },
        },
      });
    }, 'CartRepository.markConverted');
  }
}
