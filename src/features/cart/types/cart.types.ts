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
  discountPoisha?: number;
  discountBdtFormatted?: string;
  totalProductPoints: number;
  warnings?: string[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface PriceChangeDetail {
  variantId: string;
  productTitle: string;
  oldPricePoisha: number;
  newPricePoisha: number;
  oldPriceBdtFormatted: string;
  newPriceBdtFormatted: string;
}

export interface StockAdjustmentDetail {
  variantId: string;
  productTitle: string;
  requestedQuantity: number;
  availableStock: number;
  adjustedQuantity: number;
}

export interface CouponValidationDetail {
  applied: boolean;
  couponCode: string | null;
  discountPoisha: number;
  discountBdtFormatted: string;
  reason: string | null;
}

export interface SellerIssueDetail {
  sellerId: string;
  sellerName: string;
  issue: 'SUSPENDED' | 'RESTRICTED' | 'VACATION' | 'MIN_ORDER_NOT_MET' | 'DELETED';
  message: string;
}

export interface CartRevalidationResultDTO {
  cart: CartDTO;
  groupedCart?: CartGroupedDTO;
  hasChanges: boolean;
  isReadyForCheckout: boolean;
  priceChangesCount: number;
  outOfStockCount: number;
  priceChanges: PriceChangeDetail[];
  stockAdjustments: StockAdjustmentDetail[];
  couponStatus: CouponValidationDetail;
  sellerIssues: SellerIssueDetail[];
  warnings: string[];
}

export interface MergeCartResultDTO {
  userCart: CartDTO;
  guestCartId: string;
  mergedItemsCount: number;
  warnings: string[];
}

export interface SellerFulfillmentConstraintsDTO {
  minOrderPoisha?: number | null;
  minOrderBdtFormatted?: string | null;
  isMinOrderSatisfied: boolean;
  freeShippingThresholdPoisha?: number | null;
  freeShippingThresholdBdtFormatted?: string | null;
  qualifiesForFreeShipping: boolean;
  amountNeededForFreeShippingPoisha: number;
  amountNeededForFreeShippingBdtFormatted?: string | null;
  shippingMode: 'PLATFORM' | 'SELF_DELIVERY' | string;
  defaultHandlingDays: number;
  estimatedDeliveryMinDays: number;
  estimatedDeliveryMaxDays: number;
  vacationMode: boolean;
  vacationMessage?: string | null;
  warnings: string[];
}

export interface SellerCartGroupDTO {
  sellerId: string;
  sellerName: string;
  sellerSlug?: string;
  sellerStatus: string;
  packageNumber: number; // e.g. 1 (Package 1 of 2)
  items: CartItemDTO[];
  itemsCount: number;
  subtotalPoisha: number;
  subtotalBdtFormatted: string;
  shippingFeePoisha: number;
  shippingFeeBdtFormatted: string;
  totalPoisha: number;
  totalBdtFormatted: string;
  totalProductPoints: number;
  constraints: SellerFulfillmentConstraintsDTO;
}

export interface CartGroupedDTO {
  id: string;
  userId: string | null;
  isGuest: boolean;
  guestCartToken?: string | null;
  currency: 'BDT';
  status: string;
  couponCode: string | null;
  notes: string | null;
  isB2B: boolean;
  b2bQuoteId: string | null;
  purchaseOrderRef: string | null;
  sellerGroups: SellerCartGroupDTO[];
  sellerGroupsCount: number;
  totalItemsCount: number;
  totalSubtotalPoisha: number;
  totalSubtotalBdtFormatted: string;
  totalShippingFeePoisha: number;
  totalShippingFeeBdtFormatted: string;
  grandTotalPoisha: number;
  grandTotalBdtFormatted: string;
  totalProductPoints: number;
  isReadyForCheckout: boolean;
  warnings: string[];
  version: number;
  createdAt: string;
  updatedAt: string;
}
