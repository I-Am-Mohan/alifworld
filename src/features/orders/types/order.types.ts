/**
 * Parent Customer Orders & Seller Fulfillment Orders Domain Contracts
 *
 * Invariant: BDT monetary values strictly in integer minor units (poisha).
 * Invariant: One customer parent view (`Order`) vs merchant-isolated fulfillment groups (`SellerFulfillmentGroup`).
 * Invariant: Sellers cannot control commissions, payouts, or another seller's orders.
 * Invariant: Personal data minimized; self-service customer ownership enforced.
 */

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PROCESSING'
  | 'CONFIRMED'
  | 'PARTIALLY_SHIPPED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REFUNDED';

export type PaymentStatus =
  'UNPAID' | 'AUTHORIZED' | 'PAID' | 'PARTIALLY_REFUNDED' | 'REFUNDED' | 'FAILED';

export type FulfillmentStatus = 'UNFULFILLED' | 'PARTIALLY_FULFILLED' | 'FULFILLED' | 'RETURNED';

export interface OrderLineItemSnapshotDTO {
  id: string;
  orderId: string;
  fulfillmentGroupId: string;
  sellerId: string;
  sellerName?: string;
  variantId: string;
  productTitle: string;
  variantTitle: string;
  sku: string;
  unitPricePoisha: number;
  unitPriceBdtFormatted: string;
  quantity: number;
  totalPoisha: number;
  totalBdtFormatted: string;
  discountPoisha: number;
  sellerDiscountPoisha: number;
  platformDiscountPoisha: number;
  taxRatePercent: number;
  taxPoisha: number;
  taxBdtFormatted: string;
  productPointSnapshot: number; // independent discrete loyalty units
  totalProductPoints: number; // productPointSnapshot * quantity
  status: string;
  imageUrl?: string | null;
}

export interface OrderStatusTimelineEventDTO {
  id: string;
  fromStatus?: string | null;
  toStatus: string;
  statusLabelEn: string;
  statusLabelBn: string;
  actorRole: 'CUSTOMER' | 'SELLER' | 'ADMIN' | 'SYSTEM' | string;
  reason?: string | null;
  occurredAt: string;
}

export interface SellerPackageForCustomerDTO {
  id: string;
  groupNumber: string;
  sellerId: string;
  sellerName: string;
  sellerSlug?: string | null;
  status: string;
  statusLabelEn: string;
  statusLabelBn: string;
  subtotalPoisha: number;
  subtotalBdtFormatted: string;
  shippingFeePoisha: number;
  shippingFeeBdtFormatted: string;
  isFreeShipping: boolean;
  courierProvider?: string | null;
  trackingNumber?: string | null;
  consignmentId?: string | null;
  trackingUrl?: string | null;
  estimatedDelivery?: string | null;
  items: OrderLineItemSnapshotDTO[];
}

export interface CustomerSelfServiceActionsDTO {
  canCancel: boolean;
  cancelRestrictionReasonEn?: string | null;
  cancelRestrictionReasonBn?: string | null;
  canDownloadInvoice: boolean;
  canReorder: boolean;
  canRequestReturn: boolean;
}

export interface CustomerParentOrderDTO {
  id: string;
  orderNumber: string;
  customerId: string;
  status: OrderStatus;
  statusLabelEn: string;
  statusLabelBn: string;
  paymentStatus: PaymentStatus;
  paymentStatusLabelEn: string;
  paymentStatusLabelBn: string;
  fulfillmentStatus: FulfillmentStatus;
  currency: 'BDT';
  financialSummary: {
    subtotalPoisha: number;
    subtotalBdtFormatted: string;
    discountPoisha: number;
    discountBdtFormatted: string;
    sellerDiscountPoisha: number;
    platformDiscountPoisha: number;
    shippingFeePoisha: number;
    shippingFeeBdtFormatted: string;
    taxPoisha: number;
    taxBdtFormatted: string;
    totalPoisha: number;
    totalBdtFormatted: string;
    totalProductPoints: number;
  };
  shippingDestination: {
    recipientName: string;
    recipientPhone: string;
    recipientPhoneMasked: string;
    division: string;
    district: string;
    upazila?: string | null;
    address: string;
    postalCode?: string | null;
  };
  billingAddress?: string | null;
  customerNotes?: string | null;
  ruleVersion: string;
  packages: SellerPackageForCustomerDTO[];
  items: OrderLineItemSnapshotDTO[];
  statusHistory: OrderStatusTimelineEventDTO[];
  payments: Array<{
    id: string;
    paymentNumber: string;
    gatewayProvider: string;
    status: string;
    amountPoisha: number;
    amountBdtFormatted: string;
    capturedAt?: string | null;
  }>;
  selfServiceActions: CustomerSelfServiceActionsDTO;
  createdAt: string;
  updatedAt: string;
}

export interface SellerFulfillmentOrderDTO {
  id: string; // SellerFulfillmentGroup ID
  orderId: string; // Parent Order ID
  orderNumber: string; // Parent Order Number reference
  groupNumber: string; // e.g. SFG-20260922-XXXX-SEL01
  sellerId: string;
  sellerName: string;
  status: string; // PENDING, ACCEPTED, PACKING, READY_FOR_PICKUP, HANDED_OVER_TO_COURIER, IN_TRANSIT, DELIVERED, CANCELLED, REJECTED
  statusLabelEn: string;
  statusLabelBn: string;
  financialBreakdown: {
    subtotalPoisha: number;
    subtotalBdtFormatted: string;
    discountPoisha: number;
    sellerDiscountPoisha: number;
    platformDiscountPoisha: number;
    discountBdtFormatted: string;
    shippingFeePoisha: number;
    shippingFeeBdtFormatted: string;
    taxPoisha: number;
    taxBdtFormatted: string;
    totalPoisha: number;
    totalBdtFormatted: string;
    // Platform protected values (sellers cannot modify)
    sellerCommissionPoisha: number;
    sellerCommissionBdtFormatted: string;
    sellerPayoutPoisha: number;
    sellerPayoutBdtFormatted: string;
    totalProductPoints: number;
  };
  deliveryContact: {
    recipientName: string;
    recipientPhoneMasked: string;
    division: string;
    district: string;
    upazila?: string | null;
    address: string;
    postalCode?: string | null;
  };
  logistics: {
    courierProvider?: string | null;
    trackingNumber?: string | null;
    consignmentId?: string | null;
    trackingUrl?: string | null;
    pickupDate?: string | null;
    estimatedDelivery?: string | null;
    deliveredAt?: string | null;
  };
  items: Array<{
    id: string;
    variantId: string;
    productTitle: string;
    variantTitle: string;
    sku: string;
    quantity: number;
    unitPricePoisha: number;
    unitPriceBdtFormatted: string;
    totalPoisha: number;
    totalBdtFormatted: string;
    taxRatePercent: number;
    taxPoisha: number;
    taxBdtFormatted: string;
    productPointSnapshot: number;
    totalProductPoints: number;
    status: string;
  }>;
  shipments: Array<{
    id: string;
    shipmentNumber: string;
    courierProvider: string;
    trackingNumber?: string | null;
    status: string;
    weightGrams?: number | null;
    shippingCostPoisha: number;
    shippingCostBdtFormatted: string;
  }>;
  createdAt: string;
  updatedAt: string;
}
