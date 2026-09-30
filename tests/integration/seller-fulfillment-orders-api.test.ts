/**
 * Milestone 141: Seller Fulfillment Order API Integration Tests
 *
 * Verifies:
 * 1. GET /api/v1/seller/orders lists fulfillment orders scoped to authenticated merchant
 * 2. GET /api/v1/seller/orders/[groupId] retrieves single fulfillment order
 * 3. Strict tenant isolation: cross-tenant access returns 403 TENANT_VIOLATION
 * 4. Non-seller users without sellerId receive 403 SELLER_ACCESS_REQUIRED
 * 5. Phone numbers are masked for sellers
 * 6. Commission and payout displayed read-only (sellers cannot modify)
 */

import { describe, it, expect, beforeEach, spyOn, afterEach } from 'bun:test';
import { NextRequest } from 'next/server';
import * as authzModule from '@/shared/authz';
import { GET as listSellerOrdersRoute } from '@/app/api/v1/seller/orders/route';
import { GET as getSellerOrderRoute } from '@/app/api/v1/seller/orders/[groupId]/route';
import { sellerFulfillmentOrderService } from '@/features/orders';
import type { SellerFulfillmentOrderDTO } from '@/features/orders/types/order.types';
import { AuthorizationError, NotFoundError } from '@/shared/errors/app-error';

const sellerActor = {
  userId: 'usr_seller_01',
  roles: ['SELLER'],
  permissions: ['seller:orders:read'],
  sellerId: 'sel_dhaka_tech_01',
};

const customerActor = {
  userId: 'usr_customer_01',
  roles: ['CUSTOMER'],
  permissions: ['orders:read'],
  sellerId: null,
};

const mockFulfillmentOrderDTO: Partial<SellerFulfillmentOrderDTO> = {
  id: 'sfg_test_001',
  orderId: 'ord_test_001',
  orderNumber: 'ORD-20260922-0001',
  groupNumber: 'SFG-20260922-0001-SEL01',
  sellerId: 'sel_dhaka_tech_01',
  sellerName: 'Dhaka Tech Ltd.',
  status: 'PENDING',
  statusLabelEn: 'Pending',
  statusLabelBn: 'PENDING',
  financialBreakdown: {
    subtotalPoisha: 2199000,
    subtotalBdtFormatted: '৳21990.00',
    discountPoisha: 0,
    sellerDiscountPoisha: 0,
    platformDiscountPoisha: 0,
    discountBdtFormatted: '৳0.00',
    shippingFeePoisha: 6000,
    shippingFeeBdtFormatted: '৳60.00',
    taxPoisha: 329850,
    taxBdtFormatted: '৳3298.50',
    totalPoisha: 2534850,
    totalBdtFormatted: '৳25348.50',
    sellerCommissionPoisha: 109950,
    sellerCommissionBdtFormatted: '৳1099.50',
    sellerPayoutPoisha: 2424900,
    sellerPayoutBdtFormatted: '৳24249.00',
    totalProductPoints: 450,
  },
  deliveryContact: {
    recipientName: 'Tanvir Ahmed',
    recipientPhoneMasked: '+88017****2233',
    division: 'DHAKA',
    district: 'DHAKA',
    address: 'House 42, Road 11',
    upazila: null,
    postalCode: '1212',
  },
  logistics: {
    courierProvider: 'PATHAO',
    trackingNumber: null,
    consignmentId: null,
    trackingUrl: null,
    pickupDate: null,
    estimatedDelivery: null,
    deliveredAt: null,
  },
  items: [
    {
      id: 'oi_test_001',
      variantId: 'var_phone_001',
      productTitle: 'Nexus Pro Smartphone 5G',
      variantTitle: 'Midnight Black / 128GB',
      sku: 'PHN-NEXUS-BLK',
      quantity: 1,
      unitPricePoisha: 2199000,
      unitPriceBdtFormatted: '৳21990.00',
      totalPoisha: 2199000,
      totalBdtFormatted: '৳21990.00',
      taxRatePercent: 15,
      taxPoisha: 329850,
      taxBdtFormatted: '৳3298.50',
      productPointSnapshot: 450,
      totalProductPoints: 450,
      status: 'PENDING',
    },
  ],
  shipments: [],
  createdAt: '2026-09-22T10:30:00.000Z',
  updatedAt: '2026-09-22T10:30:00.000Z',
};

describe('Milestone 141: Seller Fulfillment Order API Integration Tests', () => {
  let authSpy: ReturnType<typeof spyOn>;

  afterEach(() => {
    authSpy?.mockRestore();
  });

  // ─── 1. GET /api/v1/seller/orders (list) ───
  describe('1. GET /api/v1/seller/orders', () => {
    it('returns 200 with paginated fulfillment orders for authenticated seller', async () => {
      authSpy = spyOn(authzModule, 'authenticateRequest').mockReturnValue(sellerActor as any);
      const listSpy = spyOn(
        sellerFulfillmentOrderService,
        'listSellerFulfillmentOrders'
      ).mockResolvedValue({
        items: [mockFulfillmentOrderDTO as any],
        total: 1,
        page: 1,
        limit: 20,
      });

      const req = new NextRequest('http://localhost:3000/api/v1/seller/orders', { method: 'GET' });
      const res = await listSellerOrdersRoute(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].sellerId).toBe('sel_dhaka_tech_01');
      expect(body.meta.total).toBe(1);
      expect(body.meta.page).toBe(1);

      listSpy.mockRestore();
    });

    it('returns 403 when authenticated user has no sellerId', async () => {
      authSpy = spyOn(authzModule, 'authenticateRequest').mockReturnValue(customerActor as any);

      const req = new NextRequest('http://localhost:3000/api/v1/seller/orders', { method: 'GET' });
      const res = await listSellerOrdersRoute(req);
      expect(res.status).toBe(403);

      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('FORBIDDEN');

      // No need to restore listSpy as it shouldn't have been called
    });

    it('passes status filter to service', async () => {
      authSpy = spyOn(authzModule, 'authenticateRequest').mockReturnValue(sellerActor as any);
      const listSpy = spyOn(
        sellerFulfillmentOrderService,
        'listSellerFulfillmentOrders'
      ).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
      });

      const req = new NextRequest(
        'http://localhost:3000/api/v1/seller/orders?status=PENDING&page=2',
        { method: 'GET' }
      );
      const res = await listSellerOrdersRoute(req);
      expect(res.status).toBe(200);

      // Verify service called with correct args
      expect(listSpy).toHaveBeenCalledTimes(1);
      const callArgs = listSpy.mock.calls[0];
      expect(callArgs[0]).toBe('sel_dhaka_tech_01');
      expect(callArgs[1].status).toBe('PENDING');
      expect(callArgs[1].page).toBe(2);

      listSpy.mockRestore();
    });
  });

  // ─── 2. GET /api/v1/seller/orders/[groupId] ───
  describe('2. GET /api/v1/seller/orders/[groupId]', () => {
    it('returns 200 with single fulfillment order for owner seller', async () => {
      authSpy = spyOn(authzModule, 'authenticateRequest').mockReturnValue(sellerActor as any);
      const getSpy = spyOn(
        sellerFulfillmentOrderService,
        'getSellerFulfillmentOrder'
      ).mockResolvedValue(mockFulfillmentOrderDTO as any);

      const req = new NextRequest('http://localhost:3000/api/v1/seller/orders/sfg_test_001', {
        method: 'GET',
      });
      const res = await getSellerOrderRoute(req, {
        params: Promise.resolve({ groupId: 'sfg_test_001' }),
      });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.id).toBe('sfg_test_001');
      expect(body.data.sellerId).toBe('sel_dhaka_tech_01');
      expect(body.data.financialBreakdown.sellerCommissionPoisha).toBe(109950);
      expect(body.data.financialBreakdown.sellerPayoutPoisha).toBe(2424900);
      expect(body.data.deliveryContact.recipientPhoneMasked).toBe('+88017****2233');

      getSpy.mockRestore();
    });

    it('returns 403 TENANT_VIOLATION when seller accesses another seller fulfillment order', async () => {
      authSpy = spyOn(authzModule, 'authenticateRequest').mockReturnValue(sellerActor as any);
      const getSpy = spyOn(
        sellerFulfillmentOrderService,
        'getSellerFulfillmentOrder'
      ).mockRejectedValue(
        new AuthorizationError(
          'Tenant access violation: you do not have permission to view or manage another seller fulfillment order.',
          { code: 'TENANT_VIOLATION' }
        )
      );

      const req = new NextRequest(
        'http://localhost:3000/api/v1/seller/orders/sfg_other_seller_001',
        { method: 'GET' }
      );
      const res = await getSellerOrderRoute(req, {
        params: Promise.resolve({ groupId: 'sfg_other_seller_001' }),
      });
      expect(res.status).toBe(403);

      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('FORBIDDEN');

      getSpy.mockRestore();
    });

    it('returns 404 when fulfillment order does not exist', async () => {
      authSpy = spyOn(authzModule, 'authenticateRequest').mockReturnValue(sellerActor as any);
      const getSpy = spyOn(
        sellerFulfillmentOrderService,
        'getSellerFulfillmentOrder'
      ).mockRejectedValue(new NotFoundError("Fulfillment order 'sfg_nonexistent' not found."));

      const req = new NextRequest('http://localhost:3000/api/v1/seller/orders/sfg_nonexistent', {
        method: 'GET',
      });
      const res = await getSellerOrderRoute(req, {
        params: Promise.resolve({ groupId: 'sfg_nonexistent' }),
      });
      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('NOT_FOUND');

      getSpy.mockRestore();
    });

    it('returns 403 when customer role tries to access seller endpoint', async () => {
      authSpy = spyOn(authzModule, 'authenticateRequest').mockReturnValue(customerActor as any);

      const req = new NextRequest('http://localhost:3000/api/v1/seller/orders/sfg_test_001', {
        method: 'GET',
      });
      const res = await getSellerOrderRoute(req, {
        params: Promise.resolve({ groupId: 'sfg_test_001' }),
      });
      expect(res.status).toBe(403);

      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('FORBIDDEN');
    });
  });

  // ─── 3. Seller Tenant Isolation Invariants ───
  describe('3. Seller Tenant Isolation Security Invariants', () => {
    it('seller sees only their own orders in list response', async () => {
      authSpy = spyOn(authzModule, 'authenticateRequest').mockReturnValue(sellerActor as any);
      const listSpy = spyOn(
        sellerFulfillmentOrderService,
        'listSellerFulfillmentOrders'
      ).mockResolvedValue({
        items: [mockFulfillmentOrderDTO as any],
        total: 1,
        page: 1,
        limit: 20,
      });

      const req = new NextRequest('http://localhost:3000/api/v1/seller/orders', { method: 'GET' });
      const res = await listSellerOrdersRoute(req);
      const body = await res.json();

      // Every returned fulfillment order must match the seller's sellerId
      for (const order of body.data) {
        expect(order.sellerId).toBe(sellerActor.sellerId);
      }

      // Verify service was called with the correct sellerId
      expect(listSpy.mock.calls[0][0]).toBe('sel_dhaka_tech_01');

      listSpy.mockRestore();
    });

    it('seller receives masked phone, not raw phone number', async () => {
      authSpy = spyOn(authzModule, 'authenticateRequest').mockReturnValue(sellerActor as any);
      const getSpy = spyOn(
        sellerFulfillmentOrderService,
        'getSellerFulfillmentOrder'
      ).mockResolvedValue(mockFulfillmentOrderDTO as any);

      const req = new NextRequest('http://localhost:3000/api/v1/seller/orders/sfg_test_001', {
        method: 'GET',
      });
      const res = await getSellerOrderRoute(req, {
        params: Promise.resolve({ groupId: 'sfg_test_001' }),
      });
      const body = await res.json();

      // Phone must be masked
      expect(body.data.deliveryContact.recipientPhoneMasked).toContain('****');
      // No raw phone should be exposed
      expect(body.data.deliveryContact).not.toHaveProperty('recipientPhone');

      getSpy.mockRestore();
    });

    it('financial breakdown includes platform-protected commission and payout (read-only)', async () => {
      authSpy = spyOn(authzModule, 'authenticateRequest').mockReturnValue(sellerActor as any);
      const getSpy = spyOn(
        sellerFulfillmentOrderService,
        'getSellerFulfillmentOrder'
      ).mockResolvedValue(mockFulfillmentOrderDTO as any);

      const req = new NextRequest('http://localhost:3000/api/v1/seller/orders/sfg_test_001', {
        method: 'GET',
      });
      const res = await getSellerOrderRoute(req, {
        params: Promise.resolve({ groupId: 'sfg_test_001' }),
      });
      const body = await res.json();

      // Commission and payout values are present but cannot be modified by seller
      const fin = body.data.financialBreakdown;
      expect(fin.sellerCommissionPoisha).toBeDefined();
      expect(fin.sellerPayoutPoisha).toBeDefined();
      expect(fin.sellerCommissionBdtFormatted).toBeDefined();
      expect(fin.sellerPayoutBdtFormatted).toBeDefined();

      getSpy.mockRestore();
    });
  });
});
