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
import { NotFoundError, ValidationError, AuthorizationError, ConflictError } from '@/shared/errors/app-error';
import { ActorContext } from '@/shared/authz/authz.types';

export interface AddCartItemInput {
  variantId: string;
  sellerId: string;
  quantity: number;
  pricePoisha: bigint;
  productPoint?: number;
}

export class CartRepository extends BaseRepository {
  async addPublishedVariant(userId: string, variantId: string, quantity: number) {
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 2147483647) {
      throw new ValidationError('Cart item quantity must be a positive integer');
    }

    const variant = await (this.db as any).productVariant.findFirst({
      where: {
        id: variantId,
        deletedAt: null,
        isActive: true,
        product: { deletedAt: null, status: 'PUBLISHED', currency: 'BDT', seller: { deletedAt: null, status: 'VERIFIED' } },
      },
      select: {
        pricePoisha: true,
        productPoint: true,
        product: { select: { sellerId: true, productPoint: true } },
      },
    });
    if (!variant) {
      throw new NotFoundError('Sellable product variant not found');
    }
    if (variant.pricePoisha <= 0n) {
      throw new ConflictError('Product variant does not have a valid BDT price');
    }

    const cart = await this.getOrCreateCart(userId);
    if (cart.currency !== 'BDT' || cart.status !== 'ACTIVE') {
      throw new ConflictError('Cart is not available for BDT purchases');
    }
    const item = await this.addItem(cart.id, {
      variantId,
      sellerId: variant.product.sellerId,
      quantity,
      pricePoisha: variant.pricePoisha,
      productPoint: variant.productPoint ?? variant.product.productPoint,
    });
    return { cartId: cart.id, item };
  }

  private async claimEditableCart(tx: any, cartId: string, ownerId?: string) {
    const result = await tx.cart.updateMany({
      where: { id: cartId, status: 'ACTIVE', deletedAt: null, ...(ownerId ? { userId: ownerId } : {}) },
      data: { version: { increment: 1 } },
    });
    if (result.count !== 1) {
      throw new ConflictError('Cart is no longer editable');
    }
  }

  private async claimEditableItem(tx: any, itemId: string, ownerId?: string) {
    const item = await tx.cartItem.findFirst({
      where: { id: itemId, deletedAt: null, ...(ownerId ? { cart: { userId: ownerId, deletedAt: null, status: 'ACTIVE' } } : {}) },
      select: { cartId: true },
    });
    if (!item) {
      throw new NotFoundError('Cart item not found');
    }
    await this.claimEditableCart(tx, item.cartId, ownerId);
  }

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
   * Finds a cart by ID with optional actor ownership verification.
   */
  async findById(cartId: string, actor?: ActorContext) {
    return this.executeSafe(async () => {
      const cart = await (this.db as any).cart.findFirst({
        where: this.whereNotDeleted({ id: cartId }),
        include: {
          items: {
            where: { deletedAt: null },
            include: {
              variant: { include: { product: true } },
              seller: true,
            },
          },
        },
      });

      if (cart && actor) {
        this.assertCartOwnership(cart, actor);
      }

      return cart;
    }, 'CartRepository.findById');
  }

  /**
   * Asserts that a cart belongs to the specified actor, or actor is Super Admin / Admin.
   * Throws AuthorizationError with code OWNERSHIP_VIOLATION if violated.
   */
  assertCartOwnership(cart: any, actor: ActorContext): void {
    if (!cart) return;
    if (cart.userId) {
      this.assertEntityOwnership(cart, actor, {
        ownerField: 'userId',
        allowAdmin: true,
        message: `Ownership violation: Cart '${cart.id}' belongs to another customer`,
      });
    }
  }

  /**
   * Retrieves a cart by ID, strictly enforcing object-level ownership.
   */
  async findOwnedById(cartId: string, actor: ActorContext) {
    const cart = await this.findById(cartId);
    if (!cart) {
      throw new NotFoundError(`Cart '${cartId}' not found`);
    }
    this.assertCartOwnership(cart, actor);
    return cart;
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
    if (!Number.isSafeInteger(input.quantity) || input.quantity <= 0 || input.quantity > 2147483647) {
      throw new ValidationError('Item quantity must be greater than zero');
    }

    return this.executeSafe(async () => {
      return this.withTransaction(async (tx) => {
        await this.claimEditableCart(tx, cartId);
        const existingItem = await (tx as any).cartItem.findFirst({
          where: this.whereNotDeleted({
            cartId,
            variantId: input.variantId,
          }),
        });

        if (existingItem) {
          const newQty = existingItem.quantity + input.quantity;
          if (!Number.isSafeInteger(newQty) || newQty > 2147483647) {
            throw new ValidationError('Cart item quantity exceeds the supported range');
          }
          return (tx as any).cartItem.update({
            where: { id: existingItem.id },
            data: {
              quantity: newQty,
              pricePoisha: input.pricePoisha,
              productPoint: input.productPoint ?? existingItem.productPoint,
              version: { increment: 1 },
            },
          });
        }

        return (tx as any).cartItem.create({
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
      });
    }, 'CartRepository.addItem');
  }

  /**
   * Updates an item's quantity. Soft-deletes if quantity is zero or less.
   */
  async updateItemQuantity(itemId: string, quantity: number, actorId?: string, ownerId?: string) {
    if (!Number.isSafeInteger(quantity) || quantity > 2147483647) {
      throw new ValidationError('Cart item quantity exceeds the supported range');
    }
    return this.executeSafe(async () => {
      return this.withTransaction(async (tx) => {
        await this.claimEditableItem(tx, itemId, ownerId);
        if (quantity <= 0) {
          return (tx as any).cartItem.update({
            where: { id: itemId, deletedAt: null },
            data: {
              ...this.createSoftDeletePatch(actorId),
              version: { increment: 1 },
            },
          });
        }

        return (tx as any).cartItem.update({
          where: { id: itemId, deletedAt: null },
          data: {
            quantity,
            version: { increment: 1 },
          },
        });
      });
    }, 'CartRepository.updateItemQuantity');
  }

  /**
   * Soft-deletes a single item from the cart.
   */
  async removeItem(itemId: string, actorId?: string, ownerId?: string) {
    return this.executeSafe(async () => {
      return this.withTransaction(async (tx) => {
        await this.claimEditableItem(tx, itemId, ownerId);
        return (tx as any).cartItem.update({
          where: { id: itemId, deletedAt: null },
          data: {
            ...this.createSoftDeletePatch(actorId),
            version: { increment: 1 },
          },
        });
      });
    }, 'CartRepository.removeItem');
  }

  /**
   * Soft-deletes all items in a cart.
   */
  async clearCart(cartId: string, actorId?: string) {
    return this.executeSafe(async () => {
      return this.withTransaction(async (tx) => {
        await this.claimEditableCart(tx, cartId);
        return (tx as any).cartItem.updateMany({
          where: this.whereNotDeleted({ cartId }),
          data: this.createSoftDeletePatch(actorId),
        });
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
