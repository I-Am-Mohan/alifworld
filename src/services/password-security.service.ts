/**
 * Password reset and authenticated password-change orchestration.
 *
 * Reset tokens are opaque, one-time, short-lived, and stored only as SHA-256
 * hashes. Password mutations rotate the user's token version and revoke every
 * active session so credentials cannot be changed while stolen sessions remain.
 */

import { randomBytes, timingSafeEqual } from 'crypto';
import { OtpRepository } from '@/repositories/otp.repository';
import { UserRepository } from '@/repositories/user.repository';
import { getPrismaClient } from '@/shared/database/prisma';
import { hashToken } from '@/shared/auth/jwt';
import {
  hashPassword,
  validatePasswordStrength,
  verifyPassword,
} from '@/shared/auth/password';
import { generateId, ID_PREFIXES } from '@/shared/utils/id';
import {
  ConflictError,
  UnauthorizedError,
  ValidationError,
} from '@/shared/errors/app-error';

export const PASSWORD_RESET_POLICY = {
  PURPOSE: 'PASSWORD_RESET',
  TOKEN_TTL_SECONDS: 15 * 60,
  REQUEST_COOLDOWN_SECONDS: 60,
  MAX_REQUESTS_PER_HOUR: 3,
  MAX_TOKEN_ATTEMPTS: 5,
} as const;

export interface PasswordRequestResult {
  accepted: true;
  message: string;
  cooldownSeconds: number;
  devResetToken?: string;
}

function tokenHashesMatch(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

interface RequestMetadata {
  ipAddress?: string | null;
  userAgent?: string | null;
}

export class PasswordSecurityService {
  private readonly otpRepo: OtpRepository;
  private readonly userRepo: UserRepository;
  private readonly prismaClient?: any;
  private readonly now: () => Date;
  private readonly createToken: () => string;

  constructor(
    otpRepo?: OtpRepository,
    userRepo?: UserRepository,
    prisma?: any,
    now: () => Date = () => new Date(),
    createToken: () => string = () => randomBytes(32).toString('base64url')
  ) {
    this.otpRepo = otpRepo || new OtpRepository();
    this.userRepo = userRepo || new UserRepository();
    this.prismaClient = prisma;
    this.now = now;
    this.createToken = createToken;
  }

  private get prisma() {
    return this.prismaClient || (getPrismaClient() as any);
  }

  private neutralRequestResult(devResetToken?: string): PasswordRequestResult {
    return {
      accepted: true,
      message: 'If an account exists for this email, password reset instructions have been queued.',
      cooldownSeconds: PASSWORD_RESET_POLICY.REQUEST_COOLDOWN_SECONDS,
      ...(process.env.NODE_ENV !== 'production' && devResetToken
        ? { devResetToken }
        : {}),
    };
  }

  private assertAllowedPassword(password: string): void {
    const result = validatePasswordStrength(password);
    if (!result.isValid) {
      throw new ValidationError('Password does not meet the security requirements.', {
        reason: result.errors.some((error) => error.includes('data breaches'))
          ? 'PASSWORD_COMPROMISED'
          : 'PASSWORD_POLICY_FAILED',
        errors: result.errors,
      });
    }
  }

  async requestPasswordReset(
    email: string,
    locale: 'bn-BD' | 'en-BD',
    metadata: RequestMetadata = {}
  ): Promise<PasswordRequestResult> {
    const cleanEmail = email.trim().toLowerCase();
    const user = await this.userRepo.findPasswordUserByEmail(cleanEmail);

    // The response stays identical for unknown, deleted, and passwordless accounts.
    if (!user || user.deletedAt || !user.passwordHash) {
      hashToken(this.createToken());
      return this.neutralRequestResult();
    }

    const now = this.now();
    const latest = await this.otpRepo.getLatestOtp(cleanEmail, PASSWORD_RESET_POLICY.PURPOSE);
    if (latest) {
      const elapsedSeconds = Math.floor(
        (now.getTime() - new Date(latest.createdAt).getTime()) / 1000
      );
      if (elapsedSeconds < PASSWORD_RESET_POLICY.REQUEST_COOLDOWN_SECONDS) {
        return this.neutralRequestResult();
      }
    }

    const hourStart = new Date(now.getTime() - 60 * 60 * 1000);
    const recentCount = await this.otpRepo.getRecentOtpCount(
      cleanEmail,
      PASSWORD_RESET_POLICY.PURPOSE,
      hourStart
    );
    if (recentCount >= PASSWORD_RESET_POLICY.MAX_REQUESTS_PER_HOUR) {
      return this.neutralRequestResult();
    }

    const rawToken = this.createToken();
    const expiresAt = new Date(
      now.getTime() + PASSWORD_RESET_POLICY.TOKEN_TTL_SECONDS * 1000
    );

    await this.prisma.$transaction(async (tx: any) => {
      await tx.otpToken.updateMany({
        where: {
          identifier: cleanEmail,
          purpose: PASSWORD_RESET_POLICY.PURPOSE,
          isUsed: false,
        },
        data: { isUsed: true },
      });

      await tx.otpToken.create({
        data: {
          id: generateId(ID_PREFIXES.OTP),
          userId: user.id,
          identifier: cleanEmail,
          purpose: PASSWORD_RESET_POLICY.PURPOSE,
          tokenHash: hashToken(rawToken),
          attempts: 0,
          maxAttempts: PASSWORD_RESET_POLICY.MAX_TOKEN_ATTEMPTS,
          isUsed: false,
          expiresAt,
        },
      });

      await tx.auditLog.create({
        data: {
          id: generateId(ID_PREFIXES.AUDIT),
          actorId: user.id,
          actorRole: 'ACCOUNT_OWNER',
          action: 'PASSWORD_RESET_REQUESTED',
          resource: 'User',
          resourceId: user.id,
          ipAddress: metadata.ipAddress || null,
          userAgent: metadata.userAgent || null,
          metadata: { delivery: 'OUTBOX', expiresAt: expiresAt.toISOString() },
        },
      });

      await tx.outboxEvent.create({
        data: {
          id: generateId(ID_PREFIXES.OUTBOX),
          eventType: 'auth.password_reset_requested',
          aggregateType: 'User',
          aggregateId: user.id,
          payload: {
            userId: user.id,
            email: cleanEmail,
            name: user.name,
            locale,
            resetToken: rawToken,
            expiresAt: expiresAt.toISOString(),
          },
          status: 'PENDING',
        },
      });
    });

    return this.neutralRequestResult(rawToken);
  }

  async resetPassword(
    email: string,
    token: string,
    newPassword: string,
    metadata: RequestMetadata = {}
  ): Promise<{ passwordReset: true; sessionsRevoked: true; message: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const activeToken = await this.otpRepo.findActiveOtp(
      cleanEmail,
      PASSWORD_RESET_POLICY.PURPOSE
    );

    if (!activeToken || activeToken.attempts >= activeToken.maxAttempts) {
      throw new ValidationError('This password reset link is invalid or has expired.', {
        reason: 'RESET_TOKEN_INVALID',
      });
    }

    if (!tokenHashesMatch(hashToken(token), activeToken.tokenHash)) {
      const attempt = await this.otpRepo.incrementAttempts(activeToken.id);
      if (attempt.attempts >= attempt.maxAttempts) {
        await this.otpRepo.markUsed(activeToken.id);
      }
      throw new ValidationError('This password reset link is invalid or has expired.', {
        reason: 'RESET_TOKEN_INVALID',
      });
    }

    const user = await this.userRepo.findPasswordUserByEmail(cleanEmail);
    if (!user || user.id !== activeToken.userId || user.deletedAt || !user.passwordHash) {
      throw new ValidationError('This password reset link is invalid or has expired.', {
        reason: 'RESET_TOKEN_INVALID',
      });
    }

    this.assertAllowedPassword(newPassword);
    if (verifyPassword(newPassword, user.passwordHash)) {
      throw new ValidationError('Choose a password you have not just been using.', {
        reason: 'PASSWORD_REUSED',
      });
    }

    const now = this.now();
    const passwordHash = hashPassword(newPassword);
    await this.prisma.$transaction(async (tx: any) => {
      const consumed = await tx.otpToken.updateMany({
        where: {
          id: activeToken.id,
          isUsed: false,
          expiresAt: { gt: now },
        },
        data: { isUsed: true },
      });
      if (consumed.count !== 1) {
        throw new ConflictError('This password reset link has already been used.');
      }

      await tx.otpToken.updateMany({
        where: {
          userId: user.id,
          purpose: PASSWORD_RESET_POLICY.PURPOSE,
          isUsed: false,
        },
        data: { isUsed: true },
      });
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash, tokenVersion: { increment: 1 } },
      });
      await tx.userSession.updateMany({
        where: { userId: user.id, isRevoked: false },
        data: {
          isRevoked: true,
          revokedAt: now,
          revokedReason: 'PASSWORD_RESET',
        },
      });
      await tx.auditLog.create({
        data: {
          id: generateId(ID_PREFIXES.AUDIT),
          actorId: user.id,
          actorRole: 'ACCOUNT_OWNER',
          action: 'PASSWORD_RESET_COMPLETED',
          resource: 'User',
          resourceId: user.id,
          ipAddress: metadata.ipAddress || null,
          userAgent: metadata.userAgent || null,
          metadata: { sessionsRevoked: true },
        },
      });
      await tx.outboxEvent.create({
        data: {
          id: generateId(ID_PREFIXES.OUTBOX),
          eventType: 'auth.password_reset_completed',
          aggregateType: 'User',
          aggregateId: user.id,
          payload: { userId: user.id, email: cleanEmail, occurredAt: now.toISOString() },
          status: 'PENDING',
        },
      });
    });

    return {
      passwordReset: true,
      sessionsRevoked: true,
      message: 'Password reset successfully. Sign in again on your devices.',
    };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    metadata: RequestMetadata = {}
  ): Promise<{ passwordChanged: true; sessionsRevoked: true; message: string }> {
    const user = await this.userRepo.findPasswordUserById(userId);
    if (!user || user.deletedAt || !user.passwordHash) {
      throw new UnauthorizedError('Current password is incorrect.');
    }
    if (!verifyPassword(currentPassword, user.passwordHash)) {
      throw new UnauthorizedError('Current password is incorrect.');
    }

    this.assertAllowedPassword(newPassword);
    if (verifyPassword(newPassword, user.passwordHash)) {
      throw new ValidationError('New password must be different from the current password.', {
        reason: 'PASSWORD_REUSED',
      });
    }

    const now = this.now();
    const passwordHash = hashPassword(newPassword);
    await this.prisma.$transaction(async (tx: any) => {
      const changed = await tx.user.updateMany({
        where: { id: user.id, passwordHash: user.passwordHash },
        data: { passwordHash, tokenVersion: { increment: 1 } },
      });
      if (changed.count !== 1) {
        throw new ConflictError('Password changed in another request. Please sign in again.');
      }
      await tx.userSession.updateMany({
        where: { userId: user.id, isRevoked: false },
        data: {
          isRevoked: true,
          revokedAt: now,
          revokedReason: 'PASSWORD_CHANGED',
        },
      });
      await tx.otpToken.updateMany({
        where: {
          userId: user.id,
          purpose: PASSWORD_RESET_POLICY.PURPOSE,
          isUsed: false,
        },
        data: { isUsed: true },
      });
      await tx.auditLog.create({
        data: {
          id: generateId(ID_PREFIXES.AUDIT),
          actorId: user.id,
          actorRole: 'ACCOUNT_OWNER',
          action: 'PASSWORD_CHANGED',
          resource: 'User',
          resourceId: user.id,
          ipAddress: metadata.ipAddress || null,
          userAgent: metadata.userAgent || null,
          metadata: { sessionsRevoked: true },
        },
      });
      await tx.outboxEvent.create({
        data: {
          id: generateId(ID_PREFIXES.OUTBOX),
          eventType: 'auth.password_changed',
          aggregateType: 'User',
          aggregateId: user.id,
          payload: { userId: user.id, email: user.email, occurredAt: now.toISOString() },
          status: 'PENDING',
        },
      });
    });

    return {
      passwordChanged: true,
      sessionsRevoked: true,
      message: 'Password changed successfully. Sign in again on your devices.',
    };
  }
}
