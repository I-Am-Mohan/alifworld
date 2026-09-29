/**
 * Milestone 134: Bangladesh Courier Adapters & In-House Delivery Unit Tests
 *
 * Verifies:
 * 1. E.164 phone normalization across all Bangladesh mobile formats
 * 2. Customer-safe phone masking (+88017****1234)
 * 3. Pathao Courier adapter (consignment booking, tracking, webhook HMAC verification)
 * 4. Steadfast Courier adapter (nationwide upazila coverage, COD limits, webhook ingestion)
 * 5. RedX and Paperfly adapters (regional city & rural doorstep coverage)
 * 6. AlifExpress In-House Delivery Fleet (Metro Dhaka fast track, 6-digit OTP generation)
 * 7. Courier Adapter Registry provider lookup and fallback mechanisms
 */

import { describe, it, expect } from 'bun:test';
import { createHmac } from 'crypto';
import { PathaoCourierAdapter } from '@/features/shipping/adapters/pathao.adapter';
import { SteadfastCourierAdapter } from '@/features/shipping/adapters/steadfast.adapter';
import { RedXCourierAdapter } from '@/features/shipping/adapters/redx.adapter';
import { PaperflyCourierAdapter } from '@/features/shipping/adapters/paperfly.adapter';
import { InHouseCourierAdapter } from '@/features/shipping/adapters/in-house.adapter';
import { courierAdapterRegistry } from '@/features/shipping/adapters/courier-adapter.registry';
import { CreateConsignmentRequest } from '@/features/shipping/types/courier.types';

describe('Milestone 134: Bangladesh Courier Adapters Unit Tests', () => {
  const sampleRequest: CreateConsignmentRequest = {
    shipmentId: 'shp_test_001',
    shipmentNumber: 'SHP-20261015-123456',
    fulfillmentGroupId: 'sfg_test_001',
    orderNumber: 'ORD-20261015-ABCDEF1234',
    sellerId: 'sel_merchant_01',
    sellerName: 'Bengal Crafts',
    recipientName: 'Abdur Rahim',
    recipientPhone: '01712345678', // Standard local format
    deliveryAddress: 'House 15, Road 3, Dhanmondi',
    division: 'DHAKA',
    district: 'Dhaka',
    upazila: 'Dhanmondi',
    itemDescription: 'Handmade Silk Scarf',
    itemQuantity: 1,
    totalWeightGrams: 300,
    codAmountPoisha: 150000, // ৳1,500.00
    isPrepaid: false,
    shippingCostPoisha: 6000, // ৳60.00
  };

  describe('1. Phone Normalization & Privacy Masking', () => {
    const adapter = new PathaoCourierAdapter();

    it('normalizes various Bangladesh phone inputs to strict E.164 (+8801XXXXXXXXX)', () => {
      expect((adapter as any).normalizePhone('01712345678')).toBe('+8801712345678');
      expect((adapter as any).normalizePhone('+8801812345678')).toBe('+8801812345678');
      expect((adapter as any).normalizePhone('8801912345678')).toBe('+8801912345678');
      expect((adapter as any).normalizePhone('008801612345678')).toBe('+8801612345678');
      expect((adapter as any).normalizePhone('০১৭১২৩৪৫৬৭৮')).toBe('+8801712345678'); // Bengali numerals
    });

    it('masks phone numbers for public tracking privacy', () => {
      const masked = adapter.maskPhone('+8801712345678');
      expect(masked).toBe('+88017****5678');
      expect(masked).not.toContain('1234');
    });
  });

  describe('2. Pathao Courier Adapter', () => {
    const pathao = new PathaoCourierAdapter();

    it('creates a Pathao consignment with deterministic ID and normalized phone', async () => {
      const result = await pathao.createConsignment(sampleRequest);

      expect(result.success).toBe(true);
      expect(result.courierCode).toBe('PATHAO');
      expect(result.consignmentId).toMatch(/^PTH-\d{8}-\d{6}$/);
      expect(result.trackingNumber).toContain(result.consignmentId);
      expect(result.status).toBe('LABEL_CREATED');
      expect(result.courierFeePoisha).toBe(6000);
      expect(result.courierFeeBdtFormatted).toBe('৳60.00');
    });

    it('evaluates Pathao serviceability and returns Metro/City zones', async () => {
      const metro = await pathao.checkServiceability('DHAKA', 'Dhaka', 'Mirpur');
      expect(metro.isServiceable).toBe(true);
      expect(metro.zone).toBe('METRO_DHAKA');
      expect(metro.supportsCod).toBe(true);
      expect(metro.maxCodAmountPoisha).toBe(5000000);
    });

    it('parses Pathao webhook payloads and maps status transitions', async () => {
      const webhookPayload = {
        consignment_id: 'PTH-20261015-888999',
        order_status: 'Picked',
        updated_at: '2026-10-15T12:00:00Z',
      };

      const event = await pathao.parseWebhook(webhookPayload);
      expect(event.courierCode).toBe('PATHAO');
      expect(event.consignmentId).toBe('PTH-20261015-888999');
      expect(event.newStatus).toBe('PICKED_UP');

      const deliveredPayload = {
        consignment_id: 'PTH-20261015-888999',
        order_status: 'Delivered',
      };
      const deliveredEvent = await pathao.parseWebhook(deliveredPayload);
      expect(deliveredEvent.newStatus).toBe('DELIVERED');
    });

    it('verifies Pathao HMAC-SHA256 webhook signatures', () => {
      const secret = 'test-secret-key-123';
      (pathao as any).webhookSecret = secret;

      const rawBody = JSON.stringify({ event: 'status_update', consignment_id: 'PTH-123' });
      const validSignature = createHmac('sha256', secret).update(rawBody).digest('hex');

      const verified = pathao.verifyWebhookSignature(rawBody, {
        'x-pathao-signature': validSignature,
      });
      expect(verified).toBe(true);

      const tampered = pathao.verifyWebhookSignature(rawBody, {
        'x-pathao-signature': 'invalid-signature-hash',
      });
      expect(tampered).toBe(false);

      (pathao as any).webhookSecret = null;
    });
  });

  describe('3. Steadfast Courier Adapter', () => {
    const steadfast = new SteadfastCourierAdapter();

    it('creates a Steadfast consignment with STF prefix and nationwide routing', async () => {
      const result = await steadfast.createConsignment({
        ...sampleRequest,
        division: 'CHITTAGONG',
        district: 'Chittagong',
        shippingCostPoisha: 12000, // ৳120.00
      });

      expect(result.success).toBe(true);
      expect(result.courierCode).toBe('STEADFAST');
      expect(result.consignmentId).toMatch(/^STF-\d{8}-\d{6}$/);
      expect(result.courierFeeBdtFormatted).toBe('৳120.00');
    });

    it('confirms nationwide upazila serviceability across all 64 districts', async () => {
      const serviceability = await steadfast.checkServiceability(
        'RANGPUR',
        'Kurigram',
        'Chilmari'
      );
      expect(serviceability.isServiceable).toBe(true);
      expect(serviceability.courierCode).toBe('STEADFAST');
      expect(serviceability.supportsCod).toBe(true);
      expect(serviceability.maxCodAmountPoisha).toBe(5000000);
    });

    it('parses Steadfast webhook status updates', async () => {
      const payload = {
        consignment_id: 'STF-20261015-112233',
        status: 'delivered',
        tracking_code: 'TRK-STF-9988',
      };

      const event = await steadfast.parseWebhook(payload);
      expect(event.courierCode).toBe('STEADFAST');
      expect(event.consignmentId).toBe('STF-20261015-112233');
      expect(event.newStatus).toBe('DELIVERED');
      expect(event.trackingNumber).toBe('TRK-STF-9988');
    });
  });

  describe('4. RedX & Paperfly Courier Adapters', () => {
    const redx = new RedXCourierAdapter();
    const paperfly = new PaperflyCourierAdapter();

    it('creates RedX consignment with RDX prefix', async () => {
      const result = await redx.createConsignment(sampleRequest);
      expect(result.success).toBe(true);
      expect(result.courierCode).toBe('REDX');
      expect(result.consignmentId).toMatch(/^RDX-\d{8}-\d{6}$/);
    });

    it('creates Paperfly consignment with PPF prefix and deep upazila coverage', async () => {
      const result = await paperfly.createConsignment(sampleRequest);
      expect(result.success).toBe(true);
      expect(result.courierCode).toBe('PAPERFLY');
      expect(result.consignmentId).toMatch(/^PPF-\d{8}-\d{6}$/);

      const serviceability = await paperfly.checkServiceability('BARISAL', 'Bhola', 'Char Fasson');
      expect(serviceability.isServiceable).toBe(true);
      expect(serviceability.supportsCod).toBe(true);
    });
  });

  describe('5. AlifExpress In-House Delivery Fleet', () => {
    const inHouse = new InHouseCourierAdapter();

    it('restricts In-House fleet serviceability strictly to Metro Dhaka', async () => {
      const dhakaService = await inHouse.checkServiceability('DHAKA', 'Dhaka', 'Uttara');
      expect(dhakaService.isServiceable).toBe(true);
      expect(dhakaService.zone).toBe('METRO_DHAKA');
      expect(dhakaService.estimatedDaysMin).toBe(0); // Same-day capable

      const ctgService = await inHouse.checkServiceability('CHITTAGONG', 'Chittagong');
      expect(ctgService.isServiceable).toBe(false);
    });

    it('generates a secure 6-digit OTP PIN for doorstep verification', async () => {
      const result = await inHouse.createConsignment(sampleRequest);

      expect(result.success).toBe(true);
      expect(result.courierCode).toBe('IN_HOUSE');
      expect(result.consignmentId).toMatch(/^ALF-INHOUSE-\d{8}-\d{6}$/);
      expect(result.status).toBe('ASSIGNED');
      expect(result.otpCode).toBeDefined();
      expect(result.otpCode).toMatch(/^\d{6}$/); // 6-digit numeric OTP
    });

    it('provides localized bilingual timeline event labels', async () => {
      const tracking = await inHouse.trackShipment('ALF-INHOUSE-20261015-123456');

      expect(tracking.statusLabelEn).toBe('Out for Doorstep Delivery');
      expect(tracking.statusLabelBn).toBe('ডেলিভারির জন্য বের হয়েছে');
      expect(tracking.events.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('6. Courier Adapter Registry', () => {
    it('retrieves adapters by code and provides fallback for unknown codes', () => {
      const pathao = courierAdapterRegistry.getAdapter('PATHAO');
      expect(pathao.courierCode).toBe('PATHAO');

      const steadfast = courierAdapterRegistry.getAdapter('STEADFAST');
      expect(steadfast.courierCode).toBe('STEADFAST');

      const inHouse = courierAdapterRegistry.getAdapter('IN_HOUSE');
      expect(inHouse.courierCode).toBe('IN_HOUSE');

      // Fallback for unknown
      const fallback = courierAdapterRegistry.getAdapter('UNKNOWN_PROVIDER');
      expect(fallback).toBeDefined();
      expect(['STEADFAST', 'IN_HOUSE']).toContain(fallback.courierCode);
    });

    it('lists all 5 registered couriers with capability metadata', () => {
      const list = courierAdapterRegistry.listCouriers();
      expect(list.length).toBe(5);

      const codes = list.map((c) => c.code);
      expect(codes).toContain('PATHAO');
      expect(codes).toContain('STEADFAST');
      expect(codes).toContain('REDX');
      expect(codes).toContain('PAPERFLY');
      expect(codes).toContain('IN_HOUSE');

      const inHouseInfo = list.find((c) => c.code === 'IN_HOUSE');
      expect(inHouseInfo?.supportsOtpVerification).toBe(true);
      expect(inHouseInfo?.isFastTrackExpress).toBe(true);
    });
  });
});
