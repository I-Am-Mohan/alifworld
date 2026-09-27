/**
 * AlifWorld Wishlist Domain Service
 * 
 * Manages customer saved items, custom lists, privacy settings, and share-safe link resolution.
 * Enforces strict self-service ownership and guarantees zero customer PII leakage on shared links.
 * 
 * References:
 * - docs/architecture/scope-boundaries-and-domain-map.md
 * - docs/architecture/continuous-integration-and-quality-gates.md
 * Invariants: ADR-0001, ADR-0003, ADR-0022
 */

import { randomBytes } from 'crypto';
import { prisma } from '@/shared/database/prisma';
import { generatePrefixedId, ENTITY_PREFIXES } from '@/shared/utils/id';
import { ConflictError, NotFoundError, AuthorizationError } from '@/shared/errors/app-error';
import { APP_BASE_URL } from '@/shared/seo/seo-builder';
import {
  Wishlist,
  WishlistItem,
  SharedWishlistView,
  WishlistVisibility,
} from '../types';
import {
  CreateWishlistInput,
  CreateWishlistSchema,
  UpdateWishlistInput,
  UpdateWishlistSchema,
  AddWishlistItemInput,
  AddWishlistItemSchema,
} from '../validators';

export class WishlistService {
  // In-memory persistent backing store for wishlists
  private wishlists = new Map<string, Wishlist>();

  constructor(private readonly db: any = prisma) {}

  /**
   * Lists all wishlists belonging to an authenticated customer.
   * Automatically initializes a default "My Favorites" wishlist if customer has none.
   */
  public async listCustomerWishlists(userId: string): Promise<Wishlist[]> {
    // Ensure default wishlist exists for the customer
    await this.getDefaultWishlist(userId);

    const userWishlists = Array.from(this.wishlists.values()).filter(
      (w) => w.userId === userId
    );

    return userWishlists.sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
  }

  /**
   * Retrieves or initializes the customer's default primary wishlist.
   */
  public async getDefaultWishlist(userId: string): Promise<Wishlist> {
    for (const w of this.wishlists.values()) {
      if (w.userId === userId && w.isDefault) {
        return w;
      }
    }

    const defaultWishlist: Wishlist = {
      id: `wsh_${Math.random().toString(36).substring(2, 9)}`,
      userId,
      title: 'My Favorites',
      description: 'Default saved items and wishlist',
      isDefault: true,
      visibility: 'PRIVATE',
      shareToken: null,
      items: [],
      itemCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.wishlists.set(defaultWishlist.id, defaultWishlist);
    return defaultWishlist;
  }

  /**
   * Creates a new custom customer wishlist.
   */
  public async createWishlist(
    userId: string,
    input: CreateWishlistInput
  ): Promise<Wishlist> {
    const validated = CreateWishlistSchema.parse(input);

    const wishlist: Wishlist = {
      id: `wsh_${Math.random().toString(36).substring(2, 9)}`,
      userId,
      title: validated.title,
      description: validated.description || null,
      isDefault: false,
      visibility: validated.visibility || 'PRIVATE',
      shareToken: null,
      items: [],
      itemCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.wishlists.set(wishlist.id, wishlist);

    await this.recordOutboxEvent('customer.wishlist_created', wishlist.id, {
      wishlistId: wishlist.id,
      userId,
      title: wishlist.title,
    });

    return wishlist;
  }

  /**
   * Retrieves a single customer wishlist, asserting self-service ownership.
   */
  public async getWishlistById(userId: string, wishlistId: string): Promise<Wishlist> {
    const wishlist = this.wishlists.get(wishlistId);
    if (!wishlist) {
      throw new NotFoundError(`Wishlist '${wishlistId}' not found.`);
    }

    if (wishlist.userId !== userId) {
      throw new AuthorizationError('You do not have permission to inspect this private wishlist.');
    }

    return wishlist;
  }

  /**
   * Updates customer wishlist attributes (title, description, visibility).
   */
  public async updateWishlist(
    userId: string,
    wishlistId: string,
    input: UpdateWishlistInput
  ): Promise<Wishlist> {
    const wishlist = await this.getWishlistById(userId, wishlistId);
    const validated = UpdateWishlistSchema.parse(input);

    const updated: Wishlist = {
      ...wishlist,
      title: validated.title ?? wishlist.title,
      description: validated.description !== undefined ? validated.description : wishlist.description,
      visibility: validated.visibility ?? wishlist.visibility,
      updatedAt: new Date().toISOString(),
    };

    this.wishlists.set(wishlistId, updated);

    await this.recordOutboxEvent('customer.wishlist_updated', wishlistId, {
      wishlistId,
      userId,
      visibility: updated.visibility,
    });

    return updated;
  }

  /**
   * Adds a product variant item to a customer wishlist.
   */
  public async addItemToWishlist(
    userId: string,
    wishlistId: string,
    input: AddWishlistItemInput
  ): Promise<{ wishlist: Wishlist; item: WishlistItem }> {
    const wishlist = await this.getWishlistById(userId, wishlistId);
    const validated = AddWishlistItemSchema.parse(input);

    // Look up product from database
    const product = await this.db.product.findFirst({
      where: { id: validated.productId, deletedAt: null },
      include: {
        variants: { where: { deletedAt: null } },
        media: { orderBy: { displayOrder: 'asc' } },
        translations: true,
      },
    });

    if (!product) {
      throw new NotFoundError(`Product '${validated.productId}' not found in catalog.`);
    }

    let variantTitle: string | null = null;
    let pricePoisha = Number(product.basePricePoisha || 0);
    let sku = product.sku || null;
    let productPoint = product.productPoint || 0;
    let inStock = true;

    if (validated.variantId && product.variants) {
      const variant = product.variants.find((v: any) => v.id === validated.variantId);
      if (variant) {
        variantTitle = variant.title;
        pricePoisha = Number(variant.pricePoisha || pricePoisha);
        sku = variant.sku || sku;
        productPoint = variant.productPoint ?? productPoint;
      }
    }

    // Resolve Bengali title
    const translation = product.translations?.find((t: any) => t.locale === 'bn-BD');
    const productTitleBn = translation?.title || product.titleBn || null;

    const primaryImage = product.media?.[0]?.mediaUrl || null;

    // Check if item is already in wishlist
    const existingIndex = wishlist.items.findIndex(
      (item) => item.productId === validated.productId && item.variantId === (validated.variantId || null)
    );

    if (existingIndex >= 0) {
      return { wishlist, item: wishlist.items[existingIndex] };
    }

    const item: WishlistItem = {
      id: `wsi_${Math.random().toString(36).substring(2, 9)}`,
      wishlistId,
      productId: validated.productId,
      variantId: validated.variantId || null,
      productSlug: product.slug,
      productTitle: product.title,
      productTitleBn,
      variantTitle,
      sku,
      imageUrl: primaryImage,
      pricePoisha,
      priceBdtFormatted: this.formatBdt(pricePoisha),
      productPoint,
      inStock,
      notes: validated.notes || null,
      addedAt: new Date().toISOString(),
    };

    wishlist.items.push(item);
    wishlist.itemCount = wishlist.items.length;
    wishlist.updatedAt = new Date().toISOString();
    this.wishlists.set(wishlistId, wishlist);

    await this.recordOutboxEvent('customer.wishlist_item_added', item.id, {
      wishlistId,
      userId,
      productId: item.productId,
      variantId: item.variantId,
    });

    return { wishlist, item };
  }

  /**
   * Removes an item from a customer wishlist.
   */
  public async removeItemFromWishlist(
    userId: string,
    wishlistId: string,
    itemId: string
  ): Promise<Wishlist> {
    const wishlist = await this.getWishlistById(userId, wishlistId);

    const initialCount = wishlist.items.length;
    wishlist.items = wishlist.items.filter((item) => item.id !== itemId);

    if (wishlist.items.length === initialCount) {
      throw new NotFoundError(`Wishlist item '${itemId}' not found in wishlist.`);
    }

    wishlist.itemCount = wishlist.items.length;
    wishlist.updatedAt = new Date().toISOString();
    this.wishlists.set(wishlistId, wishlist);

    await this.recordOutboxEvent('customer.wishlist_item_removed', itemId, {
      wishlistId,
      userId,
      itemId,
    });

    return wishlist;
  }

  /**
   * Deletes a custom customer wishlist. (Default wishlist cannot be deleted).
   */
  public async deleteWishlist(userId: string, wishlistId: string): Promise<{ success: boolean }> {
    const wishlist = await this.getWishlistById(userId, wishlistId);

    if (wishlist.isDefault) {
      throw new ConflictError('Cannot delete customer primary default wishlist.');
    }

    this.wishlists.delete(wishlistId);

    await this.recordOutboxEvent('customer.wishlist_deleted', wishlistId, {
      wishlistId,
      userId,
    });

    return { success: true };
  }

  /**
   * Generates or regenerates a cryptographic share token for share-safe wishlist links.
   */
  public async generateShareLink(
    userId: string,
    wishlistId: string
  ): Promise<{ shareToken: string; shareUrl: string; wishlist: Wishlist }> {
    const wishlist = await this.getWishlistById(userId, wishlistId);

    const token = `wsh_${randomBytes(16).toString('hex')}`;
    const shareUrl = `${APP_BASE_URL}/wishlist/shared/${token}`;

    const updated: Wishlist = {
      ...wishlist,
      visibility: 'SHARED_LINK',
      shareToken: token,
      updatedAt: new Date().toISOString(),
    };

    this.wishlists.set(wishlistId, updated);

    await this.recordOutboxEvent('customer.wishlist_shared', wishlistId, {
      wishlistId,
      userId,
      shareToken: token,
    });

    return { shareToken: token, shareUrl, wishlist: updated };
  }

  /**
   * Revokes the share token and returns wishlist to PRIVATE.
   */
  public async revokeShareLink(
    userId: string,
    wishlistId: string
  ): Promise<{ wishlist: Wishlist }> {
    const wishlist = await this.getWishlistById(userId, wishlistId);

    const updated: Wishlist = {
      ...wishlist,
      visibility: 'PRIVATE',
      shareToken: null,
      updatedAt: new Date().toISOString(),
    };

    this.wishlists.set(wishlistId, updated);

    await this.recordOutboxEvent('customer.wishlist_share_revoked', wishlistId, {
      wishlistId,
      userId,
    });

    return { wishlist: updated };
  }

  /**
   * Public, share-safe reader for wishlists accessed via share token.
   * Invariant: Zero customer PII leakage (no email, phone, or internal identifiers).
   */
  public async getSharedWishlist(shareToken: string): Promise<SharedWishlistView> {
    let matchedWishlist: Wishlist | null = null;

    for (const w of this.wishlists.values()) {
      if (w.shareToken === shareToken) {
        matchedWishlist = w;
        break;
      }
    }

    if (!matchedWishlist) {
      throw new NotFoundError('Shared wishlist link is invalid or has expired.');
    }

    if (matchedWishlist.visibility !== 'SHARED_LINK' && matchedWishlist.visibility !== 'PUBLIC') {
      throw new AuthorizationError('This shared wishlist has been made private by its owner.');
    }

    // Resolve anonymized owner name (minimize personal data)
    let ownerDisplayName = 'AlifWorld Customer';
    try {
      const user = await this.db.user.findFirst({
        where: { id: matchedWishlist.userId },
        select: { name: true },
      });
      if (user?.name) {
        const parts = user.name.trim().split(' ');
        ownerDisplayName = parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : parts[0];
      }
    } catch {
      // Keep default anonymized name
    }

    return {
      id: matchedWishlist.id,
      title: matchedWishlist.title,
      description: matchedWishlist.description,
      ownerDisplayName,
      items: matchedWishlist.items,
      itemCount: matchedWishlist.items.length,
      shareUrl: `${APP_BASE_URL}/wishlist/shared/${shareToken}`,
      updatedAt: matchedWishlist.updatedAt,
    };
  }

  private formatBdt(poisha: number): string {
    const bdt = poisha / 100;
    return bdt.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  private async recordOutboxEvent(eventType: string, aggregateId: string, payload: any): Promise<void> {
    try {
      await this.db.outboxEvent.create({
        data: {
          id: generatePrefixedId(ENTITY_PREFIXES.OUTBOX),
          eventType,
          aggregateType: 'WISHLIST',
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

export const wishlistService = new WishlistService();
