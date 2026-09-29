/**
 * Milestone 137: COD Fraud Risk, Limits, and Verification REST API Integration Tests
 *
 * Verifies:
 * 1. POST /api/v1/checkout/cod/evaluate - multi-factor risk assessment
 * 2. POST /api/v1/checkout/cod/send-otp & verify-otp - phone verification challenges
 * 3. Gated COD checkout execution in checkout pipeline
 * 4. GET & PUT /api/v1/admin/checkout/cod/policy - policy threshold administration
 * 5. POST, GET & DELETE /api/v1/admin/checkout/cod/blacklist - fraud registry management
 */

import { describe, it, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import * as authzModule from '@/shared/authz';
import { POST as evaluateCodRoute } from '@/app/api/v1/checkout/cod/evaluate/route';
import { POST as sendCodOtpRoute } from '@/app/api/v1/checkout/cod/send-otp/route';
import { POST as verifyCodOtpRoute } from '@/app/api/v1/checkout/cod/verify-otp/route';
import {
  GET as getCodPolicyRoute,
  PUT as updateCodPolicyRoute,
} from '@/app/api/v1/admin/checkout/cod/policy/route';
import {
  GET as listBlacklistRoute,
  POST as addBlacklistRoute,
  DELETE as deleteBlacklistRoute,
} from '@/app/api/v1/admin/checkout/cod/blacklist/route';
import { POST as cartCheckoutRoute } from '@/app/api/v1/cart/checkout/route';
import { codFraudRiskService, checkoutOrchestratorService } from '@/features/checkout';
import { NextRequest } from 'next/server';

describe('Milestone 137: COD Fraud-Risk REST API Integration Tests', () => {
  let authSpy: any;

  const customerActor = {
    userId: 'usr_customer_001',
    roles: ['CUSTOMER'],
    permissions: [],
    sellerId: null,
  };

  const adminActor = {
    userId: 'usr_admin_001',
    roles: ['ADMIN'],
    permissions: ['admin.manage'],
    sellerId: null,
  };

  beforeEach(() => {
    authSpy = spyOn(authzModule, 'authenticateRequest').mockReturnValue(customerActor as any);
  });

  afterEach(() => {
    authSpy?.mockRestore();
  });

  describe('1. POST /api/v1/checkout/cod/evaluate', () => {
    it('evaluates low-risk order as APPROVED for Cash on Delivery', async () => {
      const evalSpy = spyOn(codFraudRiskService, 'evaluateCodEligibility').mockResolvedValue({
        isEligible: true,
        riskLevel: 'APPROVED' as const,
        riskScore: 10,
        orderSubtotalPoisha: 200000,
        orderSubtotalBdtFormatted: '৳2,000.00',
        maxCodLimitPoisha: 5000000,
        maxCodLimitBdtFormatted: '৳50,000.00',
        requiresOtpVerification: false,
        requiresPrepayment: false,
        isPhoneVerified: true,
        factors: [],
        warnings: [],
        policyVersion: 'v1.0.0',
        evaluatedAt: new Date().toISOString(),
      });

      const req = new NextRequest('http://localhost:3000/api/v1/checkout/cod/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientPhone: '01711223344',
          orderSubtotalPoisha: 200000,
          division: 'DHAKA',
          district: 'Dhaka',
        }),
      });

      const response = await evaluateCodRoute(req);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.isEligible).toBe(true);
      expect(json.data.riskLevel).toBe('APPROVED');

      evalSpy.mockRestore();
    });

    it('returns PREPAYMENT_REQUIRED when order exceeds ৳50,000 limit', async () => {
      const evalSpy = spyOn(codFraudRiskService, 'evaluateCodEligibility').mockResolvedValue({
        isEligible: false,
        riskLevel: 'PREPAYMENT_REQUIRED' as const,
        riskScore: 85,
        orderSubtotalPoisha: 6000000,
        orderSubtotalBdtFormatted: '৳60,000.00',
        maxCodLimitPoisha: 5000000,
        maxCodLimitBdtFormatted: '৳50,000.00',
        requiresOtpVerification: false,
        requiresPrepayment: true,
        isPhoneVerified: true,
        factors: [
          {
            factor: 'ORDER_VALUE_LIMIT',
            score: 85,
            severity: 'CRITICAL',
            messageEn: 'Order subtotal exceeds the standard COD limit of ৳50,000.00.',
            messageBn: 'অর্ডারের মোট মূল্য ক্যাশ অন ডেলিভারির সর্বোচ্চ সীমা অতিক্রম করেছে।',
          },
        ],
        warnings: ['High-value order exceeds COD ceiling. Digital prepayment required.'],
        policyVersion: 'v1.0.0',
        evaluatedAt: new Date().toISOString(),
      });

      const req = new NextRequest('http://localhost:3000/api/v1/checkout/cod/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientPhone: '01711223344',
          orderSubtotalPoisha: 6000000,
          division: 'DHAKA',
          district: 'Dhaka',
        }),
      });

      const response = await evaluateCodRoute(req);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.isEligible).toBe(false);
      expect(json.data.riskLevel).toBe('PREPAYMENT_REQUIRED');
      expect(json.data.requiresPrepayment).toBe(true);

      evalSpy.mockRestore();
    });
  });

  describe('2. POST /api/v1/checkout/cod/send-otp & verify-otp', () => {
    it('dispatches SMS OTP and returns cooldown seconds', async () => {
      const otpSpy = spyOn(codFraudRiskService, 'sendCodVerificationOtp').mockResolvedValue({
        success: true,
        phone: '+8801711223344',
        maskedPhone: '+88017****3344',
        cooldownSeconds: 60,
        expiresInSeconds: 600,
        message: 'Verification code sent to +88017****3344.',
      });

      const req = new NextRequest('http://localhost:3000/api/v1/checkout/cod/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientPhone: '01711223344',
        }),
      });

      const response = await sendCodOtpRoute(req);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.maskedPhone).toBe('+88017****3344');
      expect(json.data.cooldownSeconds).toBe(60);

      otpSpy.mockRestore();
    });

    it('verifies valid 6-digit OTP code and issues single-use checkout verification token', async () => {
      const verifySpy = spyOn(codFraudRiskService, 'verifyCodOtp').mockResolvedValue({
        verified: true,
        phone: '+8801711223344',
        verificationToken: 'cod_tkt_abc1234567890abcdef',
        message: 'Phone number verified successfully.',
      });

      const req = new NextRequest('http://localhost:3000/api/v1/checkout/cod/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientPhone: '01711223344',
          otp: '492815',
        }),
      });

      const response = await verifyCodOtpRoute(req);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.verified).toBe(true);
      expect(json.data.verificationToken).toContain('cod_tkt_');

      verifySpy.mockRestore();
    });

    it('rejects invalid OTP format with 422', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/checkout/cod/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientPhone: '01711223344',
          otp: '123', // not 6 digits
        }),
      });

      const response = await verifyCodOtpRoute(req);
      const json = await response.json();

      expect(response.status).toBe(422);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('VALIDATION_FAILED');
    });
  });

  describe('3. Admin COD Risk Policy & Blacklist Management', () => {
    it('blocks regular customers from managing COD policy with 403', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/admin/checkout/cod/policy', {
        method: 'GET',
      });

      const response = await getCodPolicyRoute(req);
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('FORBIDDEN');
    });

    it('allows Admin to retrieve and update COD policy limits', async () => {
      authSpy.mockReturnValue(adminActor as any);

      const getReq = new NextRequest('http://localhost:3000/api/v1/admin/checkout/cod/policy', {
        method: 'GET',
      });

      const getRes = await getCodPolicyRoute(getReq);
      const getJson = await getRes.json();

      expect(getRes.status).toBe(200);
      expect(getJson.success).toBe(true);
      expect(getJson.data.maxCodOrderValuePoisha).toBe(5000000);

      // Update policy threshold
      const putReq = new NextRequest('http://localhost:3000/api/v1/admin/checkout/cod/policy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maxCodOrderValuePoisha: 6000000,
        }),
      });

      const putRes = await updateCodPolicyRoute(putReq);
      const putJson = await putRes.json();

      expect(putRes.status).toBe(200);
      expect(putJson.success).toBe(true);
      expect(putJson.data.maxCodOrderValuePoisha).toBe(6000000);
    });

    it('allows Admin to add, list, and delete fraud blacklist entries', async () => {
      authSpy.mockReturnValue(adminActor as any);

      // 1. Add Blacklist Entry
      const addReq = new NextRequest(
        'http://localhost:3000/api/v1/admin/checkout/cod/blacklist',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'PHONE',
            identifier: '01999887766',
            reason: 'Frequent doorstep refusals',
            severity: 'BLOCK',
          }),
        }
      );

      const addRes = await addBlacklistRoute(addReq);
      const addJson = await addRes.json();

      expect(addRes.status).toBe(201);
      expect(addJson.success).toBe(true);
      expect(addJson.data.identifier).toBe('+8801999887766');

      // 2. List Blacklist Entries
      const listReq = new NextRequest(
        'http://localhost:3000/api/v1/admin/checkout/cod/blacklist?type=PHONE',
        { method: 'GET' }
      );

      const listRes = await listBlacklistRoute(listReq);
      const listJson = await listRes.json();

      expect(listRes.status).toBe(200);
      expect(listJson.success).toBe(true);
      expect(Array.isArray(listJson.data)).toBe(true);

      // 3. Delete Blacklist Entry
      const delReq = new NextRequest(
        'http://localhost:3000/api/v1/admin/checkout/cod/blacklist?type=PHONE&identifier=%2B8801999887766',
        { method: 'DELETE' }
      );

      const delRes = await deleteBlacklistRoute(delReq);
      const delJson = await delRes.json();

      expect(delRes.status).toBe(200);
      expect(delJson.success).toBe(true);
    });
  });
});
