/**
 * SSLCommerz Payment Gateway Adapter (Cards & Net Banking)
 *
 * Implements SSLCommerz Hosted Checkout contract supporting
 * Visa, Mastercard, AMEX, UnionPay, and Bangladesh Internet Banking.
 */

import {
  IPaymentGatewayAdapter,
  PaymentGatewayCode,
  PaymentMethodCategory,
  PaymentDiscoveryContext,
  PaymentMethodAvailabilityDTO,
} from '../types/payment-method.types';
import { BasePaymentAdapter } from './base-payment.adapter';

export class SslCommerzPaymentAdapter extends BasePaymentAdapter implements IPaymentGatewayAdapter {
  public readonly code: PaymentGatewayCode = 'SSLCOMMERZ';
  public readonly name = 'Cards & Internet Banking (SSLCommerz)';
  public readonly category: PaymentMethodCategory = 'CARD';
  public readonly isEnabled = true;

  private storeId: string | null;

  constructor() {
    super();
    this.storeId = process.env.PAYMENT_SSLCOMMERZ_STORE_ID || null;
  }

  public get isConfigured(): boolean {
    return Boolean(this.storeId);
  }

  public async checkAvailability(
    context: PaymentDiscoveryContext
  ): Promise<PaymentMethodAvailabilityDTO> {
    const maxLimitPoisha = 50000000; // ৳500,000.00 max per transaction
    const isExceeded = context.orderTotalPoisha > maxLimitPoisha;

    return this.createAvailabilityDTO({
      nameEn: 'Cards & Internet Banking (Visa/Mastercard/Amex)',
      nameBn: 'কার্ড ও ইন্টারনেট ব্যাংকিং (ভিসা/মাস্টারকার্ড)',
      isAvailable: !isExceeded,
      isConfigured: this.isConfigured,
      unavailableReasonEn: isExceeded
        ? 'Maximum limit for card checkout is ৳500,000.00.'
        : null,
      unavailableReasonBn: isExceeded
        ? 'কার্ডের মাধ্যমে সর্বোচ্চ ৫০০,০০০ টাকা পেমেন্ট সম্ভব।'
        : null,
      feePercent: 0,
      feePoisha: 0,
      minAmountPoisha: 100, // ৳1.00
      maxAmountPoisha: maxLimitPoisha,
      logoUrl: '/icons/payment/cards.svg',
      badgeTextEn: 'Visa / Mastercard / Amex',
      badgeTextBn: 'ভিসা / মাস্টারকার্ড',
      requiresRedirect: true,
      supportsDirectCheckout: false,
      supportsDeepLink: false,
    });
  }
}
