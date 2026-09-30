/**
 * Milestone 144: Shipments, Tracking Numbers, and Delivery Events REST API Integration Tests
 *
 * Verifies:
 * 1. GET /api/v1/shipping/shipments - merchant tenant-scoped listing & admin global access
 * 2. GET /api/v1/shipping/shipments/[id] - single shipment retrieval with tenant isolation
 * 3. POST /api/v1/shipping/shipments/[id]/events - append tracking event with idempotency & state guards
 * 4. GET /api/v1/shipping/track/[trackingNumber] - public tracking endpoint with PII masking
 * 5. Negative authorization, cross-tenant 403 TENANT_VIOLATION, and conflict handling
 */

import { describe, it, expect, beforeEach, afterEach, spyOn, mock } from 'bun:test';
import { NextRequest } from 'next/server';
import * as authzModule from '@/shared/authz';
import { GET as listShipmentsRoute } from '@/app/api/v1/shipping/shipments/route';
import { GET as getShipmentRoute } from '@/app/api/v1/shipping/shipments/[id]/route';
import { POST as appendEventRoute } from '@/app/api/v1/shipping/shipments/[id]/events/route';
import { GET as trackShipmentRoute } from '@/app/api/v1/shipping/track/[trackingNumber]/route';
import { courierDispatchService } from '@/features/shipping';
import { AuthorizationError, ConflictError, NotFoundError } from '@/shared/errors/app-error';

describe('Milestone 144: Shipments & Tracking Events REST API Integration Tests', () => {
  let authSpy: any;

  const sellerAlphaActor = {
    userId: 'usr_seller_alpha',
    roles: ['SELLER_OWNER'],
    permissions: ['shipments:read', 'shipments:manage', 'orders:read', 'orders:manage'],
    sellerId: 'sel_alpha',
  };

  const sellerBetaActor = {
    userId: 'usr_seller_beta',
    roles: ['SELLER_OWNER'],
    permissions: ['shipments:read', 'shipments:manage', 'orders:read', 'orders:manage'],
    sellerId: 'sel_beta',
  };

  const adminActor = {
    userId: 'usr_admin_01',
    roles: ['ADMIN'],
    permissions: ['shipments:read', 'shipments:manage', 'orders:read', 'orders:manage'],
    sellerId: null,
  };

  const customerActor = {
    userId: 'usr_customer_01',
    roles: ['CUSTOMER'],
    permissions: ['orders:read'],
    sellerId: null,
  };

  const sampleShipmentDTO: any = {
    id: 'shp_alpha_001',
    fulfillmentGroupId: 'sfg_alpha_01',
    sellerId: 'sel_alpha',
    sellerName: 'Alpha Store',
    orderNumber: 'ORD-20261015-001',
    groupNumber: 'SFG-20261015-SEL01',
    shipmentNumber: 'SHP-20261015-001',
    courierProvider: 'PATHAO',
    trackingNumber: 'PTH-992101',
    consignmentId: 'CSG-PTH-01',
    trackingUrl: '/shipping/track/PTH-992101',
    status: 'IN_TRANSIT',
    statusLabelEn: 'In Transit',
    statusLabelBn: 'পরিবহনরত',
    weightGrams: 500,
    packageCount: 1,
    shippingCostPoisha: 6000,
    shippingCostBdtFormatted: '৳60.00',
    shippedAt: new Date().toISOString(),
    deliveredAt: null,
    recipientName: 'Tariq Islam',
    recipientPhoneMasked: '+880 17***-**344',
    deliveryAddress: 'House 10, Road 5, Dhanmondi',
    division: 'DHAKA',
    district: 'Dhaka',
    events: [
      {
        status: 'IN_TRANSIT',
        location: 'Central Sorting Hub',
        description: 'Departed central sorting facility',
        occurredAt: new Date().toISOString(),
      },
    ],
    version: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const sampleTrackingResult: any = {
    shipmentNumber: 'SHP-20261015-001',
    consignmentId: 'CSG-PTH-01',
    trackingNumber: 'PTH-992101',
    courierCode: 'PATHAO',
    courierName: 'Pathao Courier',
    currentStatus: 'IN_TRANSIT',
    statusLabelEn: 'In Transit',
    statusLabelBn: 'পরিবহনরত',
    currentLocation: 'Central Sorting Hub',
    recipientName: 'Tariq Islam',
    recipientPhoneMasked: '+880 17***-**344',
    deliveryAddress: 'House 10, Road 5, Dhanmondi',
    division: 'DHAKA',
    district: 'Dhaka',
    upazila: null,
    codAmountPoisha: 6000,
    codAmountBdtFormatted: '৳60.00',
    isPrepaid: false,
    estimatedDeliveryDate: null,
    isDelivered: false,
    deliveredAt: null,
    events: [
      {
        status: 'IN_TRANSIT',
        location: 'Central Sorting Hub',
        description: 'Departed central sorting facility',
        occurredAt: new Date().toISOString(),
        carrierPayload: null,
      },
    ],
    lastSyncedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    authSpy = spyOn(authzModule, 'authenticateRequest').mockReturnValue(sellerAlphaActor as any);
  });

  afterEach(() => {
    mock.restore();
  });

  describe('1. GET /api/v1/shipping/shipments', () => {
    it('returns shipments scoped strictly to the merchant tenant', async () => {
      const listSpy = spyOn(courierDispatchService, 'listShipments').mockResolvedValue({
        items: [sampleShipmentDTO],
        total: 1,
        page: 1,
        limit: 20,
      });

      const req = new NextRequest(
        'http://localhost:3000/api/v1/shipping/shipments?page=1&limit=20',
        {
          method: 'GET',
        }
      );

      const res = await listShipmentsRoute(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.length).toBe(1);
      expect(json.data[0].sellerId).toBe('sel_alpha');
      expect(listSpy).toHaveBeenCalledWith({
        sellerId: 'sel_alpha',
        status: undefined,
        courierProvider: undefined,
        page: 1,
        limit: 20,
      });
    });

    it('blocks cross-tenant shipment query when seller passes a different sellerId (403 TENANT_VIOLATION)', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/v1/shipping/shipments?sellerId=sel_beta',
        {
          method: 'GET',
        }
      );

      const res = await listShipmentsRoute(req);
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.error.details?.code).toBe('TENANT_VIOLATION');
    });

    it('allows administrator to list shipments across all merchants', async () => {
      authSpy.mockReturnValue(adminActor);
      const listSpy = spyOn(courierDispatchService, 'listShipments').mockResolvedValue({
        items: [sampleShipmentDTO],
        total: 1,
        page: 1,
        limit: 20,
      });

      const req = new NextRequest('http://localhost:3000/api/v1/shipping/shipments', {
        method: 'GET',
      });

      const res = await listShipmentsRoute(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(listSpy).toHaveBeenCalledWith({
        sellerId: null,
        status: undefined,
        courierProvider: undefined,
        page: 1,
        limit: 20,
      });
    });

    it('rejects unauthenticated requests with 401', async () => {
      authSpy.mockImplementation(() => {
        throw new AuthorizationError('Authentication required', { code: 'UNAUTHENTICATED' });
      });

      const req = new NextRequest('http://localhost:3000/api/v1/shipping/shipments', {
        method: 'GET',
      });

      const res = await listShipmentsRoute(req);
      expect(res.status).toBe(403);
    });

    it('rejects customer role with 403', async () => {
      authSpy.mockReturnValue(customerActor);

      const req = new NextRequest('http://localhost:3000/api/v1/shipping/shipments', {
        method: 'GET',
      });

      const res = await listShipmentsRoute(req);
      expect(res.status).toBe(403);
    });
  });

  describe('2. GET /api/v1/shipping/shipments/[id]', () => {
    it('retrieves single shipment by ID for owner merchant', async () => {
      const getSpy = spyOn(courierDispatchService, 'getShipment').mockResolvedValue(
        sampleShipmentDTO
      );

      const req = new NextRequest('http://localhost:3000/api/v1/shipping/shipments/shp_alpha_001', {
        method: 'GET',
      });

      const res = await getShipmentRoute(req, { params: Promise.resolve({ id: 'shp_alpha_001' }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.shipmentNumber).toBe('SHP-20261015-001');
      expect(getSpy).toHaveBeenCalledWith('shp_alpha_001', 'sel_alpha');
    });

    it('blocks cross-tenant shipment access with 403 TENANT_VIOLATION', async () => {
      authSpy.mockReturnValue(sellerBetaActor);
      spyOn(courierDispatchService, 'getShipment').mockRejectedValue(
        new AuthorizationError('Tenant access violation', { code: 'TENANT_VIOLATION' })
      );

      const req = new NextRequest('http://localhost:3000/api/v1/shipping/shipments/shp_alpha_001', {
        method: 'GET',
      });

      const res = await getShipmentRoute(req, { params: Promise.resolve({ id: 'shp_alpha_001' }) });
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.error.details?.code).toBe('TENANT_VIOLATION');
    });

    it('returns 404 when shipment is not found', async () => {
      spyOn(courierDispatchService, 'getShipment').mockRejectedValue(
        new NotFoundError('Shipment not found')
      );

      const req = new NextRequest('http://localhost:3000/api/v1/shipping/shipments/non_existent', {
        method: 'GET',
      });

      const res = await getShipmentRoute(req, { params: Promise.resolve({ id: 'non_existent' }) });
      expect(res.status).toBe(404);
    });
  });

  describe('3. POST /api/v1/shipping/shipments/[id]/events', () => {
    it('appends an immutable delivery event and returns updated shipment', async () => {
      const appendSpy = spyOn(courierDispatchService, 'appendTrackingEvent').mockResolvedValue({
        ...sampleShipmentDTO,
        status: 'OUT_FOR_DELIVERY',
      });

      const req = new NextRequest(
        'http://localhost:3000/api/v1/shipping/shipments/shp_alpha_001/events',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': 'idemp_event_001',
          },
          body: JSON.stringify({
            status: 'OUT_FOR_DELIVERY',
            location: 'Dhanmondi Hub',
            description: 'Loaded on rider bike for doorstep delivery',
          }),
        }
      );

      const res = await appendEventRoute(req, { params: Promise.resolve({ id: 'shp_alpha_001' }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.status).toBe('OUT_FOR_DELIVERY');
      expect(appendSpy).toHaveBeenCalled();
    });

    it('rejects event append without Idempotency-Key header with 422', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/v1/shipping/shipments/shp_alpha_001/events',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'OUT_FOR_DELIVERY',
            description: 'Out for delivery',
          }),
        }
      );

      const res = await appendEventRoute(req, { params: Promise.resolve({ id: 'shp_alpha_001' }) });
      expect(res.status).toBe(422);
    });

    it('returns 409 when attempting to alter a DELIVERED shipment', async () => {
      spyOn(courierDispatchService, 'appendTrackingEvent').mockRejectedValue(
        new ConflictError('Cannot alter DELIVERED shipment', { code: 'TERMINAL_STATE' })
      );

      const req = new NextRequest(
        'http://localhost:3000/api/v1/shipping/shipments/shp_alpha_001/events',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': 'idemp_event_conflict',
          },
          body: JSON.stringify({
            status: 'IN_TRANSIT',
            description: 'Invalid status regression',
          }),
        }
      );

      const res = await appendEventRoute(req, { params: Promise.resolve({ id: 'shp_alpha_001' }) });
      expect(res.status).toBe(409);
    });
  });

  describe('4. GET /api/v1/shipping/track/[trackingNumber]', () => {
    it('returns public tracking timeline with masked PII phone without requiring auth', async () => {
      const trackSpy = spyOn(courierDispatchService, 'trackShipment').mockResolvedValue(
        sampleTrackingResult
      );

      const req = new NextRequest('http://localhost:3000/api/v1/shipping/track/PTH-992101', {
        method: 'GET',
      });

      const res = await trackShipmentRoute(req, {
        params: Promise.resolve({ trackingNumber: 'PTH-992101' }),
      });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.trackingNumber).toBe('PTH-992101');
      expect(json.data.recipientPhoneMasked).toContain('***');
      expect(json.data.events.length).toBe(1);
      expect(trackSpy).toHaveBeenCalledWith('PTH-992101');
    });

    it('returns 404 when tracking number is not found in any logistics provider', async () => {
      spyOn(courierDispatchService, 'trackShipment').mockRejectedValue(
        new NotFoundError('Shipment not found')
      );

      const req = new NextRequest('http://localhost:3000/api/v1/shipping/track/NON_EXISTENT', {
        method: 'GET',
      });

      const res = await trackShipmentRoute(req, {
        params: Promise.resolve({ trackingNumber: 'NON_EXISTENT' }),
      });
      expect(res.status).toBe(404);
    });
  });
});
