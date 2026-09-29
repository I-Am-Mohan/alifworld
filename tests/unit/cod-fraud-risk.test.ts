/**
 * Milestone 137: Cash on Delivery (COD) Fraud-Risk & Eligibility Unit Tests
 *
 * Verifies:
 * 1. Hard ceiling value enforcement (> ৳50,000 requires prepayment)
 * 2. High-value warning threshold (> ৳10,000 triggers SMS OTP verification)
 * 3. Digital non-physical items 100% prepayment gating
 * 4. Fraud blacklist matching (BLOCK severity yields BLOCKED risk level)
 * 5. Historical RTO (Return to Origin) rate penalty
 * 6. Order velocity & rapid-fire throttling (maximum 3 active pending COD orders)
 * 7. Default policy configuration values
 */

import { describe, it, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import { codFraudRiskService } from '@/features/checkout/services/cod-fraud-risk.service';
import { codRiskRepository } from '@/features/checkout/repositories/cod-risk.repository';

describe('Milestone 137: COD Fraud Risk & Eligibility Unit Tests', () => {
  let blacklistSpy: any;
  let statsSpy: any;
  let velocitySpy: any;

  beforeEach(() => {
    blacklistSpy = spyOn(codRiskRepository, 'findActiveBlacklistEntry').mockResolvedValue(null);
    statsSpy = spyOn(codRiskRepository, 'getCustomerOrderStats').mockResolvedValue({
      totalOrders: 5,
      completedOrders: 5,
      returnedOrders: 0,
      cancelledOrders: 0,
      rtoRatePercent: 0,
    });
    velocitySpy = spyOn(codRiskRepository, 'countActivePendingCodOrders').mockResolvedValue(0);
  });

  afterEach(() => {
    blacklistSpy?.mockRestore();
    statsSpy?.mockRestore();
    velocitySpy?.mockRestore();
  });

  describe('1. Order Value Thresholds & Digital Gating', () => {
    it('approves standard low-value orders (< ৳10,000) for trusted customers', async () => {
      const evaluation = await codFraudRiskService.evaluateCodEligibility({
        recipientPhone: '01712345678',
        orderSubtotalPoisha: 250000, // ৳2,500.00
        division: 'DHAKA',
        district: 'Dhaka',
        hasDigitalItems: false,
      });

      expect(evaluation.isEligible).toBe(true);
      expect(evaluation.riskLevel).toBe('APPROVED');
      expect(evaluation.requiresOtpVerification).toBe(false);
      expect(evaluation.requiresPrepayment).toBe(false);
      expect(evaluation.riskScore).toBeLessThan(35);
    });

    it('requires 100% digital prepayment when order exceeds ৳50,000 hard ceiling', async () => {
      const evaluation = await codFraudRiskService.evaluateCodEligibility({
        recipientPhone: '01712345678',
        orderSubtotalPoisha: 5500000, // ৳55,000.00 > ৳50,000
        division: 'DHAKA',
        district: 'Dhaka',
        hasDigitalItems: false,
      });

      expect(evaluation.isEligible).toBe(false);
      expect(evaluation.riskLevel).toBe('PREPAYMENT_REQUIRED');
      expect(evaluation.requiresPrepayment).toBe(true);
      expect(evaluation.warnings.length).toBeGreaterThan(0);
      expect(evaluation.warnings[0]).toContain('exceeds');
    });

    it('triggers SMS OTP verification for high-value orders (between ৳10,000 and ৳50,000)', async () => {
      const evaluation = await codFraudRiskService.evaluateCodEligibility({
        recipientPhone: '01712345678',
        orderSubtotalPoisha: 1500000, // ৳15,000.00
        division: 'DHAKA',
        district: 'Dhaka',
        hasDigitalItems: false,
      });

      expect(evaluation.isEligible).toBe(true);
      expect(evaluation.riskLevel).toBe('OTP_REQUIRED');
      expect(evaluation.requiresOtpVerification).toBe(true);
      expect(evaluation.requiresPrepayment).toBe(false);
    });

    it('strictly requires prepayment for carts containing digital / non-physical goods', async () => {
      const evaluation = await codFraudRiskService.evaluateCodEligibility({
        recipientPhone: '01712345678',
        orderSubtotalPoisha: 100000, // ৳1,000.00
        division: 'DHAKA',
        district: 'Dhaka',
        hasDigitalItems: true,
      });

      expect(evaluation.isEligible).toBe(false);
      expect(evaluation.riskLevel).toBe('PREPAYMENT_REQUIRED');
      expect(evaluation.requiresPrepayment).toBe(true);
    });
  });

  describe('2. Blacklist & Fraud Matching', () => {
    it('completely blocks Cash on Delivery when recipient phone is blacklisted with BLOCK severity', async () => {
      blacklistSpy.mockResolvedValue({
        id: 'blk_01',
        type: 'PHONE',
        identifier: '+8801712345678',
        reason: 'Repeatedly refused parcels at delivery doorstep',
        severity: 'BLOCK',
      });

      const evaluation = await codFraudRiskService.evaluateCodEligibility({
        recipientPhone: '01712345678',
        orderSubtotalPoisha: 120000,
        division: 'DHAKA',
        district: 'Dhaka',
        hasDigitalItems: false,
      });

      expect(evaluation.isEligible).toBe(false);
      expect(evaluation.riskLevel).toBe('BLOCKED');
      expect(evaluation.riskScore).toBe(100);
      expect(evaluation.warnings[0]).toContain('prohibited');
    });

    it('requires OTP verification when identifier is flagged with OTP_REQUIRED on blacklist', async () => {
      blacklistSpy.mockResolvedValue({
        id: 'blk_02',
        type: 'PHONE',
        identifier: '+8801712345678',
        reason: 'Suspicious order frequency',
        severity: 'OTP_REQUIRED',
      });

      const evaluation = await codFraudRiskService.evaluateCodEligibility({
        recipientPhone: '01712345678',
        orderSubtotalPoisha: 120000,
        division: 'DHAKA',
        district: 'Dhaka',
        hasDigitalItems: false,
      });

      expect(evaluation.isEligible).toBe(true);
      expect(evaluation.riskLevel).toBe('OTP_REQUIRED');
      expect(evaluation.requiresOtpVerification).toBe(true);
    });
  });

  describe('3. Customer RTO History & Velocity Controls', () => {
    it('restricts COD when customer has high RTO delivery return rate (>= 30%)', async () => {
      statsSpy.mockResolvedValue({
        totalOrders: 4,
        completedOrders: 2,
        returnedOrders: 2,
        cancelledOrders: 0,
        rtoRatePercent: 50, // 50% RTO
      });

      const evaluation = await codFraudRiskService.evaluateCodEligibility({
        recipientPhone: '01712345678',
        orderSubtotalPoisha: 200000,
        division: 'DHAKA',
        district: 'Dhaka',
        hasDigitalItems: false,
      });

      expect(evaluation.riskScore).toBeGreaterThanOrEqual(50);
      expect(evaluation.requiresOtpVerification).toBe(true);
    });

    it('flags order when customer exceeds maximum concurrent pending COD orders limit (3)', async () => {
      velocitySpy.mockResolvedValue(4); // 4 pending orders

      const evaluation = await codFraudRiskService.evaluateCodEligibility({
        recipientPhone: '01712345678',
        orderSubtotalPoisha: 200000,
        division: 'DHAKA',
        district: 'Dhaka',
        hasDigitalItems: false,
      });

      expect(evaluation.riskScore).toBeGreaterThanOrEqual(45);
      expect(evaluation.requiresOtpVerification).toBe(true);
      expect(evaluation.warnings.some((w) => w.includes('pending COD orders'))).toBe(true);
    });
  });

  describe('4. Policy Configuration Defaults', () => {
    it('returns standard Bangladesh e-commerce COD policy configuration', async () => {
      const policy = await codFraudRiskService.getCodPolicyConfig();

      expect(policy.maxCodOrderValuePoisha).toBe(5000000); // ৳50,000.00
      expect(policy.maxCodOrderValueBdtFormatted).toBe('৳50,000.00');
      expect(policy.otpThresholdPoisha).toBe(1000000); // ৳10,000.00
      expect(policy.maxActivePendingCodOrders).toBe(3);
      expect(policy.maxAllowedRtoRatePercent).toBe(30);
      expect(policy.isPhoneVerificationRequiredForNewUsers).toBe(true);
    });
  });
});
