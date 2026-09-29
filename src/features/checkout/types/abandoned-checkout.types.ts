/**
 * Abandoned Checkout Recovery Domain Types & Contracts
 *
 * Invariant: BDT monetary values strictly in integer minor units (poisha).
 * Invariant: Recovery revalidation enforces server-side stock, price, and merchant status checks.
 * Invariant: Recovery tokens are single-use, cryptographic, and expire according to policy.
 */

export type AbandonedCheckoutStatus =
  | 'ABANDONED'
  | 'NOTIFIED'
  | 'RECOVERED'
  | 'EXPIRED';

export interface AbandonedCheckoutDTO {
  id: string;
  cartId: string;
  recoveryToken: string;
  recoveryUrl: string;
  customerId?: string | null;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  recipientPhoneMasked?: string | null;
  savedAddress?: Record<string, unknown> | null;
  totalPoisha: number;
  totalBdtFormatted: string;
  itemCount: number;
  incentiveCouponCode?: string | null;
  recoveryStatus: AbandonedCheckoutStatus;
  notifiedAt?: string | null;
  recoveredAt?: string | null;
  recoveredOrderId?: string | null;
  expiresAt: string;
  createdAt: string;
  cart?: {
    itemsCount: number;
    currency: 'BDT';
    isB2B: boolean;
  } | null;
}

export interface RecoverCartResultDTO {
  success: boolean;
  cartId: string;
  recoveryToken: string;
  itemsCount: number;
  revalidation: {
    hasPriceChanges: boolean;
    priceChangesCount: number;
    hasOutOfStock: boolean;
    outOfStockCount: number;
    hasSellerIssues: boolean;
    warnings: string[];
  };
  subtotalPoisha: number;
  subtotalBdtFormatted: string;
  appliedCouponCode?: string | null;
  savedAddress?: Record<string, unknown> | null;
  restoredAt: string;
}

export interface MarkCartAbandonedParams {
  cartId: string;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  savedAddress?: Record<string, unknown> | null;
  incentiveCouponCode?: string | null;
  expiresInHours?: number; // default 72 hours
}
