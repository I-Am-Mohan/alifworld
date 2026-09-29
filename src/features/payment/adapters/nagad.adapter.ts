/**
 * Nagad Payment Gateway Adapter (MFS)
 *
 * Implements Nagad mobile payment contract with encryption boundaries.
 */

import {
  IPaymentGatewayAdapter,
  PaymentGatewayCode,
  PaymentMethodCategory,
  PaymentDiscoveryContext,
  PaymentMethodAvailabilityDTO,
} from '../types/payment-method.types';
import { BasePaymentAdapter } from './base-payment.adapter';

export class NagadPaymentAdapter extends BasePaymentAdapter implements IPaymentGatewayAdapter {
  public readonly code: PaymentGatewayCode = 'NAGAD';
  public readonly name = 'Nagad Payment Gateway';
  public readonly category: PaymentMethodCategory = 'MFS';
  public readonly isEnabled = true;

  private merchantId: string | null;

  constructor() {
    super();
    this.merchantId = process.env.PAYMENT_NAGAD_MERCHANT_ID || null;
  }

  public get isConfigured(): boolean {
    return Boolean(this.merchantId);
  }

  public async checkAvailability(
    context: PaymentDiscoveryContext
  ): Promise<PaymentMethodAvailabilityDTO> {
    const maxLimitPoisha = 5000000; // ৳50,000.00 max per transaction
    const isExceeded = context.orderTotalPoisha > maxLimitPoisha;

    return this.createAvailabilityDTO({
      nameEn: 'Nagad Payment',
      nameBn: 'নগদ পেমেন্ট',
      isAvailable: !isExceeded,
      isConfigured: this.isConfigured,
      unavailableReasonEn: isExceeded
        ? 'Maximum per-transaction limit for Nagad is ৳50,000.00.'
        : null,
      unavailableReasonBn: isExceeded
        ? 'নগদের মাধ্যমে এককালীন সর্বোচ্চ ৫০,০০০ টাকা পেমেন্ট করা সম্ভব।'
        : null,
      feePercent: 0,
      feePoisha: 0,
      minAmountPoisha: 100, // ৳1.00
      maxAmountPoisha: maxLimitPoisha,
      logoUrl: '/icons/payment/nagad.svg',
      badgeTextEn: 'Direct MFS',
      badgeTextBn: 'ডাইরেক্ট এমএফএস',
      requiresRedirect: true,
      supportsDirectCheckout: true,
      supportsDeepLink: context.clientPlatform === 'ANDROID' || context.clientPlatform === 'IOS',
    });
  }
}
