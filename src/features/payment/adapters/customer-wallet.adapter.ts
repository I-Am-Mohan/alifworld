/**
 * AlifWorld Customer Wallet Payment Adapter
 *
 * Implements instant zero-fee settlement using customer's active wallet balance.
 */

import { prisma } from '@/shared/database/prisma';
import {
  IPaymentGatewayAdapter,
  PaymentGatewayCode,
  PaymentMethodCategory,
  PaymentDiscoveryContext,
  PaymentMethodAvailabilityDTO,
} from '../types/payment-method.types';
import { BasePaymentAdapter } from './base-payment.adapter';

export class CustomerWalletPaymentAdapter
  extends BasePaymentAdapter
  implements IPaymentGatewayAdapter
{
  public readonly code: PaymentGatewayCode = 'CUSTOMER_WALLET';
  public readonly name = 'AlifWorld Customer Wallet';
  public readonly category: PaymentMethodCategory = 'WALLET';
  public readonly isEnabled = true;
  public readonly isConfigured = true;

  private db = prisma;

  public async checkAvailability(
    context: PaymentDiscoveryContext
  ): Promise<PaymentMethodAvailabilityDTO> {
    if (!context.customerId) {
      return this.createAvailabilityDTO({
        nameEn: 'AlifWorld Wallet Balance',
        nameBn: 'আলিফওয়ার্ল্ড ওয়ালেট ব্যালেন্স',
        isAvailable: false,
        isConfigured: true,
        unavailableReasonEn: 'Please log in to pay using your AlifWorld Wallet balance.',
        unavailableReasonBn: 'ওয়ালেট ব্যালেন্সের মাধ্যমে পেমেন্ট করতে অনুগ্রহ করে লগইন করুন।',
        feePercent: 0,
        feePoisha: 0,
        logoUrl: '/icons/payment/wallet.svg',
        badgeTextEn: 'Instant 0% Fee',
        badgeTextBn: 'ইনস্ট্যান্ট ০% চার্জ',
        requiresRedirect: false,
        supportsDirectCheckout: true,
        supportsDeepLink: false,
        userWalletBalancePoisha: null,
        hasSufficientWalletBalance: false,
      });
    }

    // Fetch user's active MAIN wallet balance
    const balancePoisha = await this.getWalletBalance(context.customerId);
    const hasSufficientBalance = balancePoisha >= context.orderTotalPoisha;

    return this.createAvailabilityDTO({
      nameEn: 'AlifWorld Wallet Balance',
      nameBn: 'আলিফওয়ার্ল্ড ওয়ালেট ব্যালেন্স',
      isAvailable: hasSufficientBalance,
      isConfigured: true,
      unavailableReasonEn: !hasSufficientBalance
        ? `Insufficient wallet balance (Available: ${this.formatBdt(balancePoisha)}, Total: ${this.formatBdt(context.orderTotalPoisha)}).`
        : null,
      unavailableReasonBn: !hasSufficientBalance
        ? `ওয়ালেটে পর্যাপ্ত ব্যালেন্স নেই (বর্তমান: ${this.formatBdt(balancePoisha)}, মোট: ${this.formatBdt(context.orderTotalPoisha)})।`
        : null,
      feePercent: 0,
      feePoisha: 0,
      minAmountPoisha: 100,
      maxAmountPoisha: 10000000,
      logoUrl: '/icons/payment/wallet.svg',
      badgeTextEn: '1-Click Instant Pay',
      badgeTextBn: '১-ক্লিক ইনস্ট্যান্ট পেমেন্ট',
      requiresRedirect: false,
      supportsDirectCheckout: true,
      supportsDeepLink: false,
      userWalletBalancePoisha: balancePoisha,
      hasSufficientWalletBalance: hasSufficientBalance,
    });
  }

  /**
   * Retrieves active wallet balance in poisha for a customer.
   */
  public async getWalletBalance(userId: string): Promise<number> {
    try {
      const wallet = await (this.db as any).wallet.findFirst({
        where: {
          userId,
          type: 'MAIN',
          status: 'ACTIVE',
        },
      });
      return Number(wallet?.availablePoisha || 0);
    } catch {
      return 0;
    }
  }
}
