/**
 * AlifWorld Customer Email Verification & Resend Controls Service
 * 
 * Manages 6-digit verification code evaluation, lockout counters (max 3 attempts),
 * 60-second resend cooldowns, hourly rate limits, and email verification updates.
 * 
 * Invariants: ADR-0022, ADR-0031, ADR-0032, ADR-0033
 */

import { OtpRepository } from '@/repositories/otp.repository';
import { UserRepository } from '@/repositories/user.repository';
import { getPrismaClient } from '@/shared/database/prisma';
import { hashToken } from '@/shared/auth/jwt';
import { generateId, ID_PREFIXES } from '@/shared/utils/id';
import { ValidationError, NotFoundError } from '@/shared/errors/app-error';
import { sendEmailViaSmtp } from '@/shared/email/smtp-transport';

export const EMAIL_VERIFICATION_CONSTANTS = {
  PURPOSE: 'EMAIL_VERIFICATION',
  RESEND_COOLDOWN_SECONDS: 60,
  MAX_RESEND_PER_HOUR: 3,
  MAX_ATTEMPTS: 3,
  CODE_TTL_SECONDS: 15 * 60, // 15 minutes
};

export interface VerificationResult {
  verified: boolean;
  alreadyVerified?: boolean;
  email: string;
  userId?: string;
  message: string;
}

export interface ResendResult {
  success: boolean;
  alreadyVerified?: boolean;
  message: string;
  cooldownSeconds: number;
  devVerificationCode?: string;
}

export class EmailVerificationService {
  private otpRepo: OtpRepository;
  private userRepo: UserRepository;
  private prismaClient?: any;

  constructor(otpRepo?: OtpRepository, userRepo?: UserRepository, prisma?: any) {
    this.otpRepo = otpRepo || new OtpRepository();
    this.userRepo = userRepo || new UserRepository();
    this.prismaClient = prisma;
  }

  private get prisma() {
    return this.prismaClient || (getPrismaClient() as any);
  }

  /**
   * Verifies an email address using a submitted 6-digit numeric verification code.
   */
  async verifyEmail(email: string, code: string): Promise<VerificationResult> {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Locate user if exists
    const user = await this.userRepo.findUserByEmail(cleanEmail);

    if (user?.isEmailVerified) {
      return {
        verified: true,
        alreadyVerified: true,
        email: cleanEmail,
        userId: user.id,
        message: 'Email address is already verified.',
      };
    }

    // 2. Locate active OTP token
    const activeOtp = await this.otpRepo.findActiveOtp(
      cleanEmail,
      EMAIL_VERIFICATION_CONSTANTS.PURPOSE
    );

    if (!activeOtp) {
      throw new ValidationError(
        'Verification code has expired or is invalid. Please request a new code.',
        { email: cleanEmail }
      );
    }

    // 3. Check attempt limit
    if (activeOtp.attempts >= activeOtp.maxAttempts) {
      await this.otpRepo.markUsed(activeOtp.id);
      throw new ValidationError(
        'Too many failed attempts. This code has been invalidated. Please request a new verification code.',
        { email: cleanEmail }
      );
    }

    // 4. Verify code hash
    const inputHash = hashToken(code);
    if (inputHash !== activeOtp.tokenHash) {
      const { attempts, maxAttempts } = await this.otpRepo.incrementAttempts(activeOtp.id);
      const remainingAttempts = Math.max(0, maxAttempts - attempts);

      if (remainingAttempts === 0) {
        await this.otpRepo.markUsed(activeOtp.id);
        throw new ValidationError(
          'Incorrect verification code. Maximum attempts reached. Please request a new code.',
          { remainingAttempts: 0 }
        );
      }

      throw new ValidationError(
        `Incorrect verification code. You have ${remainingAttempts} attempt(s) remaining.`,
        { remainingAttempts }
      );
    }

    // 5. Code is valid: mark OTP consumed, mark user verified if user exists
    await this.prisma.$transaction(async (tx: any) => {
      // Mark OTP used
      await tx.otpToken.update({
        where: { id: activeOtp.id },
        data: { isUsed: true },
      });

      if (user) {
        // Mark user email verified
        await tx.user.update({
          where: { id: user.id },
          data: { isEmailVerified: true },
        });

        // Audit Log
        await tx.auditLog.create({
          data: {
            id: generateId(ID_PREFIXES.AUDIT),
            actorId: user.id,
            actorRole: 'CUSTOMER',
            action: 'EMAIL_VERIFIED',
            resource: 'User',
            resourceId: user.id,
            metadata: { email: cleanEmail },
          },
        });

        // Outbox Event
        await tx.outboxEvent.create({
          data: {
            id: generateId(ID_PREFIXES.OUTBOX),
            eventType: 'auth.email_verified',
            aggregateType: 'User',
            aggregateId: user.id,
            payload: { userId: user.id, email: cleanEmail },
            status: 'PENDING',
          },
        });
      }
    });

    return {
      verified: true,
      email: cleanEmail,
      userId: user?.id,
      message: 'Email verified successfully!',
    };
  }

  /**
   * Resends a verification code with 60-second cooldown and hourly rate limit enforcement.
   */
  async resendVerificationCode(email: string): Promise<ResendResult> {
    const cleanEmail = email.trim().toLowerCase();

    const user = await this.userRepo.findUserByEmail(cleanEmail);

    if (user?.isEmailVerified) {
      return {
        success: true,
        alreadyVerified: true,
        message: 'Your email address is already verified.',
        cooldownSeconds: 0,
      };
    }

    // 1. Enforce 60-second cooldown from latest OTP
    const latestOtp = await this.otpRepo.getLatestOtp(
      cleanEmail,
      EMAIL_VERIFICATION_CONSTANTS.PURPOSE
    );

    if (latestOtp) {
      const elapsedSeconds = Math.floor(
        (Date.now() - new Date(latestOtp.createdAt).getTime()) / 1000
      );

      if (elapsedSeconds < EMAIL_VERIFICATION_CONSTANTS.RESEND_COOLDOWN_SECONDS) {
        const remainingSeconds =
          EMAIL_VERIFICATION_CONSTANTS.RESEND_COOLDOWN_SECONDS - elapsedSeconds;
        throw new ValidationError(
          `Please wait ${remainingSeconds} second(s) before requesting another code.`,
          { cooldownRemainingSeconds: remainingSeconds }
        );
      }
    }

    // 2. Enforce max 3 resends per hour
    const oneHourAgo = new Date(Date.now() - 3600 * 1000);
    const hourlyCount = await this.otpRepo.getRecentOtpCount(
      cleanEmail,
      EMAIL_VERIFICATION_CONSTANTS.PURPOSE,
      oneHourAgo
    );

    if (hourlyCount >= EMAIL_VERIFICATION_CONSTANTS.MAX_RESEND_PER_HOUR) {
      throw new ValidationError(
        'Maximum resend limit reached for this hour (3 attempts). Please try again later or contact support.',
        { maxPerHour: EMAIL_VERIFICATION_CONSTANTS.MAX_RESEND_PER_HOUR }
      );
    }

    // 3. Invalidate any existing active tokens
    await this.otpRepo.invalidateActiveOtps(cleanEmail, EMAIL_VERIFICATION_CONSTANTS.PURPOSE);

    // 4. Generate fresh 6-digit numeric verification code
    const rawVerificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const tokenHash = hashToken(rawVerificationCode);
    const expiresAt = new Date(
      Date.now() + EMAIL_VERIFICATION_CONSTANTS.CODE_TTL_SECONDS * 1000
    );

    await this.prisma.$transaction(async (tx: any) => {
      // Create OTP token
      await tx.otpToken.create({
        data: {
          id: generateId(ID_PREFIXES.OTP),
          userId: user?.id ?? null,
          identifier: cleanEmail,
          purpose: EMAIL_VERIFICATION_CONSTANTS.PURPOSE,
          tokenHash,
          attempts: 0,
          maxAttempts: EMAIL_VERIFICATION_CONSTANTS.MAX_ATTEMPTS,
          isUsed: false,
          expiresAt,
        },
      });

      // Outbox Event
      await tx.outboxEvent.create({
        data: {
          id: generateId(ID_PREFIXES.OUTBOX),
          eventType: 'auth.verification_email_resend',
          aggregateType: 'User',
          aggregateId: user?.id ?? cleanEmail,
          payload: {
            userId: user?.id ?? null,
            email: cleanEmail,
            name: user?.name ?? 'Seller',
            verificationCode: rawVerificationCode,
            expiresAt: expiresAt.toISOString(),
          },
          status: 'PENDING',
        },
      });

      if (user) {
        // Audit Log
        await tx.auditLog.create({
          data: {
            id: generateId(ID_PREFIXES.AUDIT),
            actorId: user.id,
            actorRole: 'CUSTOMER',
            action: 'VERIFICATION_CODE_RESENT',
            resource: 'User',
            resourceId: user.id,
            metadata: { email: cleanEmail },
          },
        });
      }
    });

    // Dispatch email via SMTP if configured
    sendEmailViaSmtp({
      to: cleanEmail,
      subject: 'AlifWorld Email Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #FF6A00; margin-top: 0;">AlifWorld Email Verification</h2>
          <p>Hi ${user?.name || 'Seller'},</p>
          <p>Your requested 6-digit email verification code is:</p>
          <div style="background-color: #f8fafc; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #0f172a; border-radius: 8px; margin: 15px 0;">
            ${rawVerificationCode}
          </div>
          <p style="font-size: 12px; color: #64748b;">This verification code will expire in 15 minutes.</p>
        </div>
      `,
    }).catch(() => undefined);

    const isDev = process.env.NODE_ENV !== 'production';

    return {
      success: true,
      message: 'A 6-digit verification code has been sent to your email.',
      cooldownSeconds: EMAIL_VERIFICATION_CONSTANTS.RESEND_COOLDOWN_SECONDS,
      ...(isDev && { devVerificationCode: rawVerificationCode }),
    };
  }
}
