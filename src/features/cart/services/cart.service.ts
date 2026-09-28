/**
 * Customer Shopping Cart & Safe Merge Domain Service
 *
 * Implements guest and authenticated shopping carts, variant price and Product Point
 * snapshotting, inventory validation, and safe guest-to-authenticated cart merging.
 *
 * Invariant: Product price (poisha) and Product Points are independent values.
 * Invariant: Safe merge deduplicates items, sums quantities up to available stock,
 *            and re-snapshots live catalog prices and Product Points.
 * Invariant: Tenant isolation and zero data leakage across customers.
 */

import { prisma } from '@/shared/database/prisma';
import { generatePrefixedId, ENTITY_PREFIXES } from '@/shared/utils/id';
import {
  NotFoundError,
  ValidationError,
  AuthorizationError,
  ConflictError,
} from '@/shared/errors/app-error';
import {
  CartDTO,
  CartItemDTO,
  CartRevalidationResultDTO,
  MergeCartResultDTO,
} from '../types/cart.types';
import { AddCartItemInput } from '../validators/cart.validators';

export class CartService {
  private db = prisma;

  /**
   * Resolves or creates an active cart for an authenticated user or guest token.
   */
  public async getOrCreateActiveCart(
    userId?: string,
    guestCartToken?: string
  ): Promise<{ cart: any; guestCartToken?: string; isNew: boolean }> {
    if (userId) {
      // Authenticated User Cart
      let cart = await (this.db as any).cart.findFirst({
        where: { userId, status: 'ACTIVE', deletedAt: null },
        include: {
          items: {
            where: { deletedAt: null },
            include: {
              variant: {
                include: {
                  product: {
                    select: {
                      id: true,
                      title: true,
                      slug: true,
                      sellerId: true,
                      status: true,
                      deletedAt: true,
                    },
                  },
                },
              },
              seller: {
                select: {
                  id: true,
                  businessName: true,
                  slug: true,
                },
              },
            },
          },
        },
      });

      if (!cart) {
        const cartId = `crt_${Math.random().toString(36).substring(2, 10)}`;
        cart = await (this.db as any).cart.create({
          data: {
            id: cartId,
            userId,
            currency: 'BDT',
            status: 'ACTIVE',
            version: 1,
          },
          include: {
            items: true,
          },
        });
        return { cart, isNew: true };
      }

      return { cart, isNew: false };
    }

    // Guest Cart
    if (guestCartToken) {
      const existing = await (this.db as any).cart.findFirst({
        where: {
          id: guestCartToken,
          userId: null,
          status: 'ACTIVE',
          deletedAt: null,
        },
        include: {
          items: {
            where: { deletedAt: null },
            include: {
              variant: {
                include: {
                  product: {
                    select: {
                      id: true,
                      title: true,
                      slug: true,
                      sellerId: true,
                      status: true,
                      deletedAt: true,
                    },
                  },
                },
              },
              seller: {
                select: {
                  id: true,
                  businessName: true,
                  slug: true,
                },
              },
            },
          },
        },
      });

      if (existing) {
        return { cart: existing, guestCartToken, isNew: false };
      }
    }

    // Create a new guest cart
    const newGuestCartToken = `crt_gst_${Math.random().toString(36).substring(2, 12)}`;
    const newGuestCart = await (this.db as any).cart.create({
      data: {
        id: newGuestCartToken,
        userId: null,
        currency: 'BDT',
        status: 'ACTIVE',
        version: 1,
      },
      include: {
        items: true,
      },
    });

    return { cart: newGuestCart, guestCartToken: newGuestCartToken, isNew: true };
  }

  /**
   * Retrieves full active cart for a user or guest.
   */
  public async getCart(userId?: string, guestCartToken?: string): Promise<CartDTO> {
    const { cart, guestCartToken: token } = await this.getOrCreateActiveCart(
      userId,
      guestCartToken
    );
    return this.mapCartToDTO(cart, token);
  }

  /**
   * Adds a product variant to the cart. Live snapshots price and points.
   */
  public async addItem(
    input: AddCartItemInput,
    userId?: string,
    guestCartToken?: string
  ): Promise<{ cart: CartDTO; guestCartToken?: string }> {
    if (!Number.isSafeInteger(input.quantity) || input.quantity < 1 || input.quantity > 2147483647) {
      throw new ValidationError('Quantity must be a positive integer.');
    }

    // Fetch sellable variant with live product, seller, and stock
    const variant = await (this.db as any).productVariant.findFirst({
      where: {
        id: input.variantId,
        isActive: true,
        deletedAt: null,
        product: {
          status: 'PUBLISHED',
          currency: 'BDT',
          deletedAt: null,
          seller: { status: 'VERIFIED', deletedAt: null },
        },
      },
      include: {
        product: { select: { id: true, title: true, slug: true, sellerId: true, productPoint: true } },
        stockBalances: { where: { deletedAt: null } },
      },
    });

    if (!variant) {
      throw new NotFoundError(
        'Product variant is unavailable or no longer published in the storefront.'
      );
    }

    // Compute available stock across active warehouses
    const totalAvailableStock = (variant.stockBalances || []).reduce(
      (sum: number, sb: any) =>
        sum + Math.max(0, (sb.onHand || 0) - (sb.reserved || 0) - (sb.damaged || 0) - (sb.quarantined || 0)),
      0
    );

    const { cart, guestCartToken: activeToken } = await this.getOrCreateActiveCart(
      userId,
      guestCartToken || input.guestCartToken || undefined
    );

    const existingItem = await (this.db as any).cartItem.findFirst({
      where: {
        cartId: cart.id,
        variantId: input.variantId,
        deletedAt: null,
      },
    });

    const livePricePoisha = variant.pricePoisha;
    const liveProductPoint = variant.productPoint ?? variant.product.productPoint ?? 0;

    if (existingItem) {
      const newQuantity = existingItem.quantity + input.quantity;
      if (variant.stockBalances?.length > 0 && newQuantity > totalAvailableStock) {
        throw new ValidationError(
          `Cannot add ${input.quantity} more. Total requested (${newQuantity}) exceeds available stock (${totalAvailableStock}).`
        );
      }

      await (this.db as any).cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: newQuantity,
          pricePoisha: livePricePoisha, // Re-snapshot live price
          productPoint: liveProductPoint, // Re-snapshot live point
          version: { increment: 1 },
        },
      });
    } else {
      if (variant.stockBalances?.length > 0 && input.quantity > totalAvailableStock) {
        throw new ValidationError(
          `Requested quantity (${input.quantity}) exceeds available stock (${totalAvailableStock}).`
        );
      }

      const itemId = `cit_${Math.random().toString(36).substring(2, 10)}`;
      await (this.db as any).cartItem.create({
        data: {
          id: itemId,
          cartId: cart.id,
          variantId: input.variantId,
          sellerId: variant.product.sellerId,
          quantity: input.quantity,
          pricePoisha: livePricePoisha,
          productPoint: liveProductPoint,
          version: 1,
        },
      });
    }

    // Refresh cart
    const updatedCart = await this.getCart(userId, activeToken);
    return { cart: updatedCart, guestCartToken: activeToken };
  }

  /**
   * Updates quantity of an item in the cart.
   */
  public async updateItemQuantity(
    itemId: string,
    quantity: number,
    userId?: string,
    guestCartToken?: string
  ): Promise<CartDTO> {
    const item = await (this.db as any).cartItem.findFirst({
      where: { id: itemId, deletedAt: null },
      include: {
        cart: true,
        variant: {
          include: {
            stockBalances: { where: { deletedAt: null } },
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundError(`Cart item '${itemId}' not found.`);
    }

    // Assert ownership
    this.assertCartOwnership(item.cart, userId, guestCartToken);

    if (quantity <= 0) {
      await (this.db as any).cartItem.update({
        where: { id: itemId },
        data: { deletedAt: new Date(), version: { increment: 1 } },
      });
    } else {
      const totalAvailableStock = (item.variant?.stockBalances || []).reduce(
        (sum: number, sb: any) =>
          sum + Math.max(0, (sb.onHand || 0) - (sb.reserved || 0) - (sb.damaged || 0) - (sb.quarantined || 0)),
        0
      );

      if (item.variant?.stockBalances?.length > 0 && quantity > totalAvailableStock) {
        throw new ValidationError(
          `Requested quantity (${quantity}) exceeds available stock (${totalAvailableStock}).`
        );
      }

      await (this.db as any).cartItem.update({
        where: { id: itemId },
        data: {
          quantity,
          version: { increment: 1 },
        },
      });
    }

    return this.getCart(userId, guestCartToken);
  }

  /**
   * Removes an item from the cart.
   */
  public async removeItem(
    itemId: string,
    userId?: string,
    guestCartToken?: string
  ): Promise<CartDTO> {
    const item = await (this.db as any).cartItem.findFirst({
      where: { id: itemId, deletedAt: null },
      include: { cart: true },
    });

    if (!item) {
      throw new NotFoundError(`Cart item '${itemId}' not found.`);
    }

    this.assertCartOwnership(item.cart, userId, guestCartToken);

    await (this.db as any).cartItem.update({
      where: { id: itemId },
      data: { deletedAt: new Date(), version: { increment: 1 } },
    });

    return this.getCart(userId, guestCartToken);
  }

  /**
   * Clears all items from the active cart.
   */
  public async clearCart(userId?: string, guestCartToken?: string): Promise<CartDTO> {
    const { cart, guestCartToken: token } = await this.getOrCreateActiveCart(
      userId,
      guestCartToken
    );

    await (this.db as any).cartItem.updateMany({
      where: { cartId: cart.id, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    return this.getCart(userId, token);
  }

  /**
   * Safely merges a guest cart into an authenticated customer cart.
   * Rules:
   * - Deduplicates items (sums quantity, capping at stock).
   * - Re-snapshots live price and points.
   * - Sets guest cart status to MERGED.
   * - Emits outbox event.
   */
  public async mergeGuestCart(
    userId: string,
    guestCartToken: string
  ): Promise<MergeCartResultDTO> {
    const warnings: string[] = [];

    // 1. Find guest cart
    const guestCart = await (this.db as any).cart.findFirst({
      where: {
        id: guestCartToken,
        userId: null,
        status: 'ACTIVE',
        deletedAt: null,
      },
      include: {
        items: {
          where: { deletedAt: null },
          include: {
            variant: {
              include: {
                product: {
                  select: {
                    id: true,
                    title: true,
                    sellerId: true,
                    status: true,
                    deletedAt: true,
                    productPoint: true,
                  },
                },
                stockBalances: { where: { deletedAt: null } },
              },
            },
          },
        },
      },
    });

    if (!guestCart || guestCart.items.length === 0) {
      const userCart = await this.getCart(userId);
      return {
        userCart,
        guestCartId: guestCartToken,
        mergedItemsCount: 0,
        warnings: ['Guest cart was empty or already merged.'],
      };
    }

    // 2. Find or create user active cart
    const { cart: userCart } = await this.getOrCreateActiveCart(userId);

    let mergedCount = 0;

    // 3. Merge each guest item into user cart
    for (const guestItem of guestCart.items) {
      const variant = guestItem.variant;
      if (!variant || variant.deletedAt || variant.product?.deletedAt || variant.product?.status !== 'PUBLISHED') {
        warnings.push(`Item '${guestItem.variant?.title || 'Unknown'}' is no longer available and was skipped.`);
        continue;
      }

      const availableStock = (variant.stockBalances || []).reduce(
        (sum: number, sb: any) =>
          sum + Math.max(0, (sb.onHand || 0) - (sb.reserved || 0) - (sb.damaged || 0) - (sb.quarantined || 0)),
        0
      );

      const livePricePoisha = variant.pricePoisha;
      const liveProductPoint = variant.productPoint ?? variant.product.productPoint ?? 0;

      // Check if user cart already has this variant
      const existingUserItem = await (this.db as any).cartItem.findFirst({
        where: {
          cartId: userCart.id,
          variantId: guestItem.variantId,
          deletedAt: null,
        },
      });

      if (existingUserItem) {
        let mergedQty = existingUserItem.quantity + guestItem.quantity;
        if (variant.stockBalances?.length > 0 && mergedQty > availableStock) {
          mergedQty = Math.max(1, availableStock);
          warnings.push(
            `Quantity for '${variant.product.title} - ${variant.title}' was adjusted to available stock (${mergedQty}).`
          );
        }

        await (this.db as any).cartItem.update({
          where: { id: existingUserItem.id },
          data: {
            quantity: mergedQty,
            pricePoisha: livePricePoisha, // Re-snapshot
            productPoint: liveProductPoint, // Re-snapshot
            version: { increment: 1 },
          },
        });
        mergedCount++;
      } else {
        let requestedQty = guestItem.quantity;
        if (variant.stockBalances?.length > 0 && requestedQty > availableStock) {
          requestedQty = Math.max(1, availableStock);
          warnings.push(
            `Quantity for '${variant.product.title} - ${variant.title}' was adjusted to available stock (${requestedQty}).`
          );
        }

        const newItemId = `cit_${Math.random().toString(36).substring(2, 10)}`;
        await (this.db as any).cartItem.create({
          data: {
            id: newItemId,
            cartId: userCart.id,
            variantId: guestItem.variantId,
            sellerId: variant.product.sellerId,
            quantity: requestedQty,
            pricePoisha: livePricePoisha,
            productPoint: liveProductPoint,
            version: 1,
          },
        });
        mergedCount++;
      }
    }

    // 4. Mark guest cart as MERGED
    await (this.db as any).cart.update({
      where: { id: guestCart.id },
      data: {
        status: 'MERGED',
        notes: `Merged into user cart: ${userCart.id}`,
        version: { increment: 1 },
      },
    });

    await this.recordOutboxEvent('cart.guest_merged', userCart.id, {
      userId,
      userCartId: userCart.id,
      guestCartId: guestCart.id,
      mergedItemsCount: mergedCount,
    });

    const updatedUserCart = await this.getCart(userId);
    return {
      userCart: updatedUserCart,
      guestCartId: guestCart.id,
      mergedItemsCount: mergedCount,
      warnings,
    };
  }

  /**
   * Revalidates cart items against current catalog pricing and available stock.
   */
  public async revalidateCart(
    userId?: string,
    guestCartToken?: string
  ): Promise<CartRevalidationResultDTO> {
    const { cart } = await this.getOrCreateActiveCart(userId, guestCartToken);
    const warnings: string[] = [];
    let priceChangesCount = 0;
    let outOfStockCount = 0;

    for (const item of cart.items || []) {
      const variant = await (this.db as any).productVariant.findFirst({
        where: { id: item.variantId, deletedAt: null },
        include: {
          product: { select: { title: true, status: true, deletedAt: true, productPoint: true } },
          stockBalances: { where: { deletedAt: null } },
        },
      });

      if (!variant || variant.deletedAt || variant.product?.status !== 'PUBLISHED') {
        warnings.push(`Item '${item.variant?.product?.title || 'Product'}' is no longer available.`);
        outOfStockCount++;
        continue;
      }

      const availableStock = (variant.stockBalances || []).reduce(
        (sum: number, sb: any) =>
          sum + Math.max(0, (sb.onHand || 0) - (sb.reserved || 0) - (sb.damaged || 0) - (sb.quarantined || 0)),
        0
      );

      // Check stock
      if (variant.stockBalances?.length > 0 && availableStock < item.quantity) {
        outOfStockCount++;
        if (availableStock === 0) {
          warnings.push(`'${variant.product.title}' is currently out of stock.`);
        } else {
          warnings.push(
            `Only ${availableStock} units of '${variant.product.title}' remain available. Cart quantity adjusted.`
          );
          await (this.db as any).cartItem.update({
            where: { id: item.id },
            data: { quantity: availableStock, version: { increment: 1 } },
          });
        }
      }

      // Check price change
      if (BigInt(variant.pricePoisha) !== BigInt(item.pricePoisha)) {
        priceChangesCount++;
        const oldPriceBdt = this.formatBdt(item.pricePoisha);
        const newPriceBdt = this.formatBdt(variant.pricePoisha);
        warnings.push(
          `Price for '${variant.product.title}' updated from ${oldPriceBdt} to ${newPriceBdt}.`
        );

        await (this.db as any).cartItem.update({
          where: { id: item.id },
          data: {
            pricePoisha: variant.pricePoisha,
            productPoint: variant.productPoint ?? variant.product.productPoint ?? 0,
            version: { increment: 1 },
          },
        });
      }
    }

    const updatedCart = await this.getCart(userId, guestCartToken);
    return {
      cart: updatedCart,
      hasChanges: priceChangesCount > 0 || outOfStockCount > 0,
      priceChangesCount,
      outOfStockCount,
      warnings,
    };
  }

  // ----------------------------------------------------------------------------
  // Helper & Mapping Methods
  // ----------------------------------------------------------------------------

  private assertCartOwnership(cart: any, userId?: string, guestCartToken?: string): void {
    if (cart.userId) {
      if (cart.userId !== userId) {
        throw new AuthorizationError('You do not have permission to modify this cart.');
      }
    } else {
      if (cart.id !== guestCartToken) {
        throw new AuthorizationError('Invalid guest cart token.');
      }
    }
  }

  private mapCartToDTO(cart: any, guestCartToken?: string): CartDTO {
    const isGuest = !cart.userId;
    const items: CartItemDTO[] = (cart.items || []).map((item: any) => {
      const pricePoisha = Number(item.pricePoisha);
      const subtotalPoisha = pricePoisha * item.quantity;
      const productPoint = item.productPoint || 0;
      const totalProductPoints = productPoint * item.quantity;

      return {
        id: item.id,
        cartId: item.cartId,
        variantId: item.variantId,
        sellerId: item.sellerId,
        sellerName: item.seller?.businessName || 'Verified Merchant',
        sellerSlug: item.seller?.slug,
        productTitle: item.variant?.product?.title || 'Product Item',
        productSlug: item.variant?.product?.slug,
        variantTitle: item.variant?.title || 'Standard Variant',
        sku: item.variant?.sku || '',
        imageUrl: item.variant?.imageUrl || null,
        quantity: item.quantity,
        pricePoisha,
        priceBdtFormatted: this.formatBdt(pricePoisha),
        productPoint,
        subtotalPoisha,
        subtotalBdtFormatted: this.formatBdt(subtotalPoisha),
        totalProductPoints,
        inStock: true,
      };
    });

    const subtotalPoisha = items.reduce((sum, item) => sum + item.subtotalPoisha, 0);
    const totalProductPoints = items.reduce((sum, item) => sum + item.totalProductPoints, 0);

    return {
      id: cart.id,
      userId: cart.userId,
      isGuest,
      guestCartToken: isGuest ? cart.id : guestCartToken || null,
      currency: 'BDT',
      status: cart.status,
      couponCode: cart.couponCode,
      notes: cart.notes,
      isB2B: cart.isB2B || false,
      b2bQuoteId: cart.b2bQuoteId,
      purchaseOrderRef: cart.purchaseOrderRef,
      items,
      itemsCount: items.reduce((sum, i) => sum + i.quantity, 0),
      subtotalPoisha,
      subtotalBdtFormatted: this.formatBdt(subtotalPoisha),
      totalProductPoints,
      version: cart.version || 1,
      createdAt: cart.createdAt?.toISOString?.() || new Date().toISOString(),
      updatedAt: cart.updatedAt?.toISOString?.() || new Date().toISOString(),
    };
  }

  private formatBdt(poisha: bigint | number): string {
    const num = typeof poisha === 'bigint' ? Number(poisha) : poisha;
    const bdt = (num / 100).toLocaleString('en-BD', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `৳${bdt}`;
  }

  private async recordOutboxEvent(
    eventType: string,
    aggregateId: string,
    payload: any
  ): Promise<void> {
    try {
      await (this.db as any).outboxEvent.create({
        data: {
          id: generatePrefixedId(ENTITY_PREFIXES.OUTBOX),
          eventType,
          aggregateType: 'CART',
          aggregateId,
          payload: payload ?? {},
          status: 'PENDING',
          attempts: 0,
          version: 1,
        },
      });
    } catch (err) {
      console.warn('Non-fatal outbox record error:', err);
    }
  }
}

export const cartService = new CartService();
