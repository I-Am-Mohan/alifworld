/**
 * Milestone 135: Seller Fulfillment Group REST API & Tenant Isolation Integration Tests
 *
 * Verifies:
 * 1. GET /api/v1/seller/fulfillment-groups - merchant-scoped listing
 * 2. Cross-tenant negative security tests (TENANT_VIOLATION 403)
 * 3. PATCH /api/v1/seller/fulfillment-groups/[id]/status - state machine progression
 * 4. POST /api/v1/seller/fulfillment-groups/[id]/dispatch - courier dispatching
 * 5. GET /api/v1/seller/fulfillment-groups/[id]/manifest - packing slip generation
 * 6. GET /api/v1/admin/fulfillment-groups - administrative inspection across all sellers
 */

import { describe, it, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import * as authzModule from '@/shared/authz';
import { GET as listSellerGroupsRoute } from '@/app/api/v1/seller/fulfillment-groups/route';
import { GET as getSellerGroupRoute } from '@/app/api/v1/seller/fulfillment-groups/[id]/route';
import { PATCH as updateGroupStatusRoute } from '@/app/api/v1/seller/fulfillment-groups/[id]/status/route';
import { POST as dispatchGroupRoute } from '@/app/api/v1/seller/fulfillment-groups/[id]/dispatch/route';
import { GET as getManifestRoute } from '@/app/api/v1/seller/fulfillment-groups/[id]/manifest/route';
import { GET as listAdminGroupsRoute } from '@/app/api/v1/admin/fulfillment-groups/route';
import { GET as getAdminGroupRoute } from '@/app/api/v1/admin/fulfillment-groups/[id]/route';
import { sellerFulfillmentGroupService } from '@/features/fulfillment';
import { NextRequest } from 'next/server';

describe('Milestone 135: Seller Fulfillment Group REST API Integration Tests', () => {
  let authSpy: any;

  const sellerAlphaActor = {
    userId: 'usr_seller_alpha',
    roles: ['SELLER_OWNER'],
    permissions: ['seller.orders.read', 'seller.orders.write'],
    sellerId: 'sel_merchant_alpha',
  };

  const sellerBetaActor = {
    userId: 'usr_seller_beta',
    roles: ['SELLER_OWNER'],
    permissions: ['seller.orders.read', 'seller.orders.write'],
    sellerId: 'sel_merchant_beta',
  };

  const adminActor = {
    userId: 'usr_admin_01',
    roles: ['ADMIN'],
    permissions: ['admin.fulfillment.read'],
    sellerId: null,
  };

  const sampleGroupAlpha = {
    id: 'sfg_alpha_001',
    orderId: 'ord_sample_01',
    orderNumber: 'ORD-20261015-001',
    sellerId: 'sel_merchant_alpha',
    sellerName: 'Alpha Textiles',
    groupNumber: 'SFG-20261015-SEL01',
    status: 'PENDING' as const,
    subtotalPoisha: 120000,
    subtotalBdtFormatted: '৳1,200.00',
    discountPoisha: 0,
    sellerDiscountPoisha: 0,
    platformDiscountPoisha: 0,
    shippingFeePoisha: 6000,
    shippingFeeBdtFormatted: '৳60.00',
    taxPoisha: 18000,
    taxBdtFormatted: '৳180.00',
    totalPoisha: 144000,
    totalBdtFormatted: '৳1,440.00',
    sellerCommissionPoisha: 6000,
    sellerCommissionBdtFormatted: '৳60.00',
    sellerPayoutPoisha: 138000,
    sellerPayoutBdtFormatted: '৳1,380.00',
    totalProductPoints: 200,
    shippingDestination: {
      recipientName: 'Tariq Islam',
      recipientPhone: '+8801711223344',
      division: 'DHAKA',
      district: 'Dhaka',
      address: 'House 10, Road 5, Dhanmondi',
    },
    items: [
      {
        id: 'itm_001',
        variantId: 'var_001',
        productTitle: 'Panjabi',
        variantTitle: 'Large White',
        sku: 'PAN-WHT-L',
        unitPricePoisha: 120000,
        unitPriceBdtFormatted: '৳1,200.00',
        quantity: 1,
        totalPoisha: 120000,
        totalBdtFormatted: '৳1,200.00',
        discountPoisha: 0,
        sellerDiscountPoisha: 0,
        platformDiscountPoisha: 0,
        taxRatePercent: 15,
        taxPoisha: 18000,
        productPointSnapshot: 200,
        totalProductPoints: 200,
        status: 'PENDING',
      },
    ],
    shipments: [],
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    authSpy = spyOn(authzModule, 'authenticateRequest').mockReturnValue(sellerAlphaActor as any);
  });

  afterEach(() => {
    authSpy?.mockRestore();
  });

  describe('1. GET /api/v1/seller/fulfillment-groups (Tenant-Scoped Listing)', () => {
    it('returns fulfillment groups scoped exclusively to the seller tenant', async () => {
      const listSpy = spyOn(sellerFulfillmentGroupService, 'listGroupsForSeller').mockResolvedValue(
        {
          items: [sampleGroupAlpha],
          total: 1,
          page: 1,
          limit: 20,
        }
      );

      const req = new NextRequest(
        'http://localhost:3000/api/v1/seller/fulfillment-groups?page=1&limit=20',
        { method: 'GET' }
      );

      const response = await listSellerGroupsRoute(req);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.length).toBe(1);
      expect(json.data[0].sellerId).toBe('sel_merchant_alpha');

      // Verify that service was invoked with sellerAlphaActor's sellerId
      expect(listSpy).toHaveBeenCalledWith('sel_merchant_alpha', expect.any(Object));

      listSpy.mockRestore();
    });

    it('rejects cross-tenant spoofing when seller passes a different sellerId parameter', async () => {
      // Seller Alpha passes ?sellerId=sel_merchant_beta
      const req = new NextRequest(
        'http://localhost:3000/api/v1/seller/fulfillment-groups?sellerId=sel_merchant_beta',
        { method: 'GET' }
      );

      const response = await listSellerGroupsRoute(req);
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('FORBIDDEN');
    });
  });

  describe('2. Cross-Tenant Object Access Guards (Negative Security Tests)', () => {
    it('blocks Seller Beta from accessing Seller Alpha fulfillment group', async () => {
      authSpy.mockReturnValue(sellerBetaActor as any);

      // Attempt to access Seller Alpha's group
      const req = new NextRequest(
        'http://localhost:3000/api/v1/seller/fulfillment-groups/sfg_alpha_001',
        { method: 'GET' }
      );

      const response = await getSellerGroupRoute(req, {
        params: Promise.resolve({ id: 'sfg_alpha_001' }),
      });
      const json = await response.json();

      // Should be 403 Forbidden or 404 Not Found (under Beta's tenant)
      expect([403, 404]).toContain(response.status);
      expect(json.success).toBe(false);
    });

    it('blocks Seller Beta from updating status of Seller Alpha fulfillment group', async () => {
      authSpy.mockReturnValue(sellerBetaActor as any);

      const req = new NextRequest(
        'http://localhost:3000/api/v1/seller/fulfillment-groups/sfg_alpha_001/status',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'cross-tenant-test' },
          body: JSON.stringify({ status: 'ACCEPTED' }),
        }
      );

      const response = await updateGroupStatusRoute(req, {
        params: Promise.resolve({ id: 'sfg_alpha_001' }),
      });
      const json = await response.json();

      expect([403, 404]).toContain(response.status);
      expect(json.success).toBe(false);
    });

    it('blocks Seller Beta from dispatching Seller Alpha fulfillment group', async () => {
      authSpy.mockReturnValue(sellerBetaActor as any);

      const req = new NextRequest(
        'http://localhost:3000/api/v1/seller/fulfillment-groups/sfg_alpha_001/dispatch',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courierProvider: 'PATHAO' }),
        }
      );

      const response = await dispatchGroupRoute(req, {
        params: Promise.resolve({ id: 'sfg_alpha_001' }),
      });
      const json = await response.json();

      expect([403, 404]).toContain(response.status);
      expect(json.success).toBe(false);
    });
  });

  describe('3. State Machine Progression (PATCH status)', () => {
    it('requires a replay key and order permission before invoking the service', async () => {
      const transitionSpy = spyOn(sellerFulfillmentGroupService, 'transitionGroupStatus');
      try {
        const request = () =>
          new NextRequest('http://localhost:3000/api/v1/seller/fulfillment-groups/group-1/status', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'ACCEPTED' }),
          });
        const missingKey = await updateGroupStatusRoute(request(), {
          params: Promise.resolve({ id: 'group-1' }),
        });
        expect(missingKey.status).toBe(422);
        authSpy.mockReturnValue({ ...sellerAlphaActor, permissions: [] });
        const missingPermission = await updateGroupStatusRoute(request(), {
          params: Promise.resolve({ id: 'group-1' }),
        });
        expect(missingPermission.status).toBe(403);
        expect(transitionSpy).not.toHaveBeenCalled();
      } finally {
        transitionSpy.mockRestore();
      }
    });
    it('allows merchant to advance status from PENDING to ACCEPTED', async () => {
      const transitionSpy = spyOn(
        sellerFulfillmentGroupService,
        'transitionGroupStatus'
      ).mockResolvedValue({
        ...sampleGroupAlpha,
        status: 'ACCEPTED',
      } as any);

      const req = new NextRequest(
        'http://localhost:3000/api/v1/seller/fulfillment-groups/sfg_alpha_001/status',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'accept-test' },
          body: JSON.stringify({
            status: 'ACCEPTED',
            reason: 'Merchant accepted order for packing',
          }),
        }
      );

      const response = await updateGroupStatusRoute(req, {
        params: Promise.resolve({ id: 'sfg_alpha_001' }),
      });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.status).toBe('ACCEPTED');

      transitionSpy.mockRestore();
    });

    it('rejects invalid state machine transition payload with 422', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/v1/seller/fulfillment-groups/sfg_alpha_001/status',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'INVALID_STATUS',
          }),
        }
      );

      const response = await updateGroupStatusRoute(req, {
        params: Promise.resolve({ id: 'sfg_alpha_001' }),
      });
      const json = await response.json();

      expect(response.status).toBe(422);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('VALIDATION_FAILED');
    });
  });

  describe('4. Courier Dispatch Integration', () => {
    it('dispatches fulfillment package to courier and advances status to HANDED_OVER_TO_COURIER', async () => {
      const dispatchSpy = spyOn(
        sellerFulfillmentGroupService,
        'dispatchGroupToCourier'
      ).mockResolvedValue({
        group: {
          ...sampleGroupAlpha,
          status: 'HANDED_OVER_TO_COURIER',
          courierProvider: 'PATHAO',
          consignmentId: 'PTH-20261015-112233',
          trackingNumber: 'TRK-PTH-112233',
        } as any,
        consignmentId: 'PTH-20261015-112233',
        trackingNumber: 'TRK-PTH-112233',
        labelUrl: 'https://cdn.alifworld.com/labels/pathao/PTH-112233.pdf',
      });

      const req = new NextRequest(
        'http://localhost:3000/api/v1/seller/fulfillment-groups/sfg_alpha_001/dispatch',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courierProvider: 'PATHAO',
            specialInstructions: 'Handle with care',
          }),
        }
      );

      const response = await dispatchGroupRoute(req, {
        params: Promise.resolve({ id: 'sfg_alpha_001' }),
      });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.consignmentId).toBe('PTH-20261015-112233');
      expect(json.data.trackingNumber).toBe('TRK-PTH-112233');
      expect(json.data.group.status).toBe('HANDED_OVER_TO_COURIER');

      dispatchSpy.mockRestore();
    });
  });

  describe('5. Packing Slip Manifest Generation', () => {
    it('generates printable packing slip manifest for warehouse packing', async () => {
      const manifestSpy = spyOn(
        sellerFulfillmentGroupService,
        'getPackingSlipManifest'
      ).mockResolvedValue({
        groupNumber: 'SFG-20261015-SEL01',
        orderNumber: 'ORD-20261015-001',
        orderDate: new Date().toISOString(),
        seller: {
          id: 'sel_merchant_alpha',
          businessName: 'Alpha Textiles',
          tradeLicenseNumber: 'TL-12345',
          phone: '+8801711223344',
        },
        recipient: {
          name: 'Tariq Islam',
          phone: '+8801711223344',
          address: 'House 10, Road 5, Dhanmondi',
          division: 'DHAKA',
          district: 'Dhaka',
          upazila: 'Dhanmondi',
          postalCode: '1205',
        },
        logistics: {
          courierProvider: 'PATHAO',
          consignmentId: 'PTH-123',
          trackingNumber: 'TRK-123',
          estimatedDelivery: null,
          totalWeightGrams: 500,
          totalItems: 1,
        },
        financialSummary: {
          subtotalPoisha: 120000,
          subtotalBdtFormatted: '৳1,200.00',
          shippingFeePoisha: 6000,
          shippingFeeBdtFormatted: '৳60.00',
          taxPoisha: 18000,
          taxBdtFormatted: '৳180.00',
          totalPoisha: 144000,
          totalBdtFormatted: '৳1,440.00',
          isCod: true,
          amountToCollectPoisha: 144000,
          amountToCollectBdtFormatted: '৳1,440.00',
        },
        items: [
          {
            sku: 'PAN-WHT-L',
            productTitle: 'Panjabi',
            variantTitle: 'Large White',
            quantity: 1,
            unitPricePoisha: 120000,
            unitPriceBdtFormatted: '৳1,200.00',
            totalPoisha: 120000,
            totalBdtFormatted: '৳1,200.00',
          },
        ],
        generatedAt: new Date().toISOString(),
      });

      const req = new NextRequest(
        'http://localhost:3000/api/v1/seller/fulfillment-groups/sfg_alpha_001/manifest',
        { method: 'GET' }
      );

      const response = await getManifestRoute(req, {
        params: Promise.resolve({ id: 'sfg_alpha_001' }),
      });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.groupNumber).toBe('SFG-20261015-SEL01');
      expect(json.data.financialSummary.totalBdtFormatted).toBe('৳1,440.00');
      expect(json.data.items.length).toBe(1);

      manifestSpy.mockRestore();
    });
  });

  describe('6. Admin Global Inspection', () => {
    it('blocks regular sellers from accessing admin fulfillment endpoints', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/admin/fulfillment-groups', {
        method: 'GET',
      });

      const response = await listAdminGroupsRoute(req);
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('FORBIDDEN');
    });

    it('allows Admin to list fulfillment groups across all sellers', async () => {
      authSpy.mockReturnValue(adminActor as any);

      const adminListSpy = spyOn(
        sellerFulfillmentGroupService,
        'listGroupsAdmin'
      ).mockResolvedValue({
        items: [sampleGroupAlpha],
        total: 1,
        page: 1,
        limit: 20,
      });

      const req = new NextRequest(
        'http://localhost:3000/api/v1/admin/fulfillment-groups?page=1&limit=20',
        { method: 'GET' }
      );

      const response = await listAdminGroupsRoute(req);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.length).toBe(1);

      adminListSpy.mockRestore();
    });
  });
});
