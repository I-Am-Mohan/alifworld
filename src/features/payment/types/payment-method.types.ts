/**
 * Payment Method Discovery & Selection Domain Contracts
 *
 * Invariant: BDT monetary values strictly in integer minor units (poisha).
 * Invariant: Supported gateways: bKash, Nagad, Upay, Rocket, SSLCommerz, Cash on Delivery, and Customer Wallet.
 * Invariant: Missing gateway credentials produce a safe disabled-state response without crashing.
 * Invariant: Webhook events verified cryptographically and deduplicated against PaymentWebhookLog.
 */

export type PaymentGatewayCode =
  'BKASH' | 'NAGAD' | 'UPAY' | 'ROCKET' | 'SSLCOMMERZ' | 'COD' | 'CUSTOMER_WALLET';

export type PaymentMethodCategory =
  'MFS' | 'CARD' | 'INTERNET_BANKING' | 'CASH_ON_DELIVERY' | 'WALLET';

export interface PaymentMethodAvailabilityDTO {
  code: PaymentGatewayCode;
  nameEn: string;
  nameBn: string;
  category: PaymentMethodCategory;
  isAvailable: boolean;
  isConfigured: boolean;
  unavailableReasonEn?: string | null;
  unavailableReasonBn?: string | null;
  feePercent: number; // e.g. 0.0 or 1.5%
  feePoisha: number; // computed fee in integer poisha
  feeBdtFormatted: string;
  minAmountPoisha: number;
  maxAmountPoisha: number;
  logoUrl: string;
  badgeTextEn?: string | null;
  badgeTextBn?: string | null;
  requiresRedirect: boolean;
  supportsDirectCheckout: boolean;
  supportsDeepLink: boolean;
  userWalletBalancePoisha?: number | null;
  userWalletBalanceBdtFormatted?: string | null;
  hasSufficientWalletBalance?: boolean;
}

export interface PaymentDiscoveryContext {
  orderTotalPoisha: number;
  orderSubtotalPoisha: number;
  currency: 'BDT';
  shippingAddress?: {
    division: string;
    district: string;
    upazila?: string | null;
    recipientPhone?: string | null;
  } | null;
  hasDigitalItems: boolean;
  customerId?: string | null;
  cartId?: string | null;
  clientPlatform?: 'WEB' | 'ANDROID' | 'IOS' | 'FLUTTER';
}

export interface PaymentDiscoveryResultDTO {
  orderTotalPoisha: number;
  orderTotalBdtFormatted: string;
  currency: 'BDT';
  availableMethods: PaymentMethodAvailabilityDTO[];
  unavailableMethods: PaymentMethodAvailabilityDTO[];
  recommendedMethod: PaymentGatewayCode;
  codEligibility?: {
    isEligible: boolean;
    riskLevel: string;
    requiresOtp: boolean;
    message: string;
  } | null;
  walletStatus?: {
    hasWallet: boolean;
    availablePoisha: number;
    availableBdtFormatted: string;
    canCoverFullOrder: boolean;
  } | null;
  discoveredAt: string;
}

export interface SelectPaymentMethodRequest {
  cartId?: string | null;
  orderId?: string | null;
  paymentMethod: PaymentGatewayCode;
  codVerificationToken?: string | null;
  walletType?: 'MAIN' | 'SHOPPING';
  clientReturnUrl?: string | null;
}

export interface SelectPaymentMethodResultDTO {
  success: boolean;
  paymentMethod: PaymentGatewayCode;
  methodName: string;
  orderTotalPoisha: number;
  feePoisha: number;
  grandPayablePoisha: number;
  grandPayableBdtFormatted: string;
  requiresAction: boolean;
  actionType: 'REDIRECT' | 'POPUP' | 'OTP_CHALLENGE' | 'INSTANT_SETTLEMENT' | 'NONE';
  redirectUrl?: string | null;
  instructionsEn: string;
  instructionsBn: string;
}

export interface IPaymentGatewayAdapter {
  readonly code: PaymentGatewayCode;
  readonly name: string;
  readonly category: PaymentMethodCategory;
  readonly isEnabled: boolean;
  readonly isConfigured: boolean;

  checkAvailability(context: PaymentDiscoveryContext): Promise<PaymentMethodAvailabilityDTO>;

  calculateFee(amountPoisha: number): { feePoisha: number; feePercent: number };

  verifyWebhookSignature?(rawBody: string, headers: Record<string, string>): boolean;

  parseWebhookPayload?(
    payload: unknown,
    headers?: Record<string, string>
  ): Promise<{
    externalEventId?: string;
    gatewayTransactionId?: string;
    orderId?: string;
    paymentNumber?: string;
    amountPoisha: number;
    status: 'AUTHORIZED' | 'CAPTURED' | 'FAILED' | 'CANCELLED';
    rawPayload: Record<string, unknown>;
  }>;
}
