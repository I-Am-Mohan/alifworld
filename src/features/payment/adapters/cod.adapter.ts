/**
 * Cash on Delivery (COD) Payment Adapter
 *
 * Integrates with CodFraudRiskService (Milestone 137) to determine
 * COD eligibility, hard limits (> ৳50,000), OTP requirements, and digital gating.
 */

import {
  IPaymentGatewayAdapter,
  PaymentGatewayCode,
  PaymentMethodCategory,
  PaymentDiscoveryContext,
  PaymentMethodAvailabilityDTO,
} from '../types/payment-method.types';
import { BasePaymentAdapter } from './base-payment.adapter';
import { codFraudRiskService } from '@/features/checkout/services/cod-fraud-risk.service';

export class CodPaymentAdapter extends BasePaymentAdapter implements IPaymentGatewayAdapter {
  public readonly code: PaymentGatewayCode = 'COD';
  public readonly name = 'Cash on Delivery (COD)';
  public readonly category: PaymentMethodCategory = 'CASH_ON_DELIVERY';
  public readonly isEnabled = true;
  public readonly isConfigured = true;

  public async checkAvailability(
    context: PaymentDiscoveryContext
  ): Promise<PaymentMethodAvailabilityDTO> {
    const address = context.shippingAddress;
    const phone = address?.recipientPhone || '01700000000';

    const evaluation = await codFraudRiskService.evaluateCodEligibility(
      {
        recipientPhone: phone,
        orderSubtotalPoisha: context.orderSubtotalPoisha || context.orderTotalPoisha,
        division: address?.division || 'DHAKA',
        district: address?.district || 'Dhaka',
        upazila: address?.upazila || undefined,
        hasDigitalItems: context.hasDigitalItems,
        cartId: context.cartId || undefined,
      },
      context.customerId
    );

    let badgeTextEn = 'Pay on Delivery';
    let badgeTextBn = 'পণ্য হাতে পেয়ে পেমেন্ট';
    if (evaluation.requiresOtpVerification) {
      badgeTextEn = 'OTP Verified Delivery';
      badgeTextBn = 'ওটিপি যাচাইকৃত ডেলিভারি';
    }

    return this.createAvailabilityDTO({
      nameEn: 'Cash on Delivery',
      nameBn: 'ক্যাশ অন ডেলিভারি (হাতে পেয়ে মূল্য পরিশোধ)',
      isAvailable: evaluation.isEligible,
      isConfigured: true,
      unavailableReasonEn: !evaluation.isEligible
        ? evaluation.warnings[0] || 'Cash on Delivery is unavailable for this order.'
        : null,
      unavailableReasonBn: !evaluation.isEligible
        ? 'এই অর্ডারের জন্য ক্যাশ অন ডেলিভারি প্রযোজ্য নয়। ডিজিটাল পেমেন্ট করুন।'
        : null,
      feePercent: 0,
      feePoisha: 0,
      minAmountPoisha: 100, // ৳1.00
      maxAmountPoisha: evaluation.maxCodLimitPoisha,
      logoUrl: '/icons/payment/cod.svg',
      badgeTextEn,
      badgeTextBn,
      requiresRedirect: false,
      supportsDirectCheckout: true,
      supportsDeepLink: false,
    });
  }
}
