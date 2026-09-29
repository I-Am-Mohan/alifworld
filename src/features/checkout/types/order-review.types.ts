/**
 * Final Order Review, Consent, and Place-Order Domain Contracts
 *
 * Invariant: BDT monetary values strictly in integer minor units (poisha).
 * Invariant: Product Points are independent discrete loyalty units.
 * Invariant: Explicit customer consent (Terms, Privacy, Return Policy, COD) is mandatory.
 * Invariant: All place-order mutations require an idempotency key.
 */

export interface CustomerConsentInputDTO {
  termsAccepted: boolean;
  termsVersion: string; // e.g. "v2026.1"
  privacyAccepted: boolean;
  privacyVersion: string; // e.g. "v2026.1"
  returnPolicyAccepted: boolean;
  returnPolicyVersion: string; // e.g. "v2026.1"
  codAgreementAccepted?: boolean; // Required if paymentMethod is COD
  marketingConsent?: boolean;
}

export interface OrderReviewRecipientDTO {
  name: string;
  phone: string;
  phoneMasked: string;
  division: string;
  district: string;
  upazila?: string | null;
  address: string;
  postalCode?: string | null;
}

export interface OrderReviewItemDTO {
  variantId: string;
  productTitle: string;
  variantTitle: string;
  sku: string;
  unitPricePoisha: number;
  unitPriceBdtFormatted: string;
  quantity: number;
  lineTotalPoisha: number;
  lineTotalBdtFormatted: string;
  productPointSnapshot: number;
  totalProductPoints: number;
  imageUrl?: string | null;
}

export interface OrderReviewSellerPackageDTO {
  sellerId: string;
  sellerName: string;
  sellerSlug?: string | null;
  packageNumber: number;
  courierProvider: string;
  estimatedDeliveryMinDays: number;
  estimatedDeliveryMaxDays: number;
  deliveryPromiseText: string;
  subtotalPoisha: number;
  subtotalBdtFormatted: string;
  shippingFeePoisha: number;
  shippingFeeBdtFormatted: string;
  isFreeShipping: boolean;
  taxPoisha: number;
  taxBdtFormatted: string;
  totalPoisha: number;
  totalBdtFormatted: string;
  totalProductPoints: number;
  items: OrderReviewItemDTO[];
}

export interface OrderReviewFinancialSummaryDTO {
  subtotalPoisha: number;
  subtotalBdtFormatted: string;
  discountPoisha: number;
  sellerDiscountPoisha: number;
  platformDiscountPoisha: number;
  discountBdtFormatted: string;
  couponCode?: string | null;
  shippingFeePoisha: number;
  shippingFeeBdtFormatted: string;
  taxPoisha: number;
  taxBdtFormatted: string;
  totalPoisha: number;
  totalBdtFormatted: string;
  totalProductPoints: number;
  currency: 'BDT';
}

export interface RequiredConsentDeclarationDTO {
  type: 'TERMS' | 'PRIVACY' | 'RETURN_POLICY' | 'COD_AGREEMENT';
  titleEn: string;
  titleBn: string;
  version: string;
  summaryEn: string;
  summaryBn: string;
  linkUrl: string;
  isRequired: boolean;
}

export interface OrderReviewDTO {
  cartId: string;
  cartVersion: number;
  reviewFingerprint: string;
  recipient: OrderReviewRecipientDTO;
  packages: OrderReviewSellerPackageDTO[];
  financials: OrderReviewFinancialSummaryDTO;
  selectedPaymentMethod: string;
  paymentInstructions: {
    en: string;
    bn: string;
  };
  requiredConsents: RequiredConsentDeclarationDTO[];
  readiness: {
    canPlaceOrder: boolean;
    blockingReasons: string[];
    requiresCodOtp: boolean;
  };
  generatedAt: string;
}

export interface PlaceOrderRequestDTO {
  cartId: string;
  reviewFingerprint?: string | null;
  recipient: {
    name: string;
    phone: string;
    division: string;
    district: string;
    upazila?: string | null;
    address: string;
    postalCode?: string | null;
    customerNotes?: string | null;
    purchaseOrderRef?: string | null;
  };
  paymentMethod: string;
  codVerificationToken?: string | null;
  couponCode?: string | null;
  consent: CustomerConsentInputDTO;
  idempotencyKey: string;
}

export interface PlacedOrderResultDTO {
  orderId: string;
  orderNumber: string;
  customerId: string;
  status: string; // PENDING_PAYMENT, PROCESSING
  paymentStatus: string; // UNPAID, PAID
  fulfillmentStatus: string; // UNFULFILLED
  currency: 'BDT';
  financialSummary: {
    subtotalPoisha: number;
    subtotalBdtFormatted: string;
    discountPoisha: number;
    discountBdtFormatted: string;
    shippingFeePoisha: number;
    shippingFeeBdtFormatted: string;
    taxPoisha: number;
    taxBdtFormatted: string;
    totalPoisha: number;
    totalBdtFormatted: string;
    totalProductPoints: number;
  };
  payment: {
    paymentMethod: string;
    paymentNumber: string;
    status: string;
    requiresRedirect: boolean;
    redirectUrl?: string | null;
    instructionsEn: string;
    instructionsBn: string;
  };
  fulfillmentPackagesCount: number;
  consentSnapshot: {
    termsVersion: string;
    privacyVersion: string;
    returnPolicyVersion: string;
    acceptedAt: string;
  };
  isIdempotentReplay: boolean;
  placedAt: string;
}
