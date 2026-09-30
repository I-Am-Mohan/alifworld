/**
 * Milestone 134: Bangladesh Courier Logistics & Delivery REST API Integration Tests
 *
 * Verifies:
 * 1. GET /api/v1/shipping/couriers - lists available couriers with readiness and COD thresholds
 * 2. POST /api/v1/shipping/consignments - dispatches package, normalizes phone, and generates tracking
 * 3. GET /api/v1/shipping/track/[trackingNumber] - public tracking with PII masking and bilingual timeline
 * 4. POST /api/v1/shipping/consignments/[consignmentId]/cancel - consignment cancellation
 * 5. POST /api/v1/shipping/in-house/verify-delivery - rider doorstep OTP/PIN verification
 * 6. POST /api/v1/shipping/webhooks/[courier] - asynchronous courier webhook ingestion
 */

import { describe, it, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import * as authzModule from '@/shared/authz';
import { GET as listCouriersRoute } from '@/app/api/v1/shipping/couriers/route';
import {
  GET as listConsignmentsRoute,
  POST as createConsignmentRoute,
} from '@/app/api/v1/shipping/consignments/route';
import { GET as trackShipmentRoute } from '@/app/api/v1/shipping/track/[trackingNumber]/route';
import { POST as cancelConsignmentRoute } from '@/app/api/v1/shipping/consignments/[consignmentId]/cancel/route';
import { POST as verifyInHouseDeliveryRoute } from '@/app/api/v1/shipping/in-house/verify-delivery/route';
import { POST as courierWebhookRoute } from '@/app/api/v1/shipping/webhooks/[courier]/route';
import { courierDispatchService, shipmentRepository } from '@/features/shipping';
import { NextRequest } from 'next/server';

describe('Milestone 134: Courier Logistics & Delivery REST API Integration Tests', () => {
  let authSpy: any;

  const sellerActor = {
    userId: 'usr_seller_01',
    roles: ['SELLER'],
    permissions: ['shipments.manage'],
    sellerId: 'sel_merchant_01',
  };

  const riderActor = {
    userId: 'usr_rider_01',
    roles: ['RIDER'],
    permissions: ['deliveries.verify'],
    sellerId: null,
  };

  beforeEach(() => {
    authSpy = spyOn(authzModule, 'authenticateRequest').mockReturnValue(sellerActor as any);
  });

  afterEach(() => {
    authSpy?.mockRestore();
  });

  describe('1. GET /api/v1/shipping/couriers', () => {
    it('returns list of registered Bangladesh couriers with metadata', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/shipping/couriers', {
        method: 'GET',
      });

      const response = await listCouriersRoute(req);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBe(5);

      const codes = json.data.map((c: any) => c.code);
      expect(codes).toContain('PATHAO');
      expect(codes).toContain('STEADFAST');
      expect(codes).toContain('REDX');
      expect(codes).toContain('PAPERFLY');
      expect(codes).toContain('IN_HOUSE');
    });
  });

  describe('2. POST & GET /api/v1/shipping/consignments', () => {
    it('rejects customer, missing-permission, and cross-tenant shipment reads before querying', async () => {
      const listSpy = spyOn(shipmentRepository, 'listShipments');
      try {
        for (const actor of [
          { ...sellerActor, roles: ['CUSTOMER'], sellerId: null },
          { ...sellerActor, permissions: [] },
          sellerActor,
        ]) {
          authSpy.mockReturnValue(actor);
          const response = await listConsignmentsRoute(
            new NextRequest(
              'http://localhost:3000/api/v1/shipping/consignments?sellerId=foreign-seller'
            )
          );
          expect(response.status).toBe(403);
        }
        expect(listSpy).not.toHaveBeenCalled();
      } finally {
        listSpy.mockRestore();
      }
    });

    it('rejects unbounded or invalid shipment filters', async () => {
      for (const query of ['limit=101', 'page=0', 'status=UNKNOWN', 'courierProvider=UNKNOWN']) {
        const response = await listConsignmentsRoute(
          new NextRequest(`http://localhost:3000/api/v1/shipping/consignments?${query}`)
        );
        expect(response.status).toBe(422);
      }
    });
    it('creates consignment and normalizes recipient phone to E.164', async () => {
      const mockResult = {
        success: true,
        courierCode: 'STEADFAST' as const,
        consignmentId: 'STF-20261015-888999',
        trackingNumber: 'TRK-STF-888999',
        trackingUrl: 'https://steadfast.com.bd/t/TRK-STF-888999',
        labelUrl: null,
        status: 'LABEL_CREATED' as const,
        courierFeePoisha: 12000,
        courierFeeBdtFormatted: '৳120.00',
        message: 'Consignment created successfully.',
      };

      const dispatchSpy = spyOn(courierDispatchService, 'createConsignment').mockResolvedValue(
        mockResult as any
      );

      const req = new NextRequest('http://localhost:3000/api/v1/shipping/consignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fulfillmentGroupId: 'sfg_sample_001',
          courierProvider: 'STEADFAST',
          recipientName: 'Kamal Hossain',
          recipientPhone: '01812345678', // un-prefixed Bangladesh format
          deliveryAddress: 'Station Road, Sylhet',
          division: 'SYLHET',
          district: 'Sylhet',
          codAmountPoisha: 150000,
          isPrepaid: false,
          totalWeightGrams: 800,
        }),
      });

      const response = await createConsignmentRoute(req);
      const json = await response.json();

      expect(response.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.consignmentId).toBe('STF-20261015-888999');
      expect(json.data.trackingNumber).toBe('TRK-STF-888999');

      // Verify that recipientPhone was transformed to +8801812345678 before reaching service
      expect(dispatchSpy).toHaveBeenCalled();
      const calledInput = dispatchSpy.mock.calls[0][0];
      expect(calledInput.recipientPhone).toBe('+8801812345678');

      dispatchSpy.mockRestore();
    });

    it('rejects consignment creation with 422 if required fields are missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/shipping/consignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // missing fulfillmentGroupId and recipientName
          courierProvider: 'PATHAO',
        }),
      });

      const response = await createConsignmentRoute(req);
      const json = await response.json();

      expect(response.status).toBe(422);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('VALIDATION_FAILED');
    });

    it('lists shipments with pagination', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/v1/shipping/consignments?page=1&limit=10',
        { method: 'GET' }
      );

      const response = await listConsignmentsRoute(req);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.pagination).toBeDefined();
    });
  });

  describe('3. GET /api/v1/shipping/track/[trackingNumber]', () => {
    it('returns chronological tracking timeline with masked recipient phone', async () => {
      const mockTracking = {
        shipmentNumber: 'SHP-20261015-001',
        consignmentId: 'PTH-20261015-999',
        trackingNumber: 'TRK-PTH-999',
        courierCode: 'PATHAO' as const,
        courierName: 'Pathao Courier Logistics',
        currentStatus: 'IN_TRANSIT' as const,
        statusLabelEn: 'In Transit Across Logistics Hubs',
        statusLabelBn: 'পরিবহনরত (লজিস্টিক হাবের মাধ্যমে)',
        currentLocation: 'Tejgaon Sorting Hub',
        recipientName: 'Nazmul Islam',
        recipientPhoneMasked: '+88017****4321',
        deliveryAddress: 'Uttara Sector 3, Dhaka',
        division: 'DHAKA',
        district: 'Dhaka',
        upazila: 'Uttara',
        codAmountPoisha: 0,
        codAmountBdtFormatted: '৳0.00',
        isPrepaid: true,
        isDelivered: false,
        events: [
          {
            status: 'PENDING' as const,
            location: 'Dhaka Hub',
            description: 'Order registered',
            occurredAt: new Date().toISOString(),
          },
          {
            status: 'IN_TRANSIT' as const,
            location: 'Tejgaon Hub',
            description: 'In sorting process',
            occurredAt: new Date().toISOString(),
          },
        ],
        lastSyncedAt: new Date().toISOString(),
      };

      const trackSpy = spyOn(courierDispatchService, 'trackShipment').mockResolvedValue(
        mockTracking as any
      );

      const req = new NextRequest('http://localhost:3000/api/v1/shipping/track/TRK-PTH-999', {
        method: 'GET',
      });

      const response = await trackShipmentRoute(req, {
        params: Promise.resolve({ trackingNumber: 'TRK-PTH-999' }),
      });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.trackingNumber).toBe('TRK-PTH-999');
      expect(json.data.recipientPhoneMasked).toBe('+88017****4321');
      expect(json.data.statusLabelEn).toBeDefined();
      expect(json.data.statusLabelBn).toBeDefined();
      expect(json.data.events.length).toBe(2);

      trackSpy.mockRestore();
    });
  });

  describe('4. POST /api/v1/shipping/consignments/[consignmentId]/cancel', () => {
    it('cancels unpicked consignment and returns confirmation', async () => {
      const cancelSpy = spyOn(courierDispatchService, 'cancelConsignment').mockResolvedValue({
        success: true,
        consignmentId: 'STF-20261015-888999',
        message: 'Consignment cancelled successfully.',
        cancelledAt: new Date().toISOString(),
      });

      const req = new NextRequest(
        'http://localhost:3000/api/v1/shipping/consignments/STF-20261015-888999/cancel',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'Customer requested address update.' }),
        }
      );

      const response = await cancelConsignmentRoute(req, {
        params: Promise.resolve({ consignmentId: 'STF-20261015-888999' }),
      });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.consignmentId).toBe('STF-20261015-888999');

      cancelSpy.mockRestore();
    });
  });

  describe('5. POST /api/v1/shipping/in-house/verify-delivery', () => {
    it('verifies doorstep delivery with matching OTP PIN', async () => {
      authSpy.mockReturnValue(riderActor as any);

      const verifySpy = spyOn(courierDispatchService, 'verifyInHouseDelivery').mockResolvedValue({
        success: true,
        message: 'Doorstep delivery confirmed and verified successfully via OTP.',
        deliveredAt: new Date().toISOString(),
      });

      const req = new NextRequest(
        'http://localhost:3000/api/v1/shipping/in-house/verify-delivery',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shipmentId: 'shp_inhouse_001',
            otpCode: '482915',
            riderId: 'usr_rider_01',
            deliveryNotes: 'Delivered to recipient in person at doorstep.',
            recipientSignedName: 'Kazi Farhan',
          }),
        }
      );

      const response = await verifyInHouseDeliveryRoute(req);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.message).toContain('verified successfully via OTP');

      verifySpy.mockRestore();
    });

    it('rejects invalid OTP PIN format with 422', async () => {
      authSpy.mockReturnValue(riderActor as any);

      const req = new NextRequest(
        'http://localhost:3000/api/v1/shipping/in-house/verify-delivery',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shipmentId: 'shp_inhouse_001',
            otpCode: 'not-a-number', // invalid OTP format
            riderId: 'usr_rider_01',
          }),
        }
      );

      const response = await verifyInHouseDeliveryRoute(req);
      const json = await response.json();

      expect(response.status).toBe(422);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('VALIDATION_FAILED');
    });
  });

  describe('6. POST /api/v1/shipping/webhooks/[courier]', () => {
    it('ingests courier webhook status update and syncs shipment state', async () => {
      const webhookSpy = spyOn(courierDispatchService, 'handleCourierWebhook').mockResolvedValue({
        success: true,
        message: 'Shipment status updated to DELIVERED.',
        updatedShipmentId: 'shp_sample_123',
      });

      const req = new NextRequest('http://localhost:3000/api/v1/shipping/webhooks/pathao', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-pathao-signature': 'mock-sig-123',
        },
        body: JSON.stringify({
          consignment_id: 'PTH-20261015-888999',
          order_status: 'Delivered',
          updated_at: '2026-10-15T15:30:00Z',
        }),
      });

      const response = await courierWebhookRoute(req, {
        params: Promise.resolve({ courier: 'pathao' }),
      });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.message).toContain('DELIVERED');

      webhookSpy.mockRestore();
    });
  });
});
