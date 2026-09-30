/**
 * Authoritative Final Order Review Domain Service
 *
 * Implements:
 * 1. Complete pre-placement order review compilation
 * 2. Multi-vendor seller fulfillment package aggregation
 * 3. Authoritative server-side financial calculations (NBR VAT, shipping, discounts, discrete Product Points)
 * 4. Payment method readiness and instructions mapping (bKash, Nagad, SSLCommerz, COD, Wallet)
 * 5. Mandatory regulatory and legal consent declarations (Terms, Privacy, Return Policy, COD)
 * 6. Cryptographic review fingerprinting to detect mid-review price/stock changes
 *
 * Invariant: BDT monetary values strictly represented in integer poisha.
 * Invariant: Product Points are independent discrete units with no fiat conversion.
 */

import { createHash } from 'crypto';
import { prisma } from '@/shared/database/prisma';
import { NotFoundError, ValidationError, AuthorizationError } from '@/shared/errors/app-error';
import { normalizeBangladeshPhone, maskBangladeshPhone } from '@/shared/utils/phone';
import {
  OrderReviewDTO,
  OrderReviewSellerPackageDTO,
  OrderReviewItemDTO,
  RequiredConsentDeclarationDTO,
} from '../types/order-review.types';
import { GenerateOrderReviewInput } from '../validators/order-review.validators';
import { serverCheckoutCalculationService } from './server-checkout-calculation.service';
import { codFraudRiskService } from './cod-fraud-risk.service';
import { paymentMethodDiscoveryService } from '@/features/payment/services/payment-method-discovery.service';

const CURRENT_TERMS_VERSION = 'v2026.1';
const CURRENT_PRIVACY_VERSION = 'v2026.1';
const CURRENT_RETURN_POLICY_VERSION = 'v2026.1';
const CURRENT_COD_AGREEMENT_VERSION = 'v2026.1';

export class FinalOrderReviewService {
  private db = prisma;
  private calculationService = serverCheckoutCalculationService;

  /**
   * Compiles the comprehensive order review and consent declaration before placement.
   */
  public async generateOrderReview(
    input: GenerateOrderReviewInput,
    customerId?: string | null
  ): Promise<OrderReviewDTO> {
    const { cartId, recipient, paymentMethod, couponCode, codVerificationToken } = input;

    // 1. Fetch Cart and Verify Status & Ownership
    const cart = await (this.db as any).cart.findFirst({
      where: { id: cartId, deletedAt: null },
      include: {
        items: {
          where: { deletedAt: null },
          include: {
            variant: {
              include: {
                product: { include: { seller: true } },
              },
            },
          },
        },
      },
    });

    if (!cart) {
      throw new NotFoundError(`Shopping cart '${cartId}' not found.`);
    }

    if (cart.userId && customerId && cart.userId !== customerId) {
      throw new AuthorizationError('You do not have permission to review this cart.', {
        code: 'OWNERSHIP_VIOLATION',
      });
    }

    if (cart.items.length === 0) {
      throw new ValidationError('Cannot review an empty shopping cart.');
    }

    if (cart.status !== 'ACTIVE') {
      throw new ValidationError(`Cart is in status '${cart.status}' and cannot be checked out.`);
    }

    // 2. Normalize Recipient Phone
    const normalizedPhone = normalizeBangladeshPhone(recipient.phone);
    const maskedPhone = maskBangladeshPhone(normalizedPhone);

    // 3. Authoritative Server-Side Calculation (Pricing, Discounts, VAT, Shipping, Points)
    const calculation = await this.calculationService.calculateCheckout(
      {
        cartId: cart.id,
        shippingAddress: {
          division: recipient.division,
          district: recipient.district,
          upazila: recipient.upazila,
          postalCode: recipient.postalCode,
          streetAddress: recipient.address,
        },
        couponCode: couponCode || cart.appliedCouponCode || undefined,
        shippingMethod: 'STANDARD',
      },
      { customerId }
    );

    // 4. Map Multi-Vendor Seller Packages
    const packages: OrderReviewSellerPackageDTO[] = calculation.sellerGroups.map((group, idx) => {
      const isInsideDhaka = recipient.division.toUpperCase() === 'DHAKA';
      const minDays = isInsideDhaka ? 1 : 2;
      const maxDays = isInsideDhaka ? 2 : 4;
      const promiseText = isInsideDhaka
        ? '1-2 Business Days (Dhaka Metro Express)'
        : '2-4 Business Days (Nationwide Delivery)';

      const items: OrderReviewItemDTO[] = group.items.map((i) => ({
        variantId: i.variantId,
        productTitle: i.productTitle,
        variantTitle: i.variantTitle,
        sku: i.sku,
        unitPricePoisha: i.unitPricePoisha,
        unitPriceBdtFormatted: i.unitPriceBdtFormatted,
        quantity: i.quantity,
        lineTotalPoisha: i.lineTotalPoisha,
        lineTotalBdtFormatted: i.lineTotalBdtFormatted,
        productPointSnapshot: i.productPointSnapshot,
        totalProductPoints: i.totalProductPoints,
        imageUrl: null,
      }));

      return {
        sellerId: group.sellerId,
        sellerName: group.sellerName,
        sellerSlug: group.sellerSlug,
        packageNumber: idx + 1,
        courierProvider: group.courierProvider,
        estimatedDeliveryMinDays: minDays,
        estimatedDeliveryMaxDays: maxDays,
        deliveryPromiseText: promiseText,
        subtotalPoisha: group.subtotalPoisha,
        subtotalBdtFormatted: group.subtotalBdtFormatted,
        shippingFeePoisha: group.shippingFeePoisha,
        shippingFeeBdtFormatted: group.shippingFeeBdtFormatted,
        isFreeShipping: group.isFreeShipping,
        taxPoisha: group.taxPoisha,
        taxBdtFormatted: group.taxBdtFormatted,
        totalPoisha: group.totalPoisha,
        totalBdtFormatted: group.totalBdtFormatted,
        totalProductPoints: group.totalProductPoints,
        items,
      };
    });

    // 5. Check Readiness & Payment Method Availability
    const blockingReasons: string[] = [];
    let requiresCodOtp = false;

    if (paymentMethod.toUpperCase() === 'COD') {
      const codEvaluation = await codFraudRiskService.evaluateCodEligibility(
        {
          recipientPhone: normalizedPhone,
          orderSubtotalPoisha: calculation.subtotalPoisha,
          division: recipient.division,
          district: recipient.district,
          upazila: recipient.upazila || undefined,
          hasDigitalItems: cart.items.some((i: any) => i.variant?.product?.isPhysical === false),
          cartId: cart.id,
        },
        customerId
      );

      if (!codEvaluation.isEligible) {
        blockingReasons.push(
          codEvaluation.warnings[0] ||
            'Order does not meet Cash on Delivery criteria. Digital prepayment required.'
        );
      }

      if (codEvaluation.requiresOtpVerification && !codVerificationToken) {
        requiresCodOtp = true;
        blockingReasons.push('SMS OTP phone verification is required before placing COD order.');
      }
    } else if (paymentMethod.toUpperCase() === 'CUSTOMER_WALLET') {
      if (customerId) {
        const wallet = await (this.db as any).wallet.findFirst({
          where: { userId: customerId, type: 'MAIN', status: 'ACTIVE' },
        });

        const available = Number(wallet?.availablePoisha || 0);
        if (available < calculation.totalPoisha) {
          blockingReasons.push(
            `Insufficient AlifWorld Wallet balance (Available: ৳${(available / 100).toFixed(2)}, Required: ${calculation.totalBdtFormatted}).`
          );
        }
      } else {
        blockingReasons.push('Login is required to pay using AlifWorld Wallet.');
      }
    }

    // 6. Payment Instructions Mapping
    const paymentInstructions = this.getPaymentInstructions(paymentMethod);

    // 7. Mandatory Legal and Consumer Regulatory Consents
    const requiredConsents: RequiredConsentDeclarationDTO[] = [
      {
        type: 'TERMS',
        titleEn: 'Terms & Conditions',
        titleBn: 'শর্তাবলী ও নিয়মাবলী',
        version: CURRENT_TERMS_VERSION,
        summaryEn: 'I agree to the AlifWorld Platform Terms of Service and purchasing rules.',
        summaryBn:
          'আমি আলিফওয়ার্ল্ড প্ল্যাটফর্মের সেবার শর্তাবলী ও ক্রয়ের নিয়মাবলীতে সম্মতি দিচ্ছি।',
        linkUrl: '/terms',
        isRequired: true,
      },
      {
        type: 'PRIVACY',
        titleEn: 'Privacy & Data Protection Policy',
        titleBn: 'গোপনীয়তা ও তথ্য সুরক্ষা নীতি',
        version: CURRENT_PRIVACY_VERSION,
        summaryEn: 'I consent to the collection and processing of delivery contact information.',
        summaryBn:
          'ডেলিভারি ও অর্ডার প্রক্রিয়াকরণের জন্য প্রয়োজনীয় তথ্যের ব্যবহারে সম্মতি দিচ্ছি।',
        linkUrl: '/privacy',
        isRequired: true,
      },
      {
        type: 'RETURN_POLICY',
        titleEn: '7-Day Return & Refund Policy',
        titleBn: '৭ দিনের রিটার্ন ও রিফান্ড পলিসি',
        version: CURRENT_RETURN_POLICY_VERSION,
        summaryEn: 'I acknowledge the 7-day doorstep return and inspection policy.',
        summaryBn:
          'পণ্য গ্রহণের ৭ দিনের মধ্যে প্রযোজ্য ক্ষেত্রে রিটার্ন ও রিফান্ড নীতি স্বীকার করছি।',
        linkUrl: '/returns',
        isRequired: true,
      },
    ];

    if (paymentMethod.toUpperCase() === 'COD') {
      requiredConsents.push({
        type: 'COD_AGREEMENT',
        titleEn: 'Cash on Delivery Commitment Agreement',
        titleBn: 'ক্যাশ অন ডেলিভারি অঙ্গীকারনামা',
        version: CURRENT_COD_AGREEMENT_VERSION,
        summaryEn:
          'I commit to receiving the parcel upon delivery and paying the exact order amount in cash.',
        summaryBn: 'ডেলিভারির সময় পার্সেল গ্রহণ করে সম্পূর্ণ মূল্য নগদ পরিশোধ করার অঙ্গীকার করছি।',
        linkUrl: '/cod-agreement',
        isRequired: true,
      });
    }

    // 8. Deterministic Review Fingerprint
    const reviewFingerprint = createHash('sha256')
      .update(
        JSON.stringify([
          cart.id,
          cart.version,
          calculation.totalPoisha,
          calculation.totalProductPoints,
          normalizedPhone,
          recipient.address,
          paymentMethod,
        ])
      )
      .digest('hex')
      .slice(0, 32);

    return {
      cartId: cart.id,
      cartVersion: cart.version,
      reviewFingerprint,
      recipient: {
        name: recipient.name,
        phone: normalizedPhone,
        phoneMasked: maskedPhone,
        division: recipient.division,
        district: recipient.district,
        upazila: recipient.upazila || null,
        address: recipient.address,
        postalCode: recipient.postalCode || null,
      },
      packages,
      financials: {
        subtotalPoisha: calculation.subtotalPoisha,
        subtotalBdtFormatted: calculation.subtotalBdtFormatted,
        discountPoisha: calculation.discountPoisha,
        sellerDiscountPoisha: calculation.sellerDiscountPoisha,
        platformDiscountPoisha: calculation.platformDiscountPoisha,
        discountBdtFormatted: calculation.discountBdtFormatted,
        couponCode: calculation.coupon?.couponCode || null,
        shippingFeePoisha: calculation.shippingFeePoisha,
        shippingFeeBdtFormatted: calculation.shippingFeeBdtFormatted,
        taxPoisha: calculation.taxPoisha,
        taxBdtFormatted: calculation.taxBdtFormatted,
        totalPoisha: calculation.totalPoisha,
        totalBdtFormatted: calculation.totalBdtFormatted,
        totalProductPoints: calculation.totalProductPoints,
        currency: 'BDT',
      },
      selectedPaymentMethod: paymentMethod.toUpperCase(),
      paymentInstructions,
      requiredConsents,
      readiness: {
        canPlaceOrder: blockingReasons.length === 0,
        blockingReasons,
        requiresCodOtp,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  private getPaymentInstructions(paymentMethod: string): { en: string; bn: string } {
    const method = paymentMethod.toUpperCase();
    if (method === 'COD') {
      return {
        en: 'Please have the exact cash amount ready for the delivery rider upon parcel arrival.',
        bn: 'পার্সেল পৌঁছানোর পর ডেলিভারি রাইডারের কাছে সঠিক নগদ টাকা প্রদান করুন।',
      };
    }
    if (method === 'CUSTOMER_WALLET') {
      return {
        en: 'Your order amount will be instantly debited from your active AlifWorld Wallet balance.',
        bn: 'আপনার সক্রিয় আলিফওয়ার্ল্ড ওয়ালেট ব্যালেন্স থেকে তাৎক্ষণিক পেমেন্ট সম্পন্ন হবে।',
      };
    }
    if (method === 'BKASH') {
      return {
        en: 'You will be redirected to the secure bKash payment portal to complete payment.',
        bn: 'পেমেন্ট সম্পন্ন করার জন্য আপনাকে নিরাপদ বিকাশ পেমেন্ট গেটওয়েতে পাঠানো হবে।',
      };
    }
    if (method === 'NAGAD') {
      return {
        en: 'You will be redirected to the secure Nagad payment portal.',
        bn: 'পেমেন্ট সম্পন্ন করার জন্য আপনাকে নিরাপদ নগদ পেমেন্ট গেটওয়েতে পাঠানো হবে।',
      };
    }
    if (method === 'SSLCOMMERZ') {
      return {
        en: 'You will be redirected to SSLCommerz to pay via Visa, Mastercard, AMEX, or Net Banking.',
        bn: 'ভিসা, মাস্টারকার্ড বা ইন্টারনেট ব্যাংকিংয়ে��� মাধ্যমে পেমেন্ট করতে এসএসএলকমার্জে পাঠানো হবে।',
      };
    }
    return {
      en: 'Complete payment through the selected payment gateway.',
      bn: 'নির্বাচিত পেমেন্ট গেটওয়ের মাধ্যমে পেমেন্ট সম্পন্ন করুন।',
    };
  }
}

export const finalOrderReviewService = new FinalOrderReviewService();
