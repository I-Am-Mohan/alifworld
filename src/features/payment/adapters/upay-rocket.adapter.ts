/**
 * Upay & Rocket Mobile Financial Services Adapters
 */

import {
  IPaymentGatewayAdapter,
  PaymentGatewayCode,
  PaymentMethodCategory,
  PaymentDiscoveryContext,
  PaymentMethodAvailabilityDTO,
} from '../types/payment-method.types';
import { BasePaymentAdapter } from './base-payment.adapter';

export class UpayPaymentAdapter extends BasePaymentAdapter implements IPaymentGatewayAdapter {
  public readonly code: PaymentGatewayCode = 'UPAY';
  public readonly name = 'Upay Payment';
  public readonly category: PaymentMethodCategory = 'MFS';
  public readonly isEnabled = true;
  public readonly isConfigured = Boolean(process.env.PAYMENT_UPAY_MERCHANT_ID);

  public async checkAvailability(
    context: PaymentDiscoveryContext
  ): Promise<PaymentMethodAvailabilityDTO> {
    const maxLimitPoisha = 2500000;
    const isExceeded = context.orderTotalPoisha > maxLimitPoisha;

    return this.createAvailabilityDTO({
      nameEn: 'Upay MFS',
      nameBn: 'উপায় এমএফএস',
      isAvailable: !isExceeded,
      isConfigured: this.isConfigured,
      feePercent: 0,
      feePoisha: 0,
      minAmountPoisha: 100,
      maxAmountPoisha: maxLimitPoisha,
      logoUrl: '/icons/payment/upay.svg',
      badgeTextEn: 'UCB Upay',
      badgeTextBn: 'ইউসিবি উপায়',
      requiresRedirect: true,
      supportsDirectCheckout: true,
      supportsDeepLink: false,
    });
  }
}

export class RocketPaymentAdapter extends BasePaymentAdapter implements IPaymentGatewayAdapter {
  public readonly code: PaymentGatewayCode = 'ROCKET';
  public readonly name = 'DBBL Rocket';
  public readonly category: PaymentMethodCategory = 'MFS';
  public readonly isEnabled = true;
  public readonly isConfigured = Boolean(process.env.PAYMENT_ROCKET_MERCHANT_ID);

  public async checkAvailability(
    context: PaymentDiscoveryContext
  ): Promise<PaymentMethodAvailabilityDTO> {
    const maxLimitPoisha = 2500000;
    const isExceeded = context.orderTotalPoisha > maxLimitPoisha;

    return this.createAvailabilityDTO({
      nameEn: 'Rocket (Dutch-Bangla Bank)',
      nameBn: 'রকেট (ডাচ-বাংলা ব্যাংক)',
      isAvailable: !isExceeded,
      isConfigured: this.isConfigured,
      feePercent: 0,
      feePoisha: 0,
      minAmountPoisha: 100,
      maxAmountPoisha: maxLimitPoisha,
      logoUrl: '/icons/payment/rocket.svg',
      badgeTextEn: 'DBBL MFS',
      badgeTextBn: 'ডিবিবিএল রকেট',
      requiresRedirect: true,
      supportsDirectCheckout: true,
      supportsDeepLink: false,
    });
  }
}
