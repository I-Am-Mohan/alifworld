/**
 * Checkout Orchestration Domain Types & Contracts
 *
 * Invariant: All totals recomputed server-side; client totals strictly ignored.
 * Invariant: Product price (poisha) and Product Points are independent units.
 * Invariant: B2B quotes enter the same pipeline with locked negotiated pricing.
 * Invariant: Idempotency strictly enforced per customer and key.
 */

export interface CheckoutShippingAddressDTO {
  shippingName: string;
  shippingPhone: string;
  shippingDivision: 'DHAKA' | 'CHITTAGONG' | 'RAJSHAHI' | 'KHULNA' | 'BARISAL' | 'SYLHET' | 'RANGPUR' | 'MYMENSINGH' | string;
  shippingDistrict: string;
  shippingUpazila?: string | null;
  shippingAddress: string;
  shippingPostalCode?: string | null;
  billingAddress?: string | null;
  customerNotes?: string | null;
  purchaseOrderRef?: string | null;
}

export interface CheckoutExecutionInput {
  cartId: string;
  checkout: CheckoutShippingAddressDTO;
  idempotencyKey: string;
  couponCode?: string | null;
}

export interface CheckoutOrderItemSnapshotDTO {
  variantId: string;
  productTitle: string;
  variantTitle: string;
  sku: string;
  unitPricePoisha: bigint;
  quantity: number;
  totalPoisha: bigint;
  discountPoisha: bigint;
  sellerDiscountPoisha: bigint;
  platformDiscountPoisha: bigint;
  taxRatePercent: number;
  taxPoisha: bigint;
  productPointSnapshot: number;
  totalProductPoints: number;
}

export interface CheckoutSellerGroupDTO {
  sellerId: string;
  warehouseId?: string | null;
  groupNumber: string;
  subtotalPoisha: bigint;
  discountPoisha: bigint;
  sellerDiscountPoisha: bigint;
  platformDiscountPoisha: bigint;
  shippingFeePoisha: bigint;
  taxPoisha: bigint;
  totalPoisha: bigint;
  sellerCommissionPoisha: bigint;
  sellerPayoutPoisha: bigint;
  totalProductPoints: number;
  courierProvider?: string | null;
  estimatedDelivery?: Date | null;
  items: CheckoutOrderItemSnapshotDTO[];
}

export interface CheckoutResultDTO {
  orderId: string;
  orderNumber: string;
  customerId: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  currency: 'BDT';
  subtotalPoisha: number;
  discountPoisha: number;
  shippingFeePoisha: number;
  taxPoisha: number;
  totalPoisha: number;
  totalBdtFormatted: string;
  totalProductPoints: number;
  isB2B: boolean;
  b2bQuoteId?: string | null;
  purchaseOrderRef?: string | null;
  fulfillmentGroupsCount: number;
  createdAt: string;
  isIdempotentReplay?: boolean;
}
