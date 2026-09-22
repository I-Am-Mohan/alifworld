/**
 * Canonical Domain Types & Ubiquitous Language for AlifWorld
 * Derived from docs/architecture/domain-glossary-and-ubiquitous-language.md
 */

/**
 * Monetary primitive representing integer poisha (1 BDT = 100 poisha).
 * BigInt prevents precision loss for large balances and financial snapshots.
 * Negative values indicate debit or deductions; positive values indicate credit.
 */
export type Poisha = bigint & { readonly __brand: unique symbol };

/**
 * Parses a BDT major-unit amount without floating-point arithmetic.
 * At most two fractional digits are accepted because BDT has two minor units.
 */
export function toPoisha(bdt: string | number | bigint): Poisha {
  if (typeof bdt === 'bigint') return bdt as Poisha;

  const raw = typeof bdt === 'number' ? String(bdt) : bdt.trim();
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(raw)) {
    throw new Error(`Invalid BDT currency input: ${bdt}`);
  }

  const negative = raw.startsWith('-');
  const unsigned = negative ? raw.slice(1) : raw;
  const [whole, fraction = ''] = unsigned.split('.');
  const poisha = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  return (negative ? -poisha : poisha) as Poisha;
}

/** Returns an exact decimal string; no floating-point conversion is performed. */
export function fromPoisha(poisha: Poisha | bigint): string {
  const value = BigInt(poisha);
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const whole = absolute / 100n;
  const fraction = (absolute % 100n).toString().padStart(2, '0');
  return `${negative ? '-' : ''}${whole}.${fraction}`;
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
