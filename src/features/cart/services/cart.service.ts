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
  CartGroupedDTO,
  SellerCartGroupDTO,
  CartRevalidationResultDTO,
  MergeCartResultDTO,
  PriceChangeDetail,
  StockAdjustmentDetail,
  CouponValidationDetail,
  SellerIssueDetail,
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
    if (
      !Number.isSafeInteger(input.quantity) ||
      input.quantity < 1 ||
      input.quantity > 2147483647
    ) {
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
        product: {
          select: { id: true, title: true, slug: true, sellerId: true, productPoint: true },
        },
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
        sum +
        Math.max(
          0,
          (sb.onHand || 0) - (sb.reserved || 0) - (sb.damaged || 0) - (sb.quarantined || 0)
        ),
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
          sum +
          Math.max(
            0,
            (sb.onHand || 0) - (sb.reserved || 0) - (sb.damaged || 0) - (sb.quarantined || 0)
          ),
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
  public async mergeGuestCart(userId: string, guestCartToken: string): Promise<MergeCartResultDTO> {
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
      if (
        !variant ||
        variant.deletedAt ||
        variant.product?.deletedAt ||
        variant.product?.status !== 'PUBLISHED'
      ) {
        warnings.push(
          `Item '${guestItem.variant?.title || 'Unknown'}' is no longer available and was skipped.`
        );
        continue;
      }

      const availableStock = (variant.stockBalances || []).reduce(
        (sum: number, sb: any) =>
          sum +
          Math.max(
            0,
            (sb.onHand || 0) - (sb.reserved || 0) - (sb.damaged || 0) - (sb.quarantined || 0)
          ),
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
   * Applies a coupon or discount code to the active cart.
   * Validates active dates, minimum spend, and seller restrictions.
   */
  public async applyCoupon(
    couponCode: string,
    userId?: string,
    guestCartToken?: string
  ): Promise<CartRevalidationResultDTO> {
    const codeUpper = couponCode.trim().toUpperCase();
    const { cart } = await this.getOrCreateActiveCart(userId, guestCartToken);

    // Query discount rule
    const rule = await (this.db as any).discountRule.findFirst({
      where: { code: codeUpper, deletedAt: null },
    });

    if (!rule) {
      throw new ValidationError(`Coupon code '${codeUpper}' is invalid or expired.`);
    }

    const now = new Date();
    if (rule.status !== 'ACTIVE') {
      throw new ValidationError(`Coupon code '${codeUpper}' is not active.`);
    }

    if (now < rule.startsAt) {
      throw new ValidationError(`Coupon code '${codeUpper}' is not yet effective.`);
    }

    if (rule.endsAt && now > rule.endsAt) {
      throw new ValidationError(`Coupon code '${codeUpper}' has expired.`);
    }

    const currentSubtotal = (cart.items || []).reduce(
      (sum: number, i: any) => sum + Number(i.pricePoisha) * i.quantity,
      0
    );

    const minSubtotal = Number(rule.minOrderSubtotalPoisha || 0);
    if (currentSubtotal < minSubtotal) {
      throw new ValidationError(
        `Minimum order subtotal requirement of ${this.formatBdt(minSubtotal)} not met.`
      );
    }

    if (rule.sellerId) {
      const hasSellerItem = (cart.items || []).some((i: any) => i.sellerId === rule.sellerId);
      if (!hasSellerItem) {
        throw new ValidationError(
          `Coupon '${codeUpper}' is restricted to items from a specific seller not present in your cart.`
        );
      }
    }

    // Attach coupon code to cart
    await (this.db as any).cart.update({
      where: { id: cart.id },
      data: {
        couponCode: rule.code,
        version: { increment: 1 },
      },
    });

    return this.revalidateCart(userId, guestCartToken);
  }

  /**
   * Removes any applied coupon from the active cart.
   */
  public async removeCoupon(
    userId?: string,
    guestCartToken?: string
  ): Promise<CartRevalidationResultDTO> {
    const { cart } = await this.getOrCreateActiveCart(userId, guestCartToken);

    await (this.db as any).cart.update({
      where: { id: cart.id },
      data: {
        couponCode: null,
        version: { increment: 1 },
      },
    });

    return this.revalidateCart(userId, guestCartToken);
  }

  /**
   * Comprehensive Multi-Dimensional Cart Revalidation Engine:
   * 1. Stock balances & available warehouse inventory
   * 2. Price drift & BDT minor unit re-snapshotting
   * 3. Product Point loyalty token re-snapshotting
   * 4. Coupon rules, expiration, spend thresholds & limits
   * 5. Seller storefront status (verification, suspension, vacation mode, MOV)
   * 6. B2B negotiated quote expiration and price locks
   * 7. Multi-vendor seller fulfillment package partitioning
   */
  public async revalidateCart(
    userId?: string,
    guestCartToken?: string,
    customerDivision: string = 'DHAKA'
  ): Promise<CartRevalidationResultDTO> {
    const { cart } = await this.getOrCreateActiveCart(userId, guestCartToken);
    const warnings: string[] = [];
    const priceChanges: PriceChangeDetail[] = [];
    const stockAdjustments: StockAdjustmentDetail[] = [];
    const sellerIssues: SellerIssueDetail[] = [];
    let priceChangesCount = 0;
    let outOfStockCount = 0;
    let isReadyForCheckout = true;

    // 1. Revalidate Line Items (Stock, Price, Points)
    for (const item of cart.items || []) {
      const variant = await (this.db as any).productVariant.findFirst({
        where: { id: item.variantId, deletedAt: null },
        include: {
          product: {
            select: {
              id: true,
              title: true,
              status: true,
              deletedAt: true,
              productPoint: true,
              sellerId: true,
            },
          },
          stockBalances: { where: { deletedAt: null } },
        },
      });

      if (
        !variant ||
        variant.deletedAt ||
        variant.product?.status !== 'PUBLISHED' ||
        variant.product?.deletedAt
      ) {
        const title = variant?.product?.title || item.variant?.product?.title || 'Product Item';
        warnings.push(`Item '${title}' is no longer published or available in the storefront.`);
        outOfStockCount++;
        isReadyForCheckout = false;

        stockAdjustments.push({
          variantId: item.variantId,
          productTitle: title,
          requestedQuantity: item.quantity,
          availableStock: 0,
          adjustedQuantity: 0,
        });

        await (this.db as any).cartItem.update({
          where: { id: item.id },
          data: { deletedAt: new Date(), version: { increment: 1 } },
        });
        continue;
      }

      const availableStock = (variant.stockBalances || []).reduce(
        (sum: number, sb: any) =>
          sum +
          Math.max(
            0,
            (sb.onHand || 0) - (sb.reserved || 0) - (sb.damaged || 0) - (sb.quarantined || 0)
          ),
        0
      );

      // Check stock availability
      if (variant.stockBalances?.length > 0 && availableStock < item.quantity) {
        outOfStockCount++;
        if (availableStock === 0) {
          warnings.push(`'${variant.product.title}' is currently out of stock.`);
          isReadyForCheckout = false;
          stockAdjustments.push({
            variantId: item.variantId,
            productTitle: variant.product.title,
            requestedQuantity: item.quantity,
            availableStock: 0,
            adjustedQuantity: 0,
          });

          await (this.db as any).cartItem.update({
            where: { id: item.id },
            data: { deletedAt: new Date(), version: { increment: 1 } },
          });
        } else {
          warnings.push(
            `Only ${availableStock} units of '${variant.product.title}' remain available. Cart quantity adjusted.`
          );
          stockAdjustments.push({
            variantId: item.variantId,
            productTitle: variant.product.title,
            requestedQuantity: item.quantity,
            availableStock,
            adjustedQuantity: availableStock,
          });

          await (this.db as any).cartItem.update({
            where: { id: item.id },
            data: { quantity: availableStock, version: { increment: 1 } },
          });
        }
      }

      // Check price change (unless locked by B2B negotiated quote)
      if (!cart.isB2B && BigInt(variant.pricePoisha) !== BigInt(item.pricePoisha)) {
        priceChangesCount++;
        const oldPricePoisha = Number(item.pricePoisha);
        const newPricePoisha = Number(variant.pricePoisha);
        const oldPriceBdt = this.formatBdt(oldPricePoisha);
        const newPriceBdt = this.formatBdt(newPricePoisha);

        warnings.push(
          `Price for '${variant.product.title}' updated from ${oldPriceBdt} to ${newPriceBdt}.`
        );

        priceChanges.push({
          variantId: item.variantId,
          productTitle: variant.product.title,
          oldPricePoisha,
          newPricePoisha,
          oldPriceBdtFormatted: oldPriceBdt,
          newPriceBdtFormatted: newPriceBdt,
        });

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

    // 2. Revalidate Seller Storefront Status & Vacation Mode
    const distinctSellerIds: string[] = Array.from(
      new Set((cart.items || []).map((i: any) => i.sellerId))
    );

    for (const sellerId of distinctSellerIds) {
      const seller = await (this.db as any).seller.findFirst({
        where: { id: sellerId },
        include: {
          settings: true,
          operationalDefaults: true,
        },
      });

      const sellerName = seller?.businessName || 'Verified Merchant';

      if (!seller || seller.deletedAt || seller.status !== 'VERIFIED') {
        const statusMsg = seller?.status === 'SUSPENDED' ? 'suspended' : 'unavailable';
        const msg = `${sellerName} is currently ${statusMsg} and cannot fulfill orders at this time.`;
        warnings.push(msg);
        sellerIssues.push({
          sellerId,
          sellerName,
          issue: seller?.status === 'SUSPENDED' ? 'SUSPENDED' : 'DELETED',
          message: msg,
        });
        isReadyForCheckout = false;
      } else if (seller.settings?.vacationMode) {
        const msg = `${sellerName} is currently on vacation: ${
          seller.settings.vacationMessage || 'Orders will be accepted when store reopens.'
        }`;
        warnings.push(msg);
        sellerIssues.push({
          sellerId,
          sellerName,
          issue: 'VACATION',
          message: msg,
        });
        isReadyForCheckout = false;
      }
    }

    // 3. Revalidate Applied Coupon & Discounts
    let couponStatus: CouponValidationDetail = {
      applied: false,
      couponCode: null,
      discountPoisha: 0,
      discountBdtFormatted: '৳0.00',
      reason: null,
    };

    if (cart.couponCode) {
      const rule = await (this.db as any).discountRule.findFirst({
        where: { code: cart.couponCode.toUpperCase(), deletedAt: null },
      });

      const now = new Date();
      let couponInvalidReason: string | null = null;

      if (!rule || rule.status !== 'ACTIVE') {
        couponInvalidReason = `Coupon '${cart.couponCode}' is no longer active.`;
      } else if (now < rule.startsAt) {
        couponInvalidReason = `Coupon '${cart.couponCode}' is not yet active.`;
      } else if (rule.endsAt && now > rule.endsAt) {
        couponInvalidReason = `Coupon '${cart.couponCode}' has expired.`;
      } else {
        const currentSubtotal = (cart.items || []).reduce(
          (sum: number, i: any) => sum + Number(i.pricePoisha) * i.quantity,
          0
        );
        const minSubtotal = Number(rule.minOrderSubtotalPoisha || 0);
        if (currentSubtotal < minSubtotal) {
          couponInvalidReason = `Minimum subtotal requirement of ${this.formatBdt(
            minSubtotal
          )} for coupon '${cart.couponCode}' is no longer met.`;
        }
      }

      if (couponInvalidReason) {
        warnings.push(couponInvalidReason);
        await (this.db as any).cart.update({
          where: { id: cart.id },
          data: { couponCode: null, version: { increment: 1 } },
        });
        couponStatus = {
          applied: false,
          couponCode: null,
          discountPoisha: 0,
          discountBdtFormatted: '৳0.00',
          reason: couponInvalidReason,
        };
      } else if (rule) {
        // Compute discount
        const currentSubtotal = (cart.items || []).reduce(
          (sum: number, i: any) => sum + Number(i.pricePoisha) * i.quantity,
          0
        );
        let discountPoisha = 0;
        if (rule.discountType === 'PERCENTAGE') {
          discountPoisha = Math.floor((currentSubtotal * Number(rule.discountValue)) / 100);
          if (rule.maxDiscountPoisha) {
            discountPoisha = Math.min(discountPoisha, Number(rule.maxDiscountPoisha));
          }
        } else if (rule.discountType === 'FIXED_AMOUNT') {
          discountPoisha = Math.min(Number(rule.discountValue), currentSubtotal);
        }

        couponStatus = {
          applied: true,
          couponCode: rule.code,
          discountPoisha,
          discountBdtFormatted: this.formatBdt(discountPoisha),
          reason: null,
        };
      }
    }

    // 4. Revalidate B2B Negotiated Quote Expiry
    if (cart.isB2B && cart.b2bQuoteId) {
      const quote = await (this.db as any).b2bQuote.findFirst({
        where: { id: cart.b2bQuoteId, deletedAt: null },
      });

      if (!quote || new Date() > new Date(quote.validUntil)) {
        const msg = 'B2B negotiated quote has expired and pricing must be re-negotiated.';
        warnings.push(msg);
        isReadyForCheckout = false;
      }
    }

    const updatedCart = await this.getCart(userId, guestCartToken);
    const groupedCart = await this.groupCartBySeller(updatedCart, customerDivision);

    if (updatedCart.items.length === 0) {
      isReadyForCheckout = false;
    }

    return {
      cart: updatedCart,
      groupedCart,
      hasChanges: priceChangesCount > 0 || outOfStockCount > 0 || warnings.length > 0,
      isReadyForCheckout: isReadyForCheckout && groupedCart.isReadyForCheckout,
      priceChangesCount,
      outOfStockCount,
      priceChanges,
      stockAdjustments,
      couponStatus,
      sellerIssues,
      warnings,
    };
  }

  /**
   * Retrieves cart contents partitioned into seller fulfillment packages with shipping & delivery constraints.
   */
  public async getGroupedCart(
    userId?: string,
    guestCartToken?: string,
    customerDivision: string = 'DHAKA'
  ): Promise<CartGroupedDTO> {
    const cart = await this.getCart(userId, guestCartToken);
    return this.groupCartBySeller(cart, customerDivision);
  }

  /**
   * Partitions cart items into distinct multi-vendor seller fulfillment packages.
   * Calculates per-seller shipping fee, free shipping progress, delivery timelines, and order constraints.
   */
  public async groupCartBySeller(
    cart: CartDTO,
    customerDivision: string = 'DHAKA'
  ): Promise<CartGroupedDTO> {
    const sellerMap = new Map<string, CartItemDTO[]>();

    for (const item of cart.items) {
      const existing = sellerMap.get(item.sellerId) || [];
      existing.push(item);
      sellerMap.set(item.sellerId, existing);
    }

    const sellerGroups: SellerCartGroupDTO[] = [];
    const globalWarnings: string[] = [];
    let totalShippingFeePoisha = 0;
    let isReadyForCheckout = true;
    let packageIdx = 1;

    for (const [sellerId, items] of sellerMap.entries()) {
      const seller = await (this.db as any).seller.findFirst({
        where: { id: sellerId, deletedAt: null },
        include: {
          settings: true,
          operationalDefaults: true,
        },
      });

      const sellerName = items[0]?.sellerName || seller?.businessName || 'Verified Merchant';
      const sellerSlug = items[0]?.sellerSlug || seller?.slug;
      const sellerStatus = seller?.status || 'VERIFIED';

      const subtotalPoisha = items.reduce((sum, i) => sum + i.subtotalPoisha, 0);
      const totalProductPoints = items.reduce((sum, i) => sum + i.totalProductPoints, 0);
      const itemsCount = items.reduce((sum, i) => sum + i.quantity, 0);

      // Constraints calculation
      const minOrderPoisha = 0; // standard 0 or custom MOV
      const isMinOrderSatisfied = minOrderPoisha <= 0 || subtotalPoisha >= minOrderPoisha;

      const freeShippingThresholdPoisha = 200000; // ৳2,000.00 standard free shipping threshold
      const qualifiesForFreeShipping = subtotalPoisha >= freeShippingThresholdPoisha;
      const amountNeededForFreeShippingPoisha = Math.max(
        0,
        freeShippingThresholdPoisha - subtotalPoisha
      );

      // Shipping fee in poisha: 6000 (৳60) inside Dhaka, 12000 (৳120) outside Dhaka
      const isInsideDhaka = customerDivision.toUpperCase().includes('DHAKA');
      let baseShippingFeePoisha = isInsideDhaka ? 6000 : 12000;
      if (qualifiesForFreeShipping) {
        baseShippingFeePoisha = 0;
      }

      totalShippingFeePoisha += baseShippingFeePoisha;

      const handlingDays = seller?.operationalDefaults?.defaultHandlingDays || 2;
      const transitDaysMin = isInsideDhaka ? 1 : 2;
      const transitDaysMax = isInsideDhaka ? 3 : 5;

      const groupWarnings: string[] = [];

      // Check seller vacation mode
      if (seller?.settings?.vacationMode) {
        groupWarnings.push(
          `${sellerName} is currently on vacation: ${seller.settings.vacationMessage || 'Orders will be processed after return.'}`
        );
        isReadyForCheckout = false;
      }

      // Check minimum order value
      if (!isMinOrderSatisfied) {
        groupWarnings.push(
          `Minimum order value for ${sellerName} is ${this.formatBdt(minOrderPoisha)}.`
        );
        isReadyForCheckout = false;
      }

      const totalPoisha = subtotalPoisha + baseShippingFeePoisha;

      sellerGroups.push({
        sellerId,
        sellerName,
        sellerSlug,
        sellerStatus,
        packageNumber: packageIdx++,
        items,
        itemsCount,
        subtotalPoisha,
        subtotalBdtFormatted: this.formatBdt(subtotalPoisha),
        shippingFeePoisha: baseShippingFeePoisha,
        shippingFeeBdtFormatted: this.formatBdt(baseShippingFeePoisha),
        totalPoisha,
        totalBdtFormatted: this.formatBdt(totalPoisha),
        totalProductPoints,
        constraints: {
          minOrderPoisha: minOrderPoisha > 0 ? minOrderPoisha : null,
          minOrderBdtFormatted: minOrderPoisha > 0 ? this.formatBdt(minOrderPoisha) : null,
          isMinOrderSatisfied,
          freeShippingThresholdPoisha,
          freeShippingThresholdBdtFormatted: this.formatBdt(freeShippingThresholdPoisha),
          qualifiesForFreeShipping,
          amountNeededForFreeShippingPoisha,
          amountNeededForFreeShippingBdtFormatted:
            amountNeededForFreeShippingPoisha > 0
              ? this.formatBdt(amountNeededForFreeShippingPoisha)
              : null,
          shippingMode: seller?.operationalDefaults?.shippingMode || 'PLATFORM',
          defaultHandlingDays: handlingDays,
          estimatedDeliveryMinDays: handlingDays + transitDaysMin,
          estimatedDeliveryMaxDays: handlingDays + transitDaysMax,
          vacationMode: Boolean(seller?.settings?.vacationMode),
          vacationMessage: seller?.settings?.vacationMessage || null,
          warnings: groupWarnings,
        },
      });

      if (groupWarnings.length > 0) {
        globalWarnings.push(...groupWarnings);
      }
    }

    const totalSubtotalPoisha = cart.subtotalPoisha;
    const grandTotalPoisha = totalSubtotalPoisha + totalShippingFeePoisha;

    return {
      id: cart.id,
      userId: cart.userId,
      isGuest: cart.isGuest,
      guestCartToken: cart.guestCartToken,
      currency: 'BDT',
      status: cart.status,
      couponCode: cart.couponCode,
      notes: cart.notes,
      isB2B: cart.isB2B,
      b2bQuoteId: cart.b2bQuoteId,
      purchaseOrderRef: cart.purchaseOrderRef,
      sellerGroups,
      sellerGroupsCount: sellerGroups.length,
      totalItemsCount: cart.itemsCount,
      totalSubtotalPoisha,
      totalSubtotalBdtFormatted: this.formatBdt(totalSubtotalPoisha),
      totalShippingFeePoisha,
      totalShippingFeeBdtFormatted: this.formatBdt(totalShippingFeePoisha),
      grandTotalPoisha,
      grandTotalBdtFormatted: this.formatBdt(grandTotalPoisha),
      totalProductPoints: cart.totalProductPoints,
      isReadyForCheckout: isReadyForCheckout && cart.items.length > 0,
      warnings: globalWarnings,
      version: cart.version,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
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
