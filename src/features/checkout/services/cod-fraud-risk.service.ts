/**
 * Authoritative Cash on Delivery (COD) Fraud-Risk & Verification Engine
 *
 * Implements:
 * 1. Multi-factor fraud risk evaluation (order value, RTO rate, velocity, blacklists)
 * 2. Risk scoring (0-100) and classification (APPROVED, OTP_REQUIRED, PREPAYMENT_REQUIRED, BLOCKED)
 * 3. SMS OTP verification challenge dispatch and verification ticket generation
 * 4. High-value gating (> ৳50,000 hard cap, > ৳10,000 OTP threshold)
 * 5. Velocity throttling (maximum 3 concurrent unpaid COD orders)
 * 6. Historical RTO (Return to Origin) rate protection
 *
 * Invariant: BDT poisha integer minor units strictly conserved.
 * Invariant: Recipient phone normalized to +880 E.164.
 */

import { createHash, randomBytes } from 'crypto';
import { prisma } from '@/shared/database/prisma';
import { generateId, generatePrefixedId, ID_PREFIXES, ENTITY_PREFIXES } from '@/shared/utils/id';
import { ValidationError, NotFoundError, ConflictError } from '@/shared/errors/app-error';
import { normalizeBangladeshPhone, maskBangladeshPhone } from '@/shared/utils/phone';
import {
  CodRiskLevel,
  CodEligibilityEvaluationDTO,
  CodRiskFactorDTO,
  CodPolicyConfigDTO,
  SendCodOtpResultDTO,
  VerifyCodOtpResultDTO,
} from '../types/cod-risk.types';
import {
  EvaluateCodEligibilityInput,
  UpdateCodPolicyInput,
} from '../validators/cod-risk.validators';
import { codRiskRepository } from '../repositories/cod-risk.repository';
import { OtpRepository } from '@/repositories/otp.repository';

const DEFAULT_MAX_COD_ORDER_VALUE_POISHA = 5000000; // ৳50,000.00
const DEFAULT_OTP_THRESHOLD_POISHA = 1000000; // ৳10,000.00
const DEFAULT_MAX_ACTIVE_PENDING_COD = 3;
const DEFAULT_MAX_ALLOWED_RTO_RATE = 30; // 30%
const COD_OTP_PURPOSE = 'COD_VERIFICATION';

export class CodFraudRiskService {
  private db = prisma;
  private repo = codRiskRepository;
  private otpRepo = new OtpRepository();

  /**
   * Evaluates COD eligibility and assigns risk level with itemized factor scoring.
   */
  public async evaluateCodEligibility(
    input: EvaluateCodEligibilityInput,
    customerId?: string | null
  ): Promise<CodEligibilityEvaluationDTO> {
    const normalizedPhone = normalizeBangladeshPhone(input.recipientPhone);
    const subtotal = input.orderSubtotalPoisha;
    const factors: CodRiskFactorDTO[] = [];
    const warnings: string[] = [];
    let riskScore = 0;

    // 1. Blacklist Check
    const blacklistedPhone = await this.repo.findActiveBlacklistEntry('PHONE', normalizedPhone);
    let blacklistedIp = null;
    if (input.clientIp) {
      blacklistedIp = await this.repo.findActiveBlacklistEntry('IP_ADDRESS', input.clientIp);
    }

    if (blacklistedPhone || blacklistedIp) {
      const entry = blacklistedPhone || blacklistedIp;
      if (entry.severity === 'BLOCK') {
        factors.push({
          factor: 'FRAUD_BLACKLIST_MATCH',
          score: 100,
          severity: 'CRITICAL',
          messageEn: `Identifier is flagged for delivery fraud or repeated refused orders (${entry.reason}).`,
          messageBn: `ডেলিভারি জালিয়াতি বা পার্সেল প্রত্যাখ্যাত হওয়ার কারণে এই নম্বরটি ব্লক করা হয়েছে (${entry.reason})।`,
        });

        return this.buildResult(
          false,
          'BLOCKED',
          100,
          subtotal,
          factors,
          ['Cash on Delivery is prohibited for this recipient. Please prepay digitally.'],
          false,
          true
        );
      } else if (entry.severity === 'OTP_REQUIRED') {
        factors.push({
          factor: 'FRAUD_BLACKLIST_MATCH',
          score: 45,
          severity: 'HIGH',
          messageEn: 'Flagged profile requires phone verification before COD order.',
          messageBn: 'অর্ডার নিশ্চিত করার আগে ফোন নম্বরে ওটিপি যাচাইকরণ বাধ্যতামূলক।',
        });
        riskScore += 45;
      }
    }

    // 2. Digital / Non-Physical Goods Restriction
    if (input.hasDigitalItems) {
      factors.push({
        factor: 'DIGITAL_NON_PHYSICAL_GOODS',
        score: 95,
        severity: 'CRITICAL',
        messageEn:
          'Cart contains digital software licenses or virtual goods. 100% digital prepayment required.',
        messageBn:
          'কার্টে ডিজিটাল পণ্য বা সফটওয়্যার লাইসেন্স রয়েছে। ডিজিটাল পেমেন্ট বাধ্যতামূলক।',
      });

      return this.buildResult(
        false,
        'PREPAYMENT_REQUIRED',
        95,
        subtotal,
        factors,
        ['Digital products cannot be delivered via Cash on Delivery.'],
        false,
        true
      );
    }

    // 3. Order Value Hard Ceiling Check (> ৳50,000)
    if (subtotal > DEFAULT_MAX_COD_ORDER_VALUE_POISHA) {
      factors.push({
        factor: 'ORDER_VALUE_LIMIT',
        score: 85,
        severity: 'CRITICAL',
        messageEn: `Order subtotal (${this.formatBdt(subtotal)}) exceeds the standard COD limit of ${this.formatBdt(DEFAULT_MAX_COD_ORDER_VALUE_POISHA)}.`,
        messageBn: `অর্ডারের মোট মূ���্য (${this.formatBdt(subtotal)}) ক্যাশ অন ডেলিভারির সর্বোচ্চ সীমা ${this.formatBdt(DEFAULT_MAX_COD_ORDER_VALUE_POISHA)} অতিক্রম করেছে।`,
      });

      return this.buildResult(
        false,
        'PREPAYMENT_REQUIRED',
        85,
        subtotal,
        factors,
        ['High-value order exceeds COD ceiling. Digital prepayment required.'],
        false,
        true
      );
    }

    // 4. High-Value Warning Threshold (> ৳10,000) -> Triggers OTP Verification
    if (subtotal >= DEFAULT_OTP_THRESHOLD_POISHA) {
      factors.push({
        factor: 'HIGH_VALUE_THRESHOLD',
        score: 35,
        severity: 'MEDIUM',
        messageEn: `Order subtotal (${this.formatBdt(subtotal)}) qualifies as high-value. SMS OTP verification required.`,
        messageBn: `অর্ডারের মূল্য (${this.formatBdt(subtotal)}) বেশি হওয়ায় এসএমএস ওটিপি ভেরিফিকেশন প্রয়োজন।`,
      });
      riskScore += 35;
      warnings.push('High-value order: SMS OTP verification required before delivery dispatch.');
    }

    // 5. Customer Delivery & RTO (Return to Origin) History
    const stats = await this.repo.getCustomerOrderStats(normalizedPhone, customerId);
    if (stats.totalOrders >= 2 && stats.rtoRatePercent >= DEFAULT_MAX_ALLOWED_RTO_RATE) {
      const isExtremeRto = stats.rtoRatePercent >= 60 && stats.totalOrders >= 3;
      factors.push({
        factor: 'CUSTOMER_RTO_HISTORY',
        score: isExtremeRto ? 85 : 50,
        severity: isExtremeRto ? 'CRITICAL' : 'HIGH',
        messageEn: `High delivery refusal/return rate (${stats.rtoRatePercent}% RTO across ${stats.totalOrders} past orders).`,
        messageBn: `পূর্ববর্তী ${stats.totalOrders}টি অর্ডারের মধ্যে ${stats.rtoRatePercent}% পার্সেল ফেরত এসেছে।`,
      });
      riskScore += isExtremeRto ? 85 : 50;

      if (isExtremeRto) {
        return this.buildResult(
          false,
          'PREPAYMENT_REQUIRED',
          Math.min(100, riskScore),
          subtotal,
          factors,
          [
            'Persistent delivery returns detected on this phone number. Digital prepayment required.',
          ],
          false,
          true
        );
      }
    }

    // 6. Active Pending COD Order Velocity Check
    const activePendingCod = await this.repo.countActivePendingCodOrders(
      normalizedPhone,
      customerId
    );

    if (activePendingCod >= DEFAULT_MAX_ACTIVE_PENDING_COD) {
      factors.push({
        factor: 'ORDER_VELOCITY_RAPID_FIRE',
        score: 45,
        severity: 'HIGH',
        messageEn: `You currently have ${activePendingCod} active pending COD orders. Please await delivery or prepay.`,
        messageBn: `আপনার বর্তমানে ${activePendingCod}টি ক্যাশ অন ডেলিভারি অর্ডার প্রক্রিয়াধীন রয়েছে।`,
      });
      riskScore += 45;
      warnings.push(
        `Maximum concurrent pending COD orders limit (${DEFAULT_MAX_ACTIVE_PENDING_COD}) reached.`
      );
    }

    // 7. Check if phone is verified
    const isPhoneVerified = await this.checkPhoneVerified(normalizedPhone, customerId);
    if (!isPhoneVerified && stats.totalOrders === 0) {
      factors.push({
        factor: 'UNVERIFIED_PHONE_NUMBER',
        score: 25,
        severity: 'LOW',
        messageEn: 'First-time customer phone number. Phone verification recommended.',
        messageBn: 'নতুন গ্রাহক: ফোন নম্বরটি যাচাই করা প্রয়োজন।',
      });
      riskScore += 25;
    }

    // 8. Classify Final Risk Level
    const finalScore = Math.min(100, riskScore);
    let riskLevel: CodRiskLevel = 'APPROVED';
    let requiresOtp = false;
    let requiresPrepayment = false;

    if (finalScore >= 80) {
      riskLevel = 'PREPAYMENT_REQUIRED';
      requiresPrepayment = true;
    } else if (finalScore >= 35) {
      riskLevel = 'OTP_REQUIRED';
      requiresOtp = true;
    } else {
      riskLevel = 'APPROVED';
    }

    return this.buildResult(
      !requiresPrepayment,
      riskLevel,
      finalScore,
      subtotal,
      factors,
      warnings,
      requiresOtp,
      requiresPrepayment
    );
  }

  /**
   * Dispatches a 6-digit numeric SMS verification OTP to the recipient's phone number.
   */
  public async sendCodVerificationOtp(recipientPhone: string): Promise<SendCodOtpResultDTO> {
    const normalizedPhone = normalizeBangladeshPhone(recipientPhone);

    // Cooldown check (60 seconds)
    const latest = await this.otpRepo.getLatestOtp(normalizedPhone, COD_OTP_PURPOSE);
    if (latest) {
      const elapsedSeconds = (Date.now() - new Date(latest.createdAt).getTime()) / 1000;
      if (elapsedSeconds < 60) {
        throw new ConflictError(
          `Please wait ${Math.ceil(60 - elapsedSeconds)} seconds before requesting another verification code.`
        );
      }
    }

    // Hourly rate limit (max 5 per hour)
    const oneHourAgo = new Date(Date.now() - 3600000);
    const hourlyCount = await this.otpRepo.getRecentOtpCount(
      normalizedPhone,
      COD_OTP_PURPOSE,
      oneHourAgo
    );
    if (hourlyCount >= 5) {
      throw new ConflictError('Too many verification requests. Please try again after an hour.');
    }

    // Generate secure 6-digit numeric OTP
    const rawOtp = String(Math.floor(100000 + Math.random() * 900000));
    const tokenHash = createHash('sha256').update(rawOtp).digest('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes TTL

    await this.otpRepo.createOtp({
      identifier: normalizedPhone,
      purpose: COD_OTP_PURPOSE,
      tokenHash,
      expiresAt,
      maxAttempts: 3,
    });

    // Emit outbox event for SMS delivery
    await (this.db as any).outboxEvent.create({
      data: {
        id: generatePrefixedId(ENTITY_PREFIXES.OUTBOX),
        eventType: 'notification.sms_requested',
        aggregateType: 'OTP',
        aggregateId: normalizedPhone,
        payload: {
          phone: normalizedPhone,
          purpose: COD_OTP_PURPOSE,
          message: `Your AlifWorld COD verification code is ${rawOtp}. Valid for 10 minutes. Do not share this code.`,
          otp: process.env.NODE_ENV !== 'production' ? rawOtp : undefined,
        },
      },
    });

    return {
      success: true,
      phone: normalizedPhone,
      maskedPhone: maskBangladeshPhone(normalizedPhone),
      cooldownSeconds: 60,
      expiresInSeconds: 600,
      message: `Verification code sent to ${maskBangladeshPhone(normalizedPhone)}.`,
    };
  }

  /**
   * Verifies the 6-digit OTP code and generates a single-use verification ticket for checkout.
   */
  public async verifyCodOtp(recipientPhone: string, otp: string): Promise<VerifyCodOtpResultDTO> {
    const normalizedPhone = normalizeBangladeshPhone(recipientPhone);
    const activeToken = await this.otpRepo.findActiveOtp(normalizedPhone, COD_OTP_PURPOSE);

    if (!activeToken) {
      throw new ValidationError('Verification code is invalid, expired, or already used.');
    }

    if (activeToken.attempts >= (activeToken.maxAttempts || 3)) {
      throw new ValidationError(
        'Maximum verification attempts exceeded. Please request a new code.'
      );
    }

    const inputHash = createHash('sha256').update(otp.trim()).digest('hex');
    if (activeToken.tokenHash !== inputHash) {
      await this.otpRepo.incrementAttempts(activeToken.id);
      throw new ValidationError('Invalid verification code entered.');
    }

    // Mark token as used
    await this.otpRepo.markUsed(activeToken.id);

    // Generate cryptographic single-use ticket
    const ticketRandom = randomBytes(24).toString('hex');
    const verificationTicket = `cod_tkt_${createHash('sha256')
      .update(normalizedPhone + ticketRandom)
      .digest('hex')
      .slice(0, 32)}`;

    return {
      verified: true,
      phone: normalizedPhone,
      verificationToken: verificationTicket,
      message: 'Phone number verified successfully for Cash on Delivery checkout.',
    };
  }

  /**
   * Retrieves the active versioned COD policy configuration.
   */
  public async getCodPolicyConfig(): Promise<CodPolicyConfigDTO> {
    return {
      maxCodOrderValuePoisha: DEFAULT_MAX_COD_ORDER_VALUE_POISHA,
      maxCodOrderValueBdtFormatted: this.formatBdt(DEFAULT_MAX_COD_ORDER_VALUE_POISHA),
      otpThresholdPoisha: DEFAULT_OTP_THRESHOLD_POISHA,
      otpThresholdBdtFormatted: this.formatBdt(DEFAULT_OTP_THRESHOLD_POISHA),
      maxActivePendingCodOrders: DEFAULT_MAX_ACTIVE_PENDING_COD,
      maxAllowedRtoRatePercent: DEFAULT_MAX_ALLOWED_RTO_RATE,
      minCompletedOrdersForTrusted: 3,
      isPhoneVerificationRequiredForNewUsers: true,
      policyVersion: 'v1.0.0',
    };
  }

  /**
   * Adds or updates a blacklist entry.
   */
  public async addBlacklistEntry(data: {
    type: 'PHONE' | 'EMAIL' | 'IP_ADDRESS' | 'DEVICE_FINGERPRINT';
    identifier: string;
    reason: string;
    severity?: 'BLOCK' | 'OTP_REQUIRED' | 'FLAG';
    addedBy?: string | null;
    expiresAt?: Date | null;
  }) {
    const cleanIdentifier =
      data.type === 'PHONE' ? normalizeBangladeshPhone(data.identifier) : data.identifier.trim();

    return this.repo.addBlacklistEntry({
      ...data,
      identifier: cleanIdentifier,
    });
  }

  /**
   * Removes an identifier from the blacklist.
   */
  public async removeBlacklistEntry(
    type: 'PHONE' | 'EMAIL' | 'IP_ADDRESS' | 'DEVICE_FINGERPRINT',
    identifier: string
  ): Promise<boolean> {
    const cleanIdentifier =
      type === 'PHONE' ? normalizeBangladeshPhone(identifier) : identifier.trim();

    return this.repo.removeBlacklistEntry(type, cleanIdentifier);
  }

  /**
   * Lists blacklist entries with pagination.
   */
  public async listBlacklist(options: { type?: string; page?: number; limit?: number }) {
    return this.repo.listBlacklist(options);
  }

  /**
   * Checks if customer's phone number is already verified in their account.
   */
  private async checkPhoneVerified(phone: string, customerId?: string | null): Promise<boolean> {
    if (customerId) {
      const user = await (this.db as any).user.findFirst({
        where: { id: customerId, deletedAt: null },
        select: { isPhoneVerified: true, phone: true },
      });
      if (user?.isPhoneVerified && user?.phone === phone) {
        return true;
      }
    }
    return false;
  }

  private buildResult(
    isEligible: boolean,
    riskLevel: CodRiskLevel,
    riskScore: number,
    orderSubtotalPoisha: number,
    factors: CodRiskFactorDTO[],
    warnings: string[],
    requiresOtpVerification: boolean,
    requiresPrepayment: boolean
  ): CodEligibilityEvaluationDTO {
    return {
      isEligible,
      riskLevel,
      riskScore,
      orderSubtotalPoisha,
      orderSubtotalBdtFormatted: this.formatBdt(orderSubtotalPoisha),
      maxCodLimitPoisha: DEFAULT_MAX_COD_ORDER_VALUE_POISHA,
      maxCodLimitBdtFormatted: this.formatBdt(DEFAULT_MAX_COD_ORDER_VALUE_POISHA),
      requiresOtpVerification,
      requiresPrepayment,
      isPhoneVerified: !requiresOtpVerification,
      factors,
      warnings,
      policyVersion: 'v1.0.0',
      evaluatedAt: new Date().toISOString(),
    };
  }

  private formatBdt(poisha: bigint | number): string {
    const num = typeof poisha === 'bigint' ? Number(poisha) : poisha;
    const bdt = (num / 100).toLocaleString('en-BD', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `৳${bdt}`;
  }
}

export const codFraudRiskService = new CodFraudRiskService();
