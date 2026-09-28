/**
 * Customer Shopping Cart Domain Types & Invariants
 *
 * Invariant: Product price (poisha) and Product Points are independent units.
 * Invariant: Snapshot both price and points on cart items.
 * Invariant: Safe guest cart merge with inventory deduplication and live price/point revalidation.
 */

export interface CartItemDTO {
  id: string;
  cartId: string;
  variantId: string;
  sellerId: string;
  sellerName: string;
  sellerSlug?: string;
  productTitle: string;
  productSlug?: string;
  variantTitle: string;
  sku: string;
  imageUrl?: string | null;
  quantity: number;
  pricePoisha: number;
  priceBdtFormatted: string;
  productPoint: number;
  subtotalPoisha: number;
  subtotalBdtFormatted: string;
  totalProductPoints: number;
  availableStock?: number;
  inStock: boolean;
  isPriceChanged?: boolean;
  originalPricePoisha?: number;
}

export interface CartDTO {
  id: string;
  userId: string | null;
  isGuest: boolean;
  guestCartToken?: string | null;
  currency: 'BDT';
  status: 'ACTIVE' | 'ABANDONED' | 'CONVERTED' | 'MERGED';
  couponCode: string | null;
  notes: string | null;
  isB2B: boolean;
  b2bQuoteId: string | null;
  purchaseOrderRef: string | null;
  items: CartItemDTO[];
  itemsCount: number;
  subtotalPoisha: number;
  subtotalBdtFormatted: string;
  totalProductPoints: number;
  warnings?: string[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CartRevalidationResultDTO {
  cart: CartDTO;
  hasChanges: boolean;
  priceChangesCount: number;
  outOfStockCount: number;
  warnings: string[];
}

export interface MergeCartResultDTO {
  userCart: CartDTO;
  guestCartId: string;
  mergedItemsCount: number;
  warnings: string[];
}
