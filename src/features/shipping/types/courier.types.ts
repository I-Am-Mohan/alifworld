/**
 * Bangladesh Courier Logistics & In-House Delivery Domain Contracts
 *
 * Invariant: BDT monetary units strictly represented in integer poisha.
 * Invariant: Recipient phone numbers normalized to canonical Bangladesh E.164 (+8801XXXXXXXXX).
 * Invariant: Multi-courier support: Pathao, Steadfast, RedX, Paperfly, and AlifExpress In-House Fleet.
 * Invariant: Courier adapters remain real with graceful degraded responses when credentials are absent.
 */

import { BangladeshDivisionCode, CourierProviderCode, DeliveryZone } from './serviceability.types';

export type CourierCode = CourierProviderCode;

export type ShipmentStatus =
  | 'PENDING'
  | 'LABEL_CREATED'
  | 'ASSIGNED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'FAILED_DELIVERY'
  | 'RETURNED_TO_SELLER'
  | 'CANCELLED';

export interface CreateConsignmentRequest {
  shipmentId: string;
  shipmentNumber: string;
  fulfillmentGroupId: string;
  orderNumber: string;
  sellerId: string;
  sellerName: string;
  sellerPhone?: string | null;
  sellerAddress?: string | null;
  recipientName: string;
  recipientPhone: string; // will be normalized with normalizeBangladeshPhone
  recipientAlternativePhone?: string | null;
  deliveryAddress: string;
  division: BangladeshDivisionCode | string;
  district: string;
  upazila?: string | null;
  postalCode?: string | null;
  itemDescription: string;
  itemQuantity: number;
  totalWeightGrams: number;
  codAmountPoisha: number; // 0 for digital prepayment
  isPrepaid: boolean;
  shippingCostPoisha: number;
  specialInstructions?: string | null;
}

export interface CourierConsignmentResultDTO {
  success: boolean;
  courierCode: CourierCode;
  consignmentId: string;
  trackingNumber: string;
  trackingUrl?: string | null;
  labelUrl?: string | null;
  status: ShipmentStatus;
  courierFeePoisha: number;
  courierFeeBdtFormatted: string;
  estimatedDeliveryDate?: string | null; // ISO 8601 string
  otpCode?: string | null; // Only for in-house delivery verification
  message: string;
  rawResponse?: Record<string, unknown>;
}

export interface TrackingTimelineEventDTO {
  status: ShipmentStatus;
  location?: string | null;
  description: string;
  occurredAt: string; // ISO 8601 string
  carrierPayload?: Record<string, unknown> | null;
}

export interface CourierTrackingResultDTO {
  shipmentNumber: string;
  consignmentId: string;
  trackingNumber: string;
  courierCode: CourierCode;
  courierName: string;
  currentStatus: ShipmentStatus;
  statusLabelEn: string;
  statusLabelBn: string;
  currentLocation?: string | null;
  recipientName: string;
  recipientPhoneMasked: string;
  deliveryAddress: string;
  division: string;
  district: string;
  upazila?: string | null;
  codAmountPoisha: number;
  codAmountBdtFormatted: string;
  isPrepaid: boolean;
  estimatedDeliveryDate?: string | null;
  isDelivered: boolean;
  deliveredAt?: string | null;
  events: TrackingTimelineEventDTO[];
  lastSyncedAt: string;
}

export interface CourierCancellationResultDTO {
  success: boolean;
  consignmentId: string;
  trackingNumber?: string;
  message: string;
  cancelledAt: string;
}

export interface CourierWebhookEventDTO {
  courierCode: CourierCode;
  consignmentId: string;
  trackingNumber?: string;
  newStatus: ShipmentStatus;
  location?: string | null;
  reason?: string | null;
  eventTimestamp: string;
  rawPayload: Record<string, unknown>;
}

export interface CourierServiceabilityDTO {
  isServiceable: boolean;
  courierCode: CourierCode;
  zone: DeliveryZone;
  supportsCod: boolean;
  maxCodAmountPoisha: number;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  message: string;
}

/**
 * Pluggable Courier Adapter Interface
 */
export interface ICourierAdapter {
  readonly courierCode: CourierCode;
  readonly courierName: string;
  readonly isEnabled: boolean;
  readonly isConfigured: boolean;

  checkServiceability(
    division: string,
    district: string,
    upazila?: string | null
  ): Promise<CourierServiceabilityDTO>;

  createConsignment(
    request: CreateConsignmentRequest
  ): Promise<CourierConsignmentResultDTO>;

  trackShipment(
    consignmentId: string,
    trackingNumber?: string
  ): Promise<CourierTrackingResultDTO>;

  cancelConsignment(
    consignmentId: string,
    reason?: string
  ): Promise<CourierCancellationResultDTO>;

  parseWebhook(
    payload: unknown,
    headers?: Record<string, string>
  ): Promise<CourierWebhookEventDTO>;

  verifyWebhookSignature?(
    rawBody: string,
    headers?: Record<string, string>
  ): boolean;
}

export interface CourierInfoDTO {
  code: CourierCode;
  name: string;
  isEnabled: boolean;
  isConfigured: boolean;
  supportedZones: DeliveryZone[];
  supportsCod: boolean;
  maxCodLimitPoisha: number;
  maxCodLimitBdtFormatted: string;
  isFastTrackExpress: boolean;
  supportsOtpVerification: boolean;
}
