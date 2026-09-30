/**
 * Address Validation & Delivery Serviceability Types & Contracts
 *
 * Invariant: Comprehensive 8-division Bangladesh administrative hierarchy.
 * Invariant: Multi-courier coverage evaluation (Pathao, Steadfast, RedX, Paperfly, In-House).
 * Invariant: Zone-based serviceability (Metro Dhaka, Suburbs, Major Cities, Remote Upazilas).
 * Invariant: Strict COD thresholds (orders above maximum limit require digital prepayment).
 */

export type BangladeshDivisionCode =
  'DHAKA' | 'CHITTAGONG' | 'RAJSHAHI' | 'KHULNA' | 'BARISAL' | 'SYLHET' | 'RANGPUR' | 'MYMENSINGH';

export type DeliveryZone = 'METRO_DHAKA' | 'DHAKA_SUBURBS' | 'MAJOR_CITIES' | 'REMOTE_UPAZILA';

export type CourierProviderCode = 'PATHAO' | 'STEADFAST' | 'REDX' | 'PAPERFLY' | 'IN_HOUSE';

export interface DeliveryCourierOptionDTO {
  courierCode: CourierProviderCode;
  courierName: string;
  isAvailable: boolean;
  isCodSupported: boolean;
  maxCodAmountPoisha: number;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  shippingFeePoisha: number;
  shippingFeeBdtFormatted: string;
}

export interface AddressServiceabilityResultDTO {
  isServiceable: boolean;
  normalizedAddress: {
    divisionCode: BangladeshDivisionCode;
    divisionNameEn: string;
    divisionNameBn: string;
    districtNameEn: string;
    districtNameBn: string;
    upazilaNameEn?: string | null;
    upazilaNameBn?: string | null;
    postalCode?: string | null;
    streetAddress: string;
  };
  zone: DeliveryZone;
  zoneLabelEn: string;
  zoneLabelBn: string;
  primaryCourier: CourierProviderCode;
  availableCouriers: DeliveryCourierOptionDTO[];
  isCodAvailable: boolean;
  maxCodLimitPoisha: number;
  requiresPrepayment: boolean;
  estimatedDeliveryMinDays: number;
  estimatedDeliveryMaxDays: number;
  estimatedDeliveryPromiseTextEn: string;
  estimatedDeliveryPromiseTextBn: string;
  baseShippingFeePoisha: number;
  baseShippingFeeBdtFormatted: string;
  warnings: string[];
}

export interface GeoDivisionDTO {
  code: BangladeshDivisionCode;
  nameEn: string;
  nameBn: string;
  headquarters: string;
}

export interface GeoDistrictDTO {
  id: string;
  divisionCode: BangladeshDivisionCode;
  nameEn: string;
  nameBn: string;
  postalCodePrefix: string;
}

export interface GeoUpazilaDTO {
  id: string;
  districtId: string;
  nameEn: string;
  nameBn: string;
  postalCode?: string | null;
  level: string;
}
