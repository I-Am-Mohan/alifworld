/**
 * Cash on Delivery (COD) Fraud Risk & Eligibility Domain Contracts
 *
 * Invariant: BDT monetary values strictly in integer minor units (poisha).
 * Invariant: Phone numbers normalized to canonical Bangladesh E.164 (+8801XXXXXXXXX).
 * Invariant: Fraud risk engine evaluates RTO history, order velocity, value limits, and blacklists.
 */

export type CodRiskLevel =
  | 'APPROVED' // Low risk (0-30): Fast-track COD approved
  | 'OTP_REQUIRED' // Medium risk (31-65): SMS OTP verification required before commitment
  | 'PREPAYMENT_REQUIRED' // High risk / High value (66-85): Order exceeds limit or contains non-COD goods
  | 'BLOCKED'; // Extreme risk (86-100): Customer/Phone blacklisted or extreme RTO rate

export type RiskSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface CodRiskFactorDTO {
  factor:
    | 'ORDER_VALUE_LIMIT'
    | 'HIGH_VALUE_THRESHOLD'
    | 'DIGITAL_NON_PHYSICAL_GOODS'
    | 'CUSTOMER_RTO_HISTORY'
    | 'ORDER_VELOCITY_RAPID_FIRE'
    | 'UNVERIFIED_PHONE_NUMBER'
    | 'REMOTE_ZONE_RESTRICTION'
    | 'FRAUD_BLACKLIST_MATCH';
  score: number; // 0 - 100 impact
  severity: RiskSeverity;
  messageEn: string;
  messageBn: string;
}

export interface CodEligibilityEvaluationDTO {
  isEligible: boolean;
  riskLevel: CodRiskLevel;
  riskScore: number; // 0 to 100
  orderSubtotalPoisha: number;
  orderSubtotalBdtFormatted: string;
  maxCodLimitPoisha: number;
  maxCodLimitBdtFormatted: string;
  requiresOtpVerification: boolean;
  requiresPrepayment: boolean;
  isPhoneVerified: boolean;
  factors: CodRiskFactorDTO[];
  warnings: string[];
  policyVersion: string;
  evaluatedAt: string;
}

export interface CodPolicyConfigDTO {
  maxCodOrderValuePoisha: number; // e.g. 5,000,000 (৳50,000.00)
  maxCodOrderValueBdtFormatted: string;
  otpThresholdPoisha: number; // e.g. 1,000,000 (৳10,000.00)
  otpThresholdBdtFormatted: string;
  maxActivePendingCodOrders: number; // e.g. 3
  maxAllowedRtoRatePercent: number; // e.g. 30%
  minCompletedOrdersForTrusted: number; // e.g. 3
  isPhoneVerificationRequiredForNewUsers: boolean;
  policyVersion: string;
}

export interface SendCodOtpResultDTO {
  success: boolean;
  phone: string;
  maskedPhone: string;
  cooldownSeconds: number;
  expiresInSeconds: number;
  message: string;
}

export interface VerifyCodOtpResultDTO {
  verified: boolean;
  phone: string;
  verificationToken: string; // Token used to prove OTP completion during checkout
  message: string;
}

export interface CodBlacklistEntryDTO {
  id: string;
  type: 'PHONE' | 'EMAIL' | 'IP_ADDRESS' | 'DEVICE_FINGERPRINT';
  identifier: string;
  reason: string;
  severity: 'BLOCK' | 'OTP_REQUIRED' | 'FLAG';
  addedBy?: string | null;
  expiresAt?: string | null;
  createdAt: string;
}
