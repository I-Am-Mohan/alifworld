/**
 * AlifWorld Wishlist Domain Types & Contracts
 *
 * Defines type contracts for customer saved items, custom wishlists,
 * privacy visibility settings, and share-safe public views.
 *
 * Invariants: ADR-0001, ADR-0003, ADR-0022
 */

export type WishlistVisibility = 'PRIVATE' | 'PUBLIC' | 'SHARED_LINK';

export interface WishlistItem {
  id: string;
  wishlistId: string;
  productId: string;
  variantId?: string | null;
  productSlug: string;
  productTitle: string;
  productTitleBn?: string | null;
  variantTitle?: string | null;
  sku?: string | null;
  imageUrl?: string | null;
  pricePoisha: number;
  priceBdtFormatted: string;
  productPoint: number;
  inStock: boolean;
  notes?: string | null;
  addedAt: string;
}

export interface Wishlist {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  isDefault: boolean;
  visibility: WishlistVisibility;
  shareToken?: string | null; // Cryptographically random URL token
  items: WishlistItem[];
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SharedWishlistView {
  id: string;
  title: string;
  description?: string | null;
  ownerDisplayName: string; // Minimized name (e.g. "Rahim A." - zero PII leaked!)
  items: WishlistItem[];
  itemCount: number;
  shareUrl: string;
  updatedAt: string;
}
