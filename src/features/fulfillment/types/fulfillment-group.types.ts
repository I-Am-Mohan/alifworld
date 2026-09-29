/**
 * Multi-Vendor Seller Fulfillment Group Domain Contracts & State Machine
 *
 * Invariant: Strict merchant tenant isolation enforced inside repository queries.
 * Invariant: BDT monetary values represented in integer minor units (poisha).
 * Invariant: Product price (poisha) and Product Points are independent units.
 * Invariant: Sellers cannot control commissions, protected payouts, or another seller's objects.
 */

export type FulfillmentGroupStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'PACKING'
  | 'READY_FOR_PICKUP'
  | 'HANDED_OVER_TO_COURIER'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REJECTED';

/**
 * Valid lifecycle state transitions for seller fulfillment groups.
 */
export const FULFILLMENT_GROUP_TRANSITIONS: Record<
  FulfillmentGroupStatus,
  FulfillmentGroupStatus[]
> = {
  PENDING: ['ACCEPTED', 'REJECTED'],
  ACCEPTED: ['PACKING', 'CANCELLED'],
  PACKING: ['READY_FOR_PICKUP', 'CANCELLED'],
  READY_FOR_PICKUP: ['HANDED_OVER_TO_COURIER', 'CANCELLED'],
  HANDED_OVER_TO_COURIER: ['IN_TRANSIT', 'DELIVERED'],
  IN_TRANSIT: ['DELIVERED'],
  DELIVERED: [], // Terminal state
  CANCELLED: [], // Terminal state
  REJECTED: [], // Terminal state
};

export interface FulfillmentGroupItemDTO {
  id: string;
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
  productPointSnapshot: number;
  totalProductPoints: number;
  status: string;
}

export interface FulfillmentGroupShipmentDTO {
  id: string;
  shipmentNumber: string;
  courierProvider: string;
  trackingNumber?: string | null;
  consignmentId?: string | null;
  status: string;
  weightGrams?: number | null;
  packageCount: number;
  shippingCostPoisha: number;
  shippingCostBdtFormatted: string;
  shippedAt?: string | null;
  deliveredAt?: string | null;
}

export interface SellerFulfillmentGroupDTO {
  id: string;
  orderId: string;
  orderNumber: string;
  sellerId: string;
  sellerName: string;
  sellerSlug?: string | null;
  warehouseId?: string | null;
  warehouseName?: string | null;
  groupNumber: string;
  status: FulfillmentGroupStatus;
  subtotalPoisha: number;
  subtotalBdtFormatted: string;
  discountPoisha: number;
  sellerDiscountPoisha: number;
  platformDiscountPoisha: number;
  shippingFeePoisha: number;
  shippingFeeBdtFormatted: string;
  taxPoisha: number;
  taxBdtFormatted: string;
  totalPoisha: number;
  totalBdtFormatted: string;
  sellerCommissionPoisha: number;
  sellerCommissionBdtFormatted: string;
  sellerPayoutPoisha: number;
  sellerPayoutBdtFormatted: string;
  totalProductPoints: number;
  courierProvider?: string | null;
  trackingNumber?: string | null;
  consignmentId?: string | null;
  pickupDate?: string | null;
  estimatedDelivery?: string | null;
  deliveredAt?: string | null;
  shippingDestination: {
    recipientName: string;
    recipientPhone: string;
    division: string;
    district: string;
    upazila?: string | null;
    postalCode?: string | null;
    address: string;
  };
  items: FulfillmentGroupItemDTO[];
  shipments: FulfillmentGroupShipmentDTO[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface PackingSlipManifestDTO {
  groupNumber: string;
  orderNumber: string;
  orderDate: string;
  seller: {
    id: string;
    businessName: string;
    tradeLicenseNumber?: string | null;
    phone?: string | null;
  };
  recipient: {
    name: string;
    phone: string;
    address: string;
    division: string;
    district: string;
    upazila?: string | null;
    postalCode?: string | null;
  };
  logistics: {
    courierProvider: string;
    consignmentId?: string | null;
    trackingNumber?: string | null;
    estimatedDelivery?: string | null;
    totalWeightGrams: number;
    totalItems: number;
  };
  financialSummary: {
    subtotalPoisha: number;
    subtotalBdtFormatted: string;
    shippingFeePoisha: number;
    shippingFeeBdtFormatted: string;
    taxPoisha: number;
    taxBdtFormatted: string;
    totalPoisha: number;
    totalBdtFormatted: string;
    isCod: boolean;
    amountToCollectPoisha: number;
    amountToCollectBdtFormatted: string;
  };
  items: Array<{
    sku: string;
    productTitle: string;
    variantTitle: string;
    quantity: number;
    unitPricePoisha: number;
    unitPriceBdtFormatted: string;
    totalPoisha: number;
    totalBdtFormatted: string;
  }>;
  generatedAt: string;
}
