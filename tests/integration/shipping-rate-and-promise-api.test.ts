/**
 * Milestone 133: Shipping Rate & Delivery Promise REST API Integration Tests
 *
 * Verifies:
 * 1. POST /api/v1/shipping/rates/quote - multi-vendor quote & promise calculation
 * 2. POST /api/v1/shipping/promise - fast delivery promise evaluation in Asia/Dhaka
 * 3. GET /api/v1/admin/shipping/rules - RBAC admin authentication & rule listing
 * 4. POST /api/v1/admin/shipping/rules - Admin rule creation
 * 5. GET /api/v1/admin/shipping/rules/[id] - Rule detail retrieval
 * 6. PATCH /api/v1/admin/shipping/rules/[id] - Rule update
 * 7. DELETE /api/v1/admin/shipping/rules/[id] - Rule archival
 */

import { describe, it, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import * as authzModule from '@/shared/authz';
import { POST as quoteRoute } from '@/app/api/v1/shipping/rates/quote/route';
import { POST as promiseRoute } from '@/app/api/v1/shipping/promise/route';
import {
  GET as listRulesRoute,
  POST as createRuleRoute,
} from '@/app/api/v1/admin/shipping/rules/route';
import {
  GET as getRuleRoute,
  PATCH as updateRuleRoute,
  DELETE as deleteRuleRoute,
} from '@/app/api/v1/admin/shipping/rules/[id]/route';
import { NextRequest } from 'next/server';

describe('Milestone 133: Shipping Rate & Delivery Promise REST API Integration Tests', () => {
  let authSpy: any;

  const adminActor = {
    userId: 'usr_admin_01',
    roles: ['ADMIN'],
    permissions: ['shipping.manage'],
    sellerId: null,
  };

  const customerActor = {
    userId: 'usr_customer_01',
    roles: ['CUSTOMER'],
    permissions: [],
    sellerId: null,
  };

  beforeEach(() => {
    authSpy = spyOn(authzModule, 'authenticateRequest').mockReturnValue(adminActor as any);
  });

  afterEach(() => {
    authSpy?.mockRestore();
  });

  describe('1. POST /api/v1/shipping/rates/quote', () => {
    it('calculates multi-seller shipping rate quote and delivery promises', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/shipping/rates/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: {
            division: 'DHAKA',
            district: 'Dhaka',
            upazila: 'Gulshan',
            streetAddress: 'Road 11, Gulshan 1',
          },
          items: [
            {
              variantId: 'var-101',
              productTitle: 'Winter Jacket',
              quantity: 1,
              weightGrams: 800,
              unitPricePoisha: 350000, // ৳3,500.00 (qualifies for free delivery)
              sellerId: 'seller-fashion',
            },
            {
              variantId: 'var-102',
              productTitle: 'Coffee Mug',
              quantity: 2,
              weightGrams: 300,
              shippingClass: 'FRAGILE',
              unitPricePoisha: 45000, // ৳450.00
              sellerId: 'seller-home',
            },
          ],
          shippingMethod: 'STANDARD',
        }),
      });

      const response = await quoteRoute(req);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.zone).toBe('METRO_DHAKA');
      expect(json.data.sellerQuotes.length).toBe(2);
      expect(json.data.totalShippingFeePoisha).toBeDefined();
      expect(json.data.totalShippingFeeBdtFormatted).toBeDefined();
      expect(json.data.overallDeliveryPromise).toBeDefined();
    });

    it('rejects request with 422 if neither cartId nor items is provided', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/shipping/rates/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: {
            division: 'DHAKA',
            district: 'Dhaka',
          },
        }),
      });

      const response = await quoteRoute(req);
      const json = await response.json();

      expect(response.status).toBe(422);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('VALIDATION_FAILED');
      expect(JSON.stringify(json.error.details)).toContain(
        'Either cartId or a non-empty items array'
      );
    });
  });

  describe('2. POST /api/v1/shipping/promise', () => {
    it('evaluates delivery promise timeline for given destination and seller', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/shipping/promise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinationDivision: 'CHITTAGONG',
          destinationDistrict: 'Chittagong',
          shippingMethod: 'STANDARD',
        }),
      });

      const response = await promiseRoute(req);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.minEstimatedDate).toBeDefined();
      expect(json.data.maxEstimatedDate).toBeDefined();
      expect(json.data.promiseTextEn).toContain('Business Days');
      expect(json.data.promiseTextBn).toBeDefined();
      expect(json.data.orderCutoffTime).toBe('14:00');
    });
  });

  describe('3. Admin Shipping Rate Rules RBAC & Management', () => {
    it('rejects non-admin customers with 403 on GET /api/v1/admin/shipping/rules', async () => {
      spyOn(authzModule, 'authenticateRequest').mockReturnValue(customerActor as any);

      const req = new NextRequest('http://localhost:3000/api/v1/admin/shipping/rules', {
        method: 'GET',
      });

      const response = await listRulesRoute(req);
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('FORBIDDEN');
    });

    it('allows admin to list rules with pagination', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/v1/admin/shipping/rules?page=1&limit=10',
        { method: 'GET' }
      );

      const response = await listRulesRoute(req);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.pagination).toBeDefined();
      expect(json.pagination.page).toBe(1);
    });

    it('allows admin to create, get, update, and soft-delete a shipping rule', async () => {
      const uniqueCode = `TEST_RULE_${Date.now()}`;

      // 1. Create Rule
      const createReq = new NextRequest('http://localhost:3000/api/v1/admin/shipping/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: uniqueCode,
          name: 'Sylhet Tea Garden Special Rate',
          nameBn: 'সিলেট চা বাগান বিশেষ রেট',
          shippingMethod: 'STANDARD',
          originZone: 'ANY',
          destinationZone: 'MAJOR_CITIES',
          baseRatePoisha: 11000, // ৳110.00
          baseWeightGrams: 1000,
          incrementalWeightGrams: 1000,
          incrementalRatePoisha: 2500,
          freeShippingThresholdPoisha: 150000, // ৳1,500.00
          handlingDays: 1,
          transitDaysMin: 2,
          transitDaysMax: 3,
          cutoffTime: '15:00',
          isCodAllowed: true,
          maxCodAmountPoisha: 5000000,
          priority: 10,
          isDefault: false,
          status: 'ACTIVE',
          ruleVersion: 'v1.0.0',
        }),
      });

      const createRes = await createRuleRoute(createReq);
      const createJson = await createRes.json();

      expect(createRes.status).toBe(201);
      expect(createJson.success).toBe(true);
      expect(createJson.data.code).toBe(uniqueCode);
      expect(createJson.data.baseRatePoisha).toBe(11000);
      expect(createJson.data.baseRateBdtFormatted).toBe('৳110.00');

      const ruleId = createJson.data.id;

      // 2. Get Rule by ID
      const getReq = new NextRequest(
        `http://localhost:3000/api/v1/admin/shipping/rules/${ruleId}`,
        { method: 'GET' }
      );
      const getRes = await getRuleRoute(getReq, {
        params: Promise.resolve({ id: ruleId }),
      });
      const getJson = await getRes.json();

      expect(getRes.status).toBe(200);
      expect(getJson.success).toBe(true);
      expect(getJson.data.id).toBe(ruleId);

      // 3. Update Rule
      const updateReq = new NextRequest(
        `http://localhost:3000/api/v1/admin/shipping/rules/${ruleId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            baseRatePoisha: 11500, // ৳115.00
            priority: 20,
          }),
        }
      );
      const updateRes = await updateRuleRoute(updateReq, {
        params: Promise.resolve({ id: ruleId }),
      });
      const updateJson = await updateRes.json();

      expect(updateRes.status).toBe(200);
      expect(updateJson.success).toBe(true);
      expect(updateJson.data.baseRatePoisha).toBe(11500);
      expect(updateJson.data.priority).toBe(20);

      // 4. Soft Delete Rule
      const deleteReq = new NextRequest(
        `http://localhost:3000/api/v1/admin/shipping/rules/${ruleId}`,
        { method: 'DELETE' }
      );
      const deleteRes = await deleteRuleRoute(deleteReq, {
        params: Promise.resolve({ id: ruleId }),
      });
      const deleteJson = await deleteRes.json();

      expect(deleteRes.status).toBe(200);
      expect(deleteJson.success).toBe(true);
    });
  });
});
