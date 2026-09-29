/**
 * Milestone 140: Abandoned Checkout Recovery REST API Integration Tests
 *
 * Verifies:
 * 1. GET /api/v1/checkout/abandoned - admin listing and customer access guard (403)
 * 2. GET /api/v1/checkout/abandoned/[id] - admin detailed inspection
 * 3. POST /api/v1/checkout/abandoned/[id]/recover - notification dispatch
 * 4. GET /api/v1/cart/recover/[token] - public cart restoration & live revalidation
 */

import { describe, it, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import * as authzModule from '@/shared/authz';
import { GET as listAbandonedRoute } from '@/app/api/v1/checkout/abandoned/route';
import { GET as getAbandonedRoute } from '@/app/api/v1/checkout/abandoned/[id]/route';
import { POST as triggerRecoverRoute } from '@/app/api/v1/checkout/abandoned/[id]/recover/route';
import { GET as recoverCartRoute } from '@/app/api/v1/cart/recover/[token]/route';
import { abandonedCheckoutRecoveryService } from '@/features/checkout/services/abandoned-checkout-recovery.service';
import { NextRequest } from 'next/server';

describe('Milestone 140: Abandoned Checkout Recovery REST API Integration Tests', () => {
  let authSpy: any;

  const adminActor = {
    userId: 'usr_admin_01',
    roles: ['ADMIN'],
    permissions: ['admin.manage'],
    sellerId: null,
  };

  const customerActor = {
    userId: 'usr_customer_01',
    roles: ['CUSTOMER'],
    permissions: [],
    sellerId: null,
  };

  const sampleAbandoned = {
    id: 'rec_sample_01',
    cartId: 'crt_abandoned_01',
    recoveryToken: 'rec_valid_token_123',
    recoveryUrl: 'http://localhost:3000/checkout/recover?token=rec_valid_token_123',
    customerId: 'usr_customer_01',
    recipientEmail: 'customer@example.com',
    recipientPhone: '+8801711223344',
    recipientPhoneMasked: '+88017****3344',
    savedAddress: {
      division: 'DHAKA',
      district: 'Dhaka',
      address: 'House 12, Road 4',
    },
    totalPoisha: 250000,
    totalBdtFormatted: '৳2,500.00',
    itemCount: 2,
    incentiveCouponCode: 'SAVE10',
    recoveryStatus: 'ABANDONED' as const,
    notifiedAt: null,
    recoveredAt: null,
    recoveredOrderId: null,
    expiresAt: new Date(Date.now() + 3600000 * 72).toISOString(),
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    authSpy = spyOn(authzModule, 'authenticateRequest').mockReturnValue(adminActor as any);
  });

  afterEach(() => {
    authSpy?.mockRestore();
  });

  describe('1. GET /api/v1/checkout/abandoned', () => {
    it('allows Admin to list abandoned checkouts with pagination', async () => {
      const listSpy = spyOn(
        abandonedCheckoutRecoveryService,
        'listAbandonedCheckouts'
      ).mockResolvedValue({
        items: [sampleAbandoned],
        total: 1,
        page: 1,
        limit: 20,
      });

      const req = new NextRequest(
        'http://localhost:3000/api/v1/checkout/abandoned?page=1&limit=20',
        { method: 'GET' }
      );

      const response = await listAbandonedRoute(req);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBe(1);
      expect(json.data[0].cartId).toBe('crt_abandoned_01');

      listSpy.mockRestore();
    });

    it('blocks regular customers from accessing admin abandoned list with 403', async () => {
      authSpy.mockReturnValue(customerActor as any);

      const req = new NextRequest('http://localhost:3000/api/v1/checkout/abandoned', {
        method: 'GET',
      });

      const response = await listAbandonedRoute(req);
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('FORBIDDEN');
    });
  });

  describe('2. GET /api/v1/checkout/abandoned/[id]', () => {
    it('retrieves detailed abandoned checkout session for Admin', async () => {
      const getSpy = spyOn(
        abandonedCheckoutRecoveryService,
        'getAbandonedCheckoutById'
      ).mockResolvedValue(sampleAbandoned as any);

      const req = new NextRequest(
        'http://localhost:3000/api/v1/checkout/abandoned/rec_sample_01',
        { method: 'GET' }
      );

      const response = await getAbandonedRoute(req, {
        params: Promise.resolve({ id: 'rec_sample_01' }),
      });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.id).toBe('rec_sample_01');
      expect(json.data.totalBdtFormatted).toBe('৳2,500.00');

      getSpy.mockRestore();
    });
  });

  describe('3. POST /api/v1/checkout/abandoned/[id]/recover', () => {
    it('triggers recovery notification dispatch via email and SMS', async () => {
      const triggerSpy = spyOn(
        abandonedCheckoutRecoveryService,
        'triggerRecoveryNotification'
      ).mockResolvedValue({
        success: true,
        message: 'Recovery notification queued for dispatch via BOTH.',
      });

      const req = new NextRequest(
        'http://localhost:3000/api/v1/checkout/abandoned/rec_sample_01/recover',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel: 'BOTH',
            incentiveCouponCode: 'RECOVER10',
          }),
        }
      );

      const response = await triggerRecoverRoute(req, {
        params: Promise.resolve({ id: 'rec_sample_01' }),
      });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.message).toContain('BOTH');

      triggerSpy.mockRestore();
    });
  });

  describe('4. GET /api/v1/cart/recover/[token]', () => {
    it('restores cart from recovery token with revalidation metrics', async () => {
      const recoverSpy = spyOn(
        abandonedCheckoutRecoveryService,
        'recoverCart'
      ).mockResolvedValue({
        success: true,
        cartId: 'crt_abandoned_01',
        recoveryToken: 'rec_valid_token_123',
        itemsCount: 2,
        revalidation: {
          hasPriceChanges: false,
          priceChangesCount: 0,
          hasOutOfStock: false,
          outOfStockCount: 0,
          hasSellerIssues: false,
          warnings: [],
        },
        subtotalPoisha: 250000,
        subtotalBdtFormatted: '৳2,500.00',
        appliedCouponCode: 'SAVE10',
        savedAddress: null,
        restoredAt: new Date().toISOString(),
      });

      const req = new NextRequest(
        'http://localhost:3000/api/v1/cart/recover/rec_valid_token_123',
        { method: 'GET' }
      );

      const response = await recoverCartRoute(req, {
        params: Promise.resolve({ token: 'rec_valid_token_123' }),
      });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.cartId).toBe('crt_abandoned_01');
      expect(json.data.appliedCouponCode).toBe('SAVE10');
      expect(json.data.subtotalPoisha).toBe(250000);

      recoverSpy.mockRestore();
    });
  });
});
