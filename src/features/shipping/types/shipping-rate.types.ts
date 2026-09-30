/**
 * Shipping Rate & Delivery Promise Domain Types & Contracts
 *
 * Invariant: BDT monetary values strictly represented in integer minor units (poisha).
 * Invariant: Delivery promises calculated in 'Asia/Dhaka' with Bangladesh business calendar.
 * Invariant: Multi-vendor shipping computed per seller fulfillment group.
 * Invariant: Physical weight & volumetric weight evaluated for chargeable weight tiers.
 * Invariant: Versioned rule engine snapshots guarantee historical immutability.
 */

import { BangladeshDivisionCode, DeliveryZone, CourierProviderCode } from './serviceability.types';

export type ShippingMethodCode = 'STANDARD' | 'EXPRESS' | 'SAME_DAY' | 'NEXT_DAY' | 'HEAVY_FREIGHT';

export type ShippingClassCode =
  'STANDARD' | 'FRAGILE' | 'HEAVY' | 'BULK' | 'HAZMAT' | 'PERISHABLE' | 'DIGITAL';

export type PromiseConfidenceLevel = 'GUARANTEED' | 'HIGH' | 'ESTIMATED';

export interface ShippingAddressInput {
  division: BangladeshDivisionCode | string;
  district: string;
  upazila?: string | null;
  postalCode?: string | null;
  streetAddress?: string | null;
}

export interface ShippingItemInput {
  variantId: string;
  productTitle: string;
  quantity: number;
  weightGrams?: number | null;
  lengthMm?: number | null;
  widthMm?: number | null;
  heightMm?: number | null;
  shippingClass?: string | null;
  requiresShipping?: boolean;
  unitPricePoisha: bigint | number;
  sellerId: string;
}

export interface PackageWeightBreakdown {
  actualWeightGrams: number;
  volumetricWeightGrams: number;
  chargeableWeightGrams: number;
  isVolumetricDominant: boolean;
  isOverweight: boolean;
}

export interface DeliveryPromiseSnapshotDTO {
  minEstimatedDate: string; // ISO 8601 string
  maxEstimatedDate: string; // ISO 8601 string
  minEstimatedFormattedEn: string;
  maxEstimatedFormattedEn: string;
  minEstimatedFormattedBn: string;
  maxEstimatedFormattedBn: string;
  promiseTextEn: string;
  promiseTextBn: string;
  handlingDays: number;
  transitDaysMin: number;
  transitDaysMax: number;
  orderCutoffTime: string; // "14:00"
  cutoffRemainingMinutes: number | null;
  isCutoffPassed: boolean;
  confidenceLevel: PromiseConfidenceLevel;
  isGuaranteed: boolean;
  slaHours: number;
  appliedRuleVersion: string;
}

export interface ShippingRateOptionDTO {
  methodCode: ShippingMethodCode;
  methodNameEn: string;
  methodNameBn: string;
  courierProvider: CourierProviderCode | string;
  baseRatePoisha: number;
  weightSurchargePoisha: number;
  classSurchargePoisha: number;
  freeShippingDiscountPoisha: number;
  finalRatePoisha: number;
  finalRateBdtFormatted: string;
  isFreeShipping: boolean;
  isCodAvailable: boolean;
  maxCodAmountPoisha: number;
  deliveryPromise: DeliveryPromiseSnapshotDTO;
}

export interface SellerShippingQuoteDTO {
  sellerId: string;
  sellerName: string;
  sellerSlug?: string | null;
  originZone: DeliveryZone | string;
  destinationZone: DeliveryZone;
  totalItems: number;
  weightBreakdown: PackageWeightBreakdown;
  subtotalPoisha: number;
  subtotalBdtFormatted: string;
  freeShippingThresholdPoisha: number | null;
  freeShippingThresholdBdtFormatted: string | null;
  qualifiesForFreeShipping: boolean;
  amountNeededForFreeShippingPoisha: number;
  amountNeededForFreeShippingBdtFormatted: string | null;
  selectedMethod: ShippingMethodCode;
  availableMethods: ShippingRateOptionDTO[];
  activeRate: ShippingRateOptionDTO;
  warnings: string[];
}

export interface OrderShippingQuoteDTO {
  destinationAddress: {
    divisionCode: string;
    district: string;
    upazila?: string | null;
    postalCode?: string | null;
    streetAddress?: string | null;
  };
  zone: DeliveryZone;
  sellerQuotes: SellerShippingQuoteDTO[];
  totalShippingFeePoisha: number;
  totalShippingFeeBdtFormatted: string;
  totalFreeShippingSavingsPoisha: number;
  totalFreeShippingSavingsBdtFormatted: string;
  overallDeliveryPromise: {
    earliestDeliveryDate: string;
    latestDeliveryDate: string;
    promiseTextEn: string;
    promiseTextBn: string;
  };
  allSellersCodAllowed: boolean;
  maxCodLimitPoisha: number;
  requiresPrepayment: boolean;
  appliedRuleVersion: string;
  quotedAt: string;
}

export interface ShippingRateRuleDTO {
  id: string;
  code: string;
  name: string;
  nameBn?: string | null;
  description?: string | null;
  shippingMethod: ShippingMethodCode;
  originZone: string;
  destinationZone: string;
  sellerId?: string | null;
  courierProvider?: string | null;
  baseRatePoisha: number;
  baseRateBdtFormatted: string;
  baseWeightGrams: number;
  incrementalWeightGrams: number;
  incrementalRatePoisha: number;
  incrementalRateBdtFormatted: string;
  freeShippingThresholdPoisha?: number | null;
  freeShippingThresholdBdtFormatted?: string | null;
  handlingDays: number;
  transitDaysMin: number;
  transitDaysMax: number;
  cutoffTime: string;
  isCodAllowed: boolean;
  maxCodAmountPoisha: number;
  fragileSurchargePoisha: number;
  heavySurchargePoisha: number;
  priority: number;
  isDefault: boolean;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  ruleVersion: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Pluggable Courier & Shipping Rate Provider SPI (Service Provider Interface).
 * Milestone 133 provides the contract and rule engine;
 * Milestone 134 implements Pathao, Steadfast, RedX, Paperfly, and In-House adapters.
 */
export interface ProviderRateRequest {
  originZone: DeliveryZone | string;
  destinationZone: DeliveryZone;
  destinationAddress: ShippingAddressInput;
  packageWeight: PackageWeightBreakdown;
  items: ShippingItemInput[];
  sellerSubtotalPoisha: number;
  sellerHandlingDays?: number;
  orderCutoffTime?: string;
  preferredMethod?: ShippingMethodCode;
  asOfDate?: Date;
}

export interface IShippingRateProvider {
  readonly providerCode: CourierProviderCode | string;
  readonly providerName: string;
  readonly isEnabled: boolean;

  calculateRates(request: ProviderRateRequest): Promise<ShippingRateOptionDTO[]>;
  estimatePromise(request: ProviderRateRequest): Promise<DeliveryPromiseSnapshotDTO>;
  isServiceable(address: ShippingAddressInput): Promise<boolean>;
}
