/**
 * Canonical Domain Types & Ubiquitous Language for AlifWorld
 * Derived from docs/architecture/domain-glossary-and-ubiquitous-language.md
 */

/**
 * Monetary primitive representing integer poisha (1 BDT = 100 poisha).
 * Negative values indicate debit or deductions; positive values indicate credit.
 */
export type Poisha = number & { readonly __brand: unique symbol };

export function toPoisha(bdt: number): Poisha {
  return Math.round(bdt * 100) as Poisha;
}

export function fromPoisha(poisha: Poisha): number {
  return poisha / 100;
}

/**
 * Discrete Product Points (PP). Non-convertible loyalty metric.
 */
export type ProductPoint = number & { readonly __brand: unique symbol };

export function toProductPoint(points: number): ProductPoint {
  if (!Number.isInteger(points) || points < 0) {
    throw new Error(`Invalid ProductPoint value: ${points}. Must be a non-negative integer.`);
  }
  return points as ProductPoint;
}

/**
 * Standardized Wallet Account Types
 */
export enum WalletAccountType {
  MAIN_WITHDRAWABLE = 'MAIN_WITHDRAWABLE',
  SHOPPING_RESTRICTED = 'SHOPPING_RESTRICTED',
  CUSTOMER_CLUB_POOL = 'CUSTOMER_CLUB_POOL',
  SELLER_CLUB_POOL = 'SELLER_CLUB_POOL',
  REFERRAL_RESERVE = 'REFERRAL_RESERVE',
  CHARITY_FUND = 'CHARITY_FUND',
  PLATFORM_RESERVE = 'PLATFORM_RESERVE',
  ESCROW = 'ESCROW',
  ADVANCED_SHOPPING = 'ADVANCED_SHOPPING', // Gated by GATE-05
  GOOD_LUCK_LOTTERY = 'GOOD_LUCK_LOTTERY', // Gated by GATE-07
}

/**
 * Standardized Club Cadence Cycles
 */
export enum ClubPeriodCadence {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

/**
 * Standardized Order Lifecycle States
 */
export enum OrderStatus {
  PLACED = 'PLACED',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  PACKED = 'PACKED',
  HANDED_OVER = 'HANDED_OVER',
  IN_TRANSIT = 'IN_TRANSIT',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  COMPLETED = 'COMPLETED', // Eligible order status for point maturation
  CANCELLED = 'CANCELLED',
  RETURN_REQUESTED = 'RETURN_REQUESTED',
  RETURNED = 'RETURNED',
}

/**
 * Seller KYC Verification States
 */
export enum SellerKycStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SUSPENDED = 'SUSPENDED',
}

/**
 * Geographic Commission Beneficiary Tiers
 */
export enum GeographicHierarchyTier {
  DIVISION = 'DIVISION',
  DISTRICT = 'DISTRICT',
  UPAZILA = 'UPAZILA',
  SERVICE_POINT = 'SERVICE_POINT',
}
