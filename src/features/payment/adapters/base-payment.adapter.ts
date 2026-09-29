/**
 * Base Bangladesh Payment Gateway Adapter
 *
 * Provides shared utilities for all payment gateway adapters:
 * 1. BDT currency formatting (৳...)
 * 2. Fee computation in integer poisha
 * 3. Standard availability response formatting
 */

import {
  PaymentGatewayCode,
  PaymentMethodCategory,
  PaymentDiscoveryContext,
  PaymentMethodAvailabilityDTO,
} from '../types/payment-method.types';

export abstract class BasePaymentAdapter {
  abstract readonly code: PaymentGatewayCode;
  abstract readonly name: string;
  abstract readonly category: PaymentMethodCategory;

  public formatBdt(poisha: bigint | number): string {
    const num = typeof poisha === 'bigint' ? Number(poisha) : poisha;
    const bdt = (num / 100).toLocaleString('en-BD', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `৳${bdt}`;
  }

  public calculateFee(amountPoisha: number): { feePoisha: number; feePercent: number } {
    return { feePoisha: 0, feePercent: 0 };
  }

  protected createAvailabilityDTO(params: {
    nameEn: string;
    nameBn: string;
    isAvailable: boolean;
    isConfigured: boolean;
    unavailableReasonEn?: string | null;
    unavailableReasonBn?: string | null;
    feePercent?: number;
    feePoisha?: number;
    minAmountPoisha?: number;
    maxAmountPoisha?: number;
    logoUrl: string;
    badgeTextEn?: string | null;
    badgeTextBn?: string | null;
    requiresRedirect?: boolean;
    supportsDirectCheckout?: boolean;
    supportsDeepLink?: boolean;
    userWalletBalancePoisha?: number | null;
    hasSufficientWalletBalance?: boolean;
  }): PaymentMethodAvailabilityDTO {
    const feePoisha = params.feePoisha ?? 0;
    const feePercent = params.feePercent ?? 0;

    return {
      code: this.code,
      nameEn: params.nameEn,
      nameBn: params.nameBn,
      category: this.category,
      isAvailable: params.isAvailable,
      isConfigured: params.isConfigured,
      unavailableReasonEn: params.unavailableReasonEn || null,
      unavailableReasonBn: params.unavailableReasonBn || null,
      feePercent,
      feePoisha,
      feeBdtFormatted: this.formatBdt(feePoisha),
      minAmountPoisha: params.minAmountPoisha ?? 100, // ৳1.00 minimum
      maxAmountPoisha: params.maxAmountPoisha ?? 5000000, // ৳50,000.00 default max
      logoUrl: params.logoUrl,
      badgeTextEn: params.badgeTextEn || null,
      badgeTextBn: params.badgeTextBn || null,
      requiresRedirect: params.requiresRedirect ?? true,
      supportsDirectCheckout: params.supportsDirectCheckout ?? false,
      supportsDeepLink: params.supportsDeepLink ?? false,
      userWalletBalancePoisha: params.userWalletBalancePoisha ?? null,
      userWalletBalanceBdtFormatted:
        params.userWalletBalancePoisha !== null && params.userWalletBalancePoisha !== undefined
          ? this.formatBdt(params.userWalletBalancePoisha)
          : null,
      hasSufficientWalletBalance: params.hasSufficientWalletBalance,
    };
  }
}
