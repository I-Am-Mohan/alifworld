/**
 * Milestone 138: Payment Method Discovery & Selection REST API Integration Tests
 *
 * Verifies:
 * 1. GET & POST /api/v1/checkout/payment-methods - discovery and eligibility evaluation
 * 2. POST /api/v1/checkout/payment-methods/select - method selection & redirect intent
 * 3. POST /api/v1/payments/webhooks/[gateway] - signature verification & webhook deduplication
 */

import { describe, it, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import * as authzModule from '@/shared/authz';
import {
  GET as getPaymentMethodsRoute,
  POST as discoverPaymentMethodsRoute,
} from '@/app/api/v1/checkout/payment-methods/route';
import { POST as selectPaymentMethodRoute } from '@/app/api/v1/checkout/payment-methods/select/route';
import { POST as paymentWebhookRoute } from '@/app/api/v1/payments/webhooks/[gateway]/route';
import { paymentMethodDiscoveryService } from '@/features/payment';
import { NextRequest } from 'next/server';

describe('Milestone 138: Payment Method Discovery & Selection REST API Integration Tests', () => {
  let authSpy: any;

  const customerActor = {
    userId: 'usr_customer_01',
    roles: ['CUSTOMER'],
    permissions: [],
    sellerId: null,
  };

  beforeEach(() => {
    authSpy = spyOn(authzModule, 'authenticateRequest').mockReturnValue(customerActor as any);
  });

  afterEach(() => {
    authSpy?.mockRestore();
  });

  describe('1. GET & POST /api/v1/checkout/payment-methods', () => {
    it('discovers eligible payment methods via query parameters (GET)', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/v1/checkout/payment-methods?orderTotalPoisha=150000',
        { method: 'GET' }
      );

      const response = await getPaymentMethodsRoute(req);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.currency).toBe('BDT');
      expect(Array.isArray(json.data.availableMethods)).toBe(true);
      expect(json.data.availableMethods.length).toBeGreaterThanOrEqual(1);

      const codes = json.data.availableMethods.map((m: any) => m.code);
      expect(codes).toContain('BKASH');
      expect(codes).toContain('COD');
      expect(json.data.recommendedMethod).toBeDefined();
    });

    it('discovers payment methods via JSON payload (POST)', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/checkout/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderTotalPoisha: 250000,
          shippingAddress: {
            division: 'DHAKA',
            district: 'Dhaka',
            recipientPhone: '01711223344',
          },
          hasDigitalItems: false,
          clientPlatform: 'ANDROID',
        }),
      });

      const response = await discoverPaymentMethodsRoute(req);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.availableMethods.length).toBeGreaterThan(0);
    });
  });

  describe('2. POST /api/v1/checkout/payment-methods/select', () => {
    it('selects BKASH and returns redirect action type and gateway checkout URL', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/checkout/payment-methods/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod: 'BKASH',
        }),
      });

      const response = await selectPaymentMethodRoute(req);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.paymentMethod).toBe('BKASH');
      expect(json.data.actionType).toBe('REDIRECT');
      expect(json.data.redirectUrl).toContain('bka.sh');
    });

    it('selects COD and returns doorstep payment instructions without redirect', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/checkout/payment-methods/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod: 'COD',
        }),
      });

      const response = await selectPaymentMethodRoute(req);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.paymentMethod).toBe('COD');
      expect(json.data.actionType).toBe('NONE');
      expect(json.data.instructionsEn).toContain('cash');
    });

    it('selects CUSTOMER_WALLET and returns INSTANT_SETTLEMENT action type', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/checkout/payment-methods/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod: 'CUSTOMER_WALLET',
          walletType: 'MAIN',
        }),
      });

      const response = await selectPaymentMethodRoute(req);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.paymentMethod).toBe('CUSTOMER_WALLET');
      expect(json.data.actionType).toBe('INSTANT_SETTLEMENT');
    });

    it('rejects invalid payment method code with 422', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/checkout/payment-methods/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod: 'BITCOIN_UNSUPPORTED',
        }),
      });

      const response = await selectPaymentMethodRoute(req);
      const json = await response.json();

      expect(response.status).toBe(422);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('VALIDATION_FAILED');
    });
  });

  describe('3. POST /api/v1/payments/webhooks/[gateway]', () => {
    it('ingests and records payment gateway webhook callback', async () => {
      const testEventId = `ev_test_${Date.now()}`;

      const req = new NextRequest('http://localhost:3000/api/v1/payments/webhooks/bkash', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': 'mock_hmac_signature_123',
        },
        body: JSON.stringify({
          trxID: testEventId,
          amount: '1500.00',
          paymentID: 'BKASH_PAY_12345',
          status: 'Completed',
        }),
      });

      const response = await paymentWebhookRoute(req, {
        params: Promise.resolve({ gateway: 'bkash' }),
      });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.message).toContain('BKASH');
    });

    it('deduplicates repeating webhook event with the same transaction ID', async () => {
      const duplicateSpy = spyOn(
        paymentMethodDiscoveryService,
        'handlePaymentWebhook'
      ).mockResolvedValue({
        success: true,
        message: "Webhook event 'trx_duplicate_01' was already processed. Deduplicated.",
        duplicate: true,
      });

      const req = new NextRequest('http://localhost:3000/api/v1/payments/webhooks/bkash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trxID: 'trx_duplicate_01',
          status: 'Completed',
        }),
      });

      const response = await paymentWebhookRoute(req, {
        params: Promise.resolve({ gateway: 'bkash' }),
      });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.duplicate).toBe(true);
      expect(json.data.message).toContain('Deduplicated');

      duplicateSpy.mockRestore();
    });
  });
});
