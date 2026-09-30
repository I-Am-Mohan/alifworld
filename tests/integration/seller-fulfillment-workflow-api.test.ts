/**
 * Milestone 143: Seller Fulfillment Action Workflow REST API Integration Tests
 *
 * Verifies:
 * 1. POST /api/v1/seller/orders/[groupId]/accept - merchant acceptance
 * 2. POST /api/v1/seller/orders/[groupId]/reject - merchant rejection with mandatory reason
 * 3. POST /api/v1/seller/orders/[groupId]/pack - warehouse packaging started
 * 4. POST /api/v1/seller/orders/[groupId]/ready-for-pickup - logistics ready
 * 5. POST /api/v1/seller/orders/[groupId]/handover - courier handover
 * 6. GET /api/v1/seller/orders/[groupId]/manifest - warehouse packing slip manifest
 * 7. Cross-tenant negative security tests (403 TENANT_VIOLATION)
 * 8. Idempotency-Key header enforcement across all mutation endpoints
 */

import { describe, it, expect, beforeEach, afterEach, spyOn, mock } from 'bun:test';
import { NextRequest } from 'next/server';
import * as authzModule from '@/shared/authz';
import { POST as acceptRoute } from '@/app/api/v1/seller/orders/[groupId]/accept/route';
import { POST as rejectRoute } from '@/app/api/v1/seller/orders/[groupId]/reject/route';
import { POST as packRoute } from '@/app/api/v1/seller/orders/[groupId]/pack/route';
import { POST as readyForPickupRoute } from '@/app/api/v1/seller/orders/[groupId]/ready-for-pickup/route';
import { POST as handoverRoute } from '@/app/api/v1/seller/orders/[groupId]/handover/route';
import { GET as manifestRoute } from '@/app/api/v1/seller/orders/[groupId]/manifest/route';
import { sellerFulfillmentOrderService } from '@/features/orders/services/seller-fulfillment-order.service';
import { AuthorizationError, ConflictError, NotFoundError } from '@/shared/errors/app-error';

describe('Milestone 143: Seller Fulfillment Action Workflow REST API Integration Tests', () => {
  let authSpy: any;

  const sellerAlphaActor = {
    userId: 'usr_seller_alpha',
    roles: ['SELLER_OWNER'],
    permissions: ['orders:manage', 'orders:read'],
    sellerId: 'sel_alpha',
  };

  const sellerBetaActor = {
    userId: 'usr_seller_beta',
    roles: ['SELLER_OWNER'],
    permissions: ['orders:manage', 'orders:read'],
    sellerId: 'sel_beta',
  };

  const customerActor = {
    userId: 'usr_customer_01',
    roles: ['CUSTOMER'],
    permissions: ['orders:read'],
    sellerId: null,
  };

  const sampleOrderDTO: any = {
    id: 'sfg_alpha_1',
    orderId: 'ord_sample_01',
    orderNumber: 'ORD-20261015-001',
    groupNumber: 'SFG-20261015-SEL01',
    sellerId: 'sel_alpha',
    sellerName: 'Alpha Store',
    status: 'ACCEPTED',
    statusLabelEn: 'Accepted by Seller',
    statusLabelBn: 'বিক্রেতা কর্তৃক গৃহীত',
    financialBreakdown: {
      subtotalPoisha: 120000,
      subtotalBdtFormatted: '৳1,200.00',
      sellerCommissionPoisha: 6000,
      sellerCommissionBdtFormatted: '৳60.00',
      sellerPayoutPoisha: 114000,
      sellerPayoutBdtFormatted: '৳1,140.00',
    },
    items: [],
    shipments: [],
  };

  const sampleManifestDTO: any = {
    groupNumber: 'SFG-20261015-SEL01',
    orderNumber: 'ORD-20261015-001',
    orderDate: new Date().toISOString(),
    seller: {
      id: 'sel_alpha',
      businessName: 'Alpha Store',
      tradeLicenseNumber: null,
      phone: null,
    },
    recipient: {
      name: 'Tariq Islam',
      phone: '+8801711223344',
      address: 'House 10, Road 5, Dhanmondi',
      division: 'DHAKA',
      district: 'Dhaka',
      upazila: null,
      postalCode: '1205',
    },
    logistics: {
      courierProvider: 'PATHAO',
      consignmentId: 'CSG-01',
      trackingNumber: 'PTH-001',
      estimatedDelivery: null,
      totalWeightGrams: 500,
      totalItems: 2,
    },
    financialSummary: {
      subtotalPoisha: 120000,
      subtotalBdtFormatted: '৳1,200.00',
      shippingFeePoisha: 6000,
      shippingFeeBdtFormatted: '৳60.00',
      taxPoisha: 0,
      taxBdtFormatted: '৳0.00',
      totalPoisha: 126000,
      totalBdtFormatted: '৳1,260.00',
      isCod: true,
      amountToCollectPoisha: 126000,
      amountToCollectBdtFormatted: '৳1,260.00',
    },
    items: [
      {
        sku: 'SKU-001',
        productTitle: 'Panjabi',
        variantTitle: 'Large White',
        quantity: 2,
        unitPricePoisha: 60000,
        unitPriceBdtFormatted: '৳600.00',
        totalPoisha: 120000,
        totalBdtFormatted: '৳1,200.00',
      },
    ],
    generatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    authSpy = spyOn(authzModule, 'authenticateRequest').mockReturnValue(sellerAlphaActor as any);
  });

  afterEach(() => {
    mock.restore();
  });

  describe('1. POST /api/v1/seller/orders/[groupId]/accept', () => {
    it('accepts fulfillment order and returns updated order DTO', async () => {
      const acceptSpy = spyOn(
        sellerFulfillmentOrderService,
        'acceptFulfillmentOrder'
      ).mockResolvedValue(sampleOrderDTO);

      const req = new NextRequest('http://localhost:3000/api/v1/seller/orders/sfg_alpha_1/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': 'idemp_accept_01',
        },
        body: JSON.stringify({ note: 'Accepted for packaging' }),
      });

      const res = await acceptRoute(req, { params: Promise.resolve({ groupId: 'sfg_alpha_1' }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.status).toBe('ACCEPTED');
      expect(acceptSpy).toHaveBeenCalledWith(
        'sfg_alpha_1',
        'sel_alpha',
        { note: 'Accepted for packaging' },
        { actorId: 'usr_seller_alpha', actorRole: 'SELLER', idempotencyKey: 'idemp_accept_01' }
      );
    });

    it('rejects accept request when Idempotency-Key header is missing with 422', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/seller/orders/sfg_alpha_1/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const res = await acceptRoute(req, { params: Promise.resolve({ groupId: 'sfg_alpha_1' }) });
      expect(res.status).toBe(422);
    });

    it('blocks cross-tenant accept with 403 TENANT_VIOLATION', async () => {
      authSpy.mockReturnValue(sellerBetaActor);
      spyOn(sellerFulfillmentOrderService, 'acceptFulfillmentOrder').mockRejectedValue(
        new AuthorizationError('Tenant access violation', { code: 'TENANT_VIOLATION' })
      );

      const req = new NextRequest('http://localhost:3000/api/v1/seller/orders/sfg_alpha_1/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': 'idemp_accept_cross',
        },
        body: JSON.stringify({}),
      });

      const res = await acceptRoute(req, { params: Promise.resolve({ groupId: 'sfg_alpha_1' }) });
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.error.code).toBe('FORBIDDEN');
      expect(json.error.details?.code).toBe('TENANT_VIOLATION');
    });

    it('returns 409 when attempting invalid transition from terminal status', async () => {
      spyOn(sellerFulfillmentOrderService, 'acceptFulfillmentOrder').mockRejectedValue(
        new ConflictError('Cannot transition from terminal state', { code: 'TERMINAL_STATE' })
      );

      const req = new NextRequest('http://localhost:3000/api/v1/seller/orders/sfg_alpha_1/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': 'idemp_accept_conflict',
        },
        body: JSON.stringify({}),
      });

      const res = await acceptRoute(req, { params: Promise.resolve({ groupId: 'sfg_alpha_1' }) });
      expect(res.status).toBe(409);
    });
  });

  describe('2. POST /api/v1/seller/orders/[groupId]/reject', () => {
    it('rejects fulfillment order with valid mandatory reason', async () => {
      const rejectSpy = spyOn(
        sellerFulfillmentOrderService,
        'rejectFulfillmentOrder'
      ).mockResolvedValue({
        ...sampleOrderDTO,
        status: 'REJECTED',
      });

      const req = new NextRequest('http://localhost:3000/api/v1/seller/orders/sfg_alpha_1/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': 'idemp_reject_01',
        },
        body: JSON.stringify({
          reason: 'Inventory damaged in warehouse during pre-check',
          rejectionCode: 'DAMAGED_INVENTORY',
        }),
      });

      const res = await rejectRoute(req, { params: Promise.resolve({ groupId: 'sfg_alpha_1' }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.status).toBe('REJECTED');
      expect(rejectSpy).toHaveBeenCalled();
    });

    it('rejects rejection request when reason is under 5 characters with 422', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/seller/orders/sfg_alpha_1/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': 'idemp_reject_short',
        },
        body: JSON.stringify({ reason: 'No' }),
      });

      const res = await rejectRoute(req, { params: Promise.resolve({ groupId: 'sfg_alpha_1' }) });
      expect(res.status).toBe(422);
    });
  });

  describe('3. POST /api/v1/seller/orders/[groupId]/pack', () => {
    it('starts packing accepted fulfillment order', async () => {
      const packSpy = spyOn(
        sellerFulfillmentOrderService,
        'startPackingFulfillmentOrder'
      ).mockResolvedValue({
        ...sampleOrderDTO,
        status: 'PACKING',
      });

      const req = new NextRequest('http://localhost:3000/api/v1/seller/orders/sfg_alpha_1/pack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': 'idemp_pack_01',
        },
        body: JSON.stringify({ packingNotes: 'Box packed with tamper-proof seal' }),
      });

      const res = await packRoute(req, { params: Promise.resolve({ groupId: 'sfg_alpha_1' }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.status).toBe('PACKING');
      expect(packSpy).toHaveBeenCalled();
    });
  });

  describe('4. POST /api/v1/seller/orders/[groupId]/ready-for-pickup', () => {
    it('marks packed package ready for courier logistics pickup', async () => {
      const rfpSpy = spyOn(sellerFulfillmentOrderService, 'markReadyForPickup').mockResolvedValue({
        ...sampleOrderDTO,
        status: 'READY_FOR_PICKUP',
      });

      const req = new NextRequest(
        'http://localhost:3000/api/v1/seller/orders/sfg_alpha_1/ready-for-pickup',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': 'idemp_rfp_01',
          },
          body: JSON.stringify({
            packageCount: 1,
            totalWeightGrams: 500,
            packagingNotes: 'Bubble wrapped and sealed',
          }),
        }
      );

      const res = await readyForPickupRoute(req, {
        params: Promise.resolve({ groupId: 'sfg_alpha_1' }),
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.status).toBe('READY_FOR_PICKUP');
      expect(rfpSpy).toHaveBeenCalled();
    });
  });

  describe('5. POST /api/v1/seller/orders/[groupId]/handover', () => {
    it('confirms handover to courier with consignment details', async () => {
      const handoverSpy = spyOn(
        sellerFulfillmentOrderService,
        'handoverFulfillmentOrder'
      ).mockResolvedValue({
        ...sampleOrderDTO,
        status: 'HANDED_OVER_TO_COURIER',
        logistics: {
          courierProvider: 'STEADFAST',
          trackingNumber: 'STF-882192',
          consignmentId: 'CSG-STF-02',
        },
      });

      const req = new NextRequest(
        'http://localhost:3000/api/v1/seller/orders/sfg_alpha_1/handover',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': 'idemp_handover_01',
          },
          body: JSON.stringify({
            courierProvider: 'STEADFAST',
            trackingNumber: 'STF-882192',
            consignmentId: 'CSG-STF-02',
          }),
        }
      );

      const res = await handoverRoute(req, { params: Promise.resolve({ groupId: 'sfg_alpha_1' }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.status).toBe('HANDED_OVER_TO_COURIER');
      expect(handoverSpy).toHaveBeenCalled();
    });
  });

  describe('6. GET /api/v1/seller/orders/[groupId]/manifest', () => {
    it('returns warehouse packing slip manifest with routing details', async () => {
      const manifestSpy = spyOn(
        sellerFulfillmentOrderService,
        'getPackingSlipManifest'
      ).mockResolvedValue(sampleManifestDTO);

      const req = new NextRequest(
        'http://localhost:3000/api/v1/seller/orders/sfg_alpha_1/manifest',
        {
          method: 'GET',
        }
      );

      const res = await manifestRoute(req, { params: Promise.resolve({ groupId: 'sfg_alpha_1' }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.groupNumber).toBe('SFG-20261015-SEL01');
      expect(json.data.financialSummary.isCod).toBe(true);
      expect(json.data.items.length).toBe(1);
      expect(manifestSpy).toHaveBeenCalledWith('sfg_alpha_1', 'sel_alpha');
    });

    it('blocks cross-tenant manifest inspection with 403 TENANT_VIOLATION', async () => {
      authSpy.mockReturnValue(sellerBetaActor);
      spyOn(sellerFulfillmentOrderService, 'getPackingSlipManifest').mockRejectedValue(
        new AuthorizationError('Tenant access violation', { code: 'TENANT_VIOLATION' })
      );

      const req = new NextRequest(
        'http://localhost:3000/api/v1/seller/orders/sfg_alpha_1/manifest',
        {
          method: 'GET',
        }
      );

      const res = await manifestRoute(req, { params: Promise.resolve({ groupId: 'sfg_alpha_1' }) });
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.error.code).toBe('FORBIDDEN');
      expect(json.error.details?.code).toBe('TENANT_VIOLATION');
    });

    it('returns 404 when fulfillment order does not exist', async () => {
      spyOn(sellerFulfillmentOrderService, 'getPackingSlipManifest').mockRejectedValue(
        new NotFoundError('Fulfillment order not found')
      );

      const req = new NextRequest(
        'http://localhost:3000/api/v1/seller/orders/non_existent/manifest',
        {
          method: 'GET',
        }
      );

      const res = await manifestRoute(req, {
        params: Promise.resolve({ groupId: 'non_existent' }),
      });
      expect(res.status).toBe(404);
    });

    it('returns 403 when customer attempts to access seller manifest', async () => {
      authSpy.mockReturnValue(customerActor);

      const req = new NextRequest(
        'http://localhost:3000/api/v1/seller/orders/sfg_alpha_1/manifest',
        {
          method: 'GET',
        }
      );

      const res = await manifestRoute(req, { params: Promise.resolve({ groupId: 'sfg_alpha_1' }) });
      expect(res.status).toBe(403);
    });
  });
});
