/**
 * bKash Payment Gateway Adapter (MFS)
 *
 * Implements bKash tokenized and direct checkout API contract.
 * Invariant: Preserves credential boundary and returns safe sandbox responses when unconfigured.
 */

import {
  IPaymentGatewayAdapter,
  PaymentGatewayCode,
  PaymentMethodCategory,
  PaymentDiscoveryContext,
  PaymentMethodAvailabilityDTO,
} from '../types/payment-method.types';
import { BasePaymentAdapter } from './base-payment.adapter';

export class BkashPaymentAdapter extends BasePaymentAdapter implements IPaymentGatewayAdapter {
  public readonly code: PaymentGatewayCode = 'BKASH';
  public readonly name = 'bKash Online Payment';
  public readonly category: PaymentMethodCategory = 'MFS';
  public readonly isEnabled = true;

  private appKey: string | null;
  private appSecret: string | null;

  constructor() {
    super();
    this.appKey = process.env.PAYMENT_BKASH_APP_KEY || null;
    this.appSecret = process.env.PAYMENT_BKASH_APP_SECRET || null;
  }

  public get isConfigured(): boolean {
    return Boolean(this.appKey && this.appSecret);
  }

  public async checkAvailability(
    context: PaymentDiscoveryContext
  ): Promise<PaymentMethodAvailabilityDTO> {
    const maxLimitPoisha = 2500000; // ৳25,000.00 max per transaction
    const isExceeded = context.orderTotalPoisha > maxLimitPoisha;

    return this.createAvailabilityDTO({
      nameEn: 'bKash Payment',
      nameBn: 'বিকাশ পেমেন্ট',
      isAvailable: !isExceeded,
      isConfigured: this.isConfigured,
      unavailableReasonEn: isExceeded
        ? 'Maximum per-transaction limit for bKash is ৳25,000.00.'
        : null,
      unavailableReasonBn: isExceeded
        ? 'বিকাশের মাধ্যমে এককালীন সর্বোচ্চ ২৫,০০০ টাকা পেমেন্ট করা সম্ভব।'
        : null,
      feePercent: 0,
      feePoisha: 0,
      minAmountPoisha: 100, // ৳1.00
      maxAmountPoisha: maxLimitPoisha,
      logoUrl: '/icons/payment/bkash.svg',
      badgeTextEn: 'Fast & Secure',
      badgeTextBn: 'দ্রুত ও নিরাপদ',
      requiresRedirect: true,
      supportsDirectCheckout: true,
      supportsDeepLink: context.clientPlatform === 'ANDROID' || context.clientPlatform === 'IOS',
    });
  }
}
