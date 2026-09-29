/**
 * Milestone 139: Final Order Review & Place-Order REST API Integration Tests
 *
 * Verifies:
 * 1. POST /api/v1/checkout/review - review compilation, fingerprint, and legal consents
 * 2. POST /api/v1/checkout/place-order - atomic order placement with consent enforcement
 * 3. Idempotent replay returning existing committed order (200 OK)
 * 4. Rejection of place-order without mandatory legal consent (422)
 * 5. Rejection of COD order without COD commitment agreement (422)
 */

import { describe, it, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import * as authzModule from '@/shared/authz';
import { POST as reviewOrderRoute } from '@/app/api/v1/checkout/review/route';
import { POST as placeOrderRoute } from '@/app/api/v1/checkout/place-order/route';
import {
  finalOrderReviewService,
  placeOrderTransactionService,
} from '@/features/checkout';
import { NextRequest } from 'next/server';

describe('Milestone 139: Order Review & Place-Order REST API Integration Tests', () => {
  let authSpy: any;

  const customerActor = {
    userId: 'usr_customer_01',
    roles: ['CUSTOMER'],
    permissions: [],
    sellerId: null,
  };

  const sampleReviewResult = {
    cartId: 'crt_user_01',
    cartVersion: 1,
    reviewFingerprint: 'rev_fingerprint_abc12345',
    recipient: {
      name: 'Rahim Chowdhury',
      phone: '+8801711223344',
      phoneMasked: '+88017****3344',
      division: 'DHAKA',
      district: 'Dhaka',
      upazila: 'Gulshan',
      address: 'House 42, Road 11, Gulshan 1',
      postalCode: '1212',
    },
    packages: [
      {
        sellerId: 'sel_merchant_01',
        sellerName: 'Fashion Hub',
        packageNumber: 1,
        courierProvider: 'IN_HOUSE',
        estimatedDeliveryMinDays: 1,
        estimatedDeliveryMaxDays: 2,
        deliveryPromiseText: '1-2 Business Days',
        subtotalPoisha: 250000,
        subtotalBdtFormatted: '৳2,500.00',
        shippingFeePoisha: 0,
        shippingFeeBdtFormatted: '৳0.00',
        isFreeShipping: true,
        taxPoisha: 37500,
        taxBdtFormatted: '৳375.00',
        totalPoisha: 287500,
        totalBdtFormatted: '৳2,875.00',
        totalProductPoints: 100,
        items: [],
      },
    ],
    financials: {
      subtotalPoisha: 250000,
      subtotalBdtFormatted: '৳2,500.00',
      discountPoisha: 0,
      sellerDiscountPoisha: 0,
      platformDiscountPoisha: 0,
      discountBdtFormatted: '৳0.00',
      shippingFeePoisha: 0,
      shippingFeeBdtFormatted: '৳0.00',
      taxPoisha: 37500,
      taxBdtFormatted: '৳375.00',
      totalPoisha: 287500,
      totalBdtFormatted: '৳2,875.00',
      totalProductPoints: 100,
      currency: 'BDT' as const,
    },
    selectedPaymentMethod: 'COD',
    paymentInstructions: {
      en: 'Pay with cash upon delivery.',
      bn: 'ডেলিভারির সময় নগদ পরিশোধ করুন।',
    },
    requiredConsents: [
      {
        type: 'TERMS' as const,
        titleEn: 'Terms & Conditions',
        titleBn: 'শর্তাবলী',
        version: 'v2026.1',
        summaryEn: 'Accept platform terms',
        summaryBn: 'প্ল্যাটফর্মের শর্তাবলী',
        linkUrl: '/terms',
        isRequired: true,
      },
    ],
    readiness: {
      canPlaceOrder: true,
      blockingReasons: [],
      requiresCodOtp: false,
    },
    generatedAt: new Date().toISOString(),
  };

  const samplePlacedOrderResult = {
    orderId: 'ord_placed_001',
    orderNumber: 'ORD-20261015-XYZ987',
    customerId: 'usr_customer_01',
    status: 'PENDING_PAYMENT',
    paymentStatus: 'UNPAID',
    fulfillmentStatus: 'UNFULFILLED',
    currency: 'BDT' as const,
    financialSummary: {
      subtotalPoisha: 250000,
      subtotalBdtFormatted: '৳2,500.00',
      discountPoisha: 0,
      discountBdtFormatted: '৳0.00',
      shippingFeePoisha: 0,
      shippingFeeBdtFormatted: '৳0.00',
      taxPoisha: 37500,
      taxBdtFormatted: '৳375.00',
      totalPoisha: 287500,
      totalBdtFormatted: '৳2,875.00',
      totalProductPoints: 100,
    },
    payment: {
      paymentMethod: 'COD',
      paymentNumber: 'PAY-20261015-112233',
      status: 'PENDING',
      requiresRedirect: false,
      redirectUrl: null,
      instructionsEn: 'Pay on delivery',
      instructionsBn: 'ডেলিভারিতে পরিশোধ করুন',
    },
    fulfillmentPackagesCount: 1,
    consentSnapshot: {
      termsVersion: 'v2026.1',
      privacyVersion: 'v2026.1',
      returnPolicyVersion: 'v2026.1',
      acceptedAt: new Date().toISOString(),
    },
    isIdempotentReplay: false,
    placedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    authSpy = spyOn(authzModule, 'authenticateRequest').mockReturnValue(customerActor as any);
  });

  afterEach(() => {
    authSpy?.mockRestore();
  });

  describe('1. POST /api/v1/checkout/review', () => {
    it('generates complete order review with multi-seller packages, points, and legal consents', async () => {
      const reviewSpy = spyOn(
        finalOrderReviewService,
        'generateOrderReview'
      ).mockResolvedValue(sampleReviewResult as any);

      const req = new NextRequest('http://localhost:3000/api/v1/checkout/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartId: 'crt_user_01',
          recipient: {
            name: 'Rahim Chowdhury',
            phone: '01711223344',
            division: 'DHAKA',
            district: 'Dhaka',
            upazila: 'Gulshan',
            address: 'House 42, Road 11, Gulshan 1',
          },
          paymentMethod: 'COD',
        }),
      });

      const response = await reviewOrderRoute(req);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.reviewFingerprint).toBeDefined();
      expect(json.data.packages.length).toBe(1);
      expect(json.data.financials.totalProductPoints).toBe(100);
      expect(json.data.requiredConsents.length).toBeGreaterThan(0);

      reviewSpy.mockRestore();
    });
  });

  describe('2. POST /api/v1/checkout/place-order', () => {
    it('places order atomically when all required legal consents are accepted', async () => {
      const placeSpy = spyOn(
        placeOrderTransactionService,
        'placeOrder'
      ).mockResolvedValue(samplePlacedOrderResult as any);

      const req = new NextRequest('http://localhost:3000/api/v1/checkout/place-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': 'idemp-place-order-12345',
        },
        body: JSON.stringify({
          cartId: 'crt_user_01',
          recipient: {
            name: 'Rahim Chowdhury',
            phone: '01711223344',
            division: 'DHAKA',
            district: 'Dhaka',
            address: 'House 42, Road 11, Gulshan 1',
          },
          paymentMethod: 'COD',
          consent: {
            termsAccepted: true,
            termsVersion: 'v2026.1',
            privacyAccepted: true,
            privacyVersion: 'v2026.1',
            returnPolicyAccepted: true,
            returnPolicyVersion: 'v2026.1',
            codAgreementAccepted: true,
          },
          idempotencyKey: 'idemp-place-order-12345',
        }),
      });

      const response = await placeOrderRoute(req);
      const json = await response.json();

      expect(response.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.orderNumber).toBe('ORD-20261015-XYZ987');
      expect(json.data.isIdempotentReplay).toBe(false);

      placeSpy.mockRestore();
    });

    it('returns 200 OK on idempotent replay with identical key', async () => {
      const placeSpy = spyOn(
        placeOrderTransactionService,
        'placeOrder'
      ).mockResolvedValue({
        ...samplePlacedOrderResult,
        isIdempotentReplay: true,
      } as any);

      const req = new NextRequest('http://localhost:3000/api/v1/checkout/place-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartId: 'crt_user_01',
          recipient: {
            name: 'Rahim Chowdhury',
            phone: '01711223344',
            division: 'DHAKA',
            district: 'Dhaka',
            address: 'House 42, Road 11, Gulshan 1',
          },
          paymentMethod: 'COD',
          consent: {
            termsAccepted: true,
            termsVersion: 'v2026.1',
            privacyAccepted: true,
            privacyVersion: 'v2026.1',
            returnPolicyAccepted: true,
            returnPolicyVersion: 'v2026.1',
            codAgreementAccepted: true,
          },
          idempotencyKey: 'idemp-place-order-12345',
        }),
      });

      const response = await placeOrderRoute(req);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.isIdempotentReplay).toBe(true);

      placeSpy.mockRestore();
    });

    it('rejects place-order with 422 if mandatory legal consents are not accepted', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/checkout/place-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartId: 'crt_user_01',
          recipient: {
            name: 'Rahim Chowdhury',
            phone: '01711223344',
            division: 'DHAKA',
            district: 'Dhaka',
            address: 'House 42, Road 11, Gulshan 1',
          },
          paymentMethod: 'COD',
          consent: {
            termsAccepted: false, // Refused
            termsVersion: 'v2026.1',
            privacyAccepted: true,
            privacyVersion: 'v2026.1',
            returnPolicyAccepted: true,
            returnPolicyVersion: 'v2026.1',
            codAgreementAccepted: true,
          },
          idempotencyKey: 'idemp-place-order-12345',
        }),
      });

      const response = await placeOrderRoute(req);
      const json = await response.json();

      expect(response.status).toBe(422);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('VALIDATION_FAILED');
    });

    it('rejects COD place-order with 422 if COD agreement is refused', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/checkout/place-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartId: 'crt_user_01',
          recipient: {
            name: 'Rahim Chowdhury',
            phone: '01711223344',
            division: 'DHAKA',
            district: 'Dhaka',
            address: 'House 42, Road 11, Gulshan 1',
          },
          paymentMethod: 'COD',
          consent: {
            termsAccepted: true,
            termsVersion: 'v2026.1',
            privacyAccepted: true,
            privacyVersion: 'v2026.1',
            returnPolicyAccepted: true,
            returnPolicyVersion: 'v2026.1',
            codAgreementAccepted: false, // Refused COD commitment
          },
          idempotencyKey: 'idemp-place-order-12345',
        }),
      });

      const response = await placeOrderRoute(req);
      const json = await response.json();

      expect(response.status).toBe(422);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('VALIDATION_FAILED');
    });
  });
});
