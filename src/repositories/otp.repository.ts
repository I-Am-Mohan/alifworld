/**
 * AlifWorld Ephemeral OTP & Verification Token Repository
 * 
 * Manages one-time verification tokens, attempt tracking, cooldowns,
 * and rate-limiting inspection for email and SMS OTPs.
 * 
 * Invariants: ADR-0022, ADR-0031, ADR-0033
 */

import { getPrismaClient } from '@/shared/database/prisma';
import { generateId, ID_PREFIXES } from '@/shared/utils/id';

export interface CreateOtpParams {
  userId?: string | null;
  identifier: string;
  purpose: string;
  tokenHash: string;
  expiresAt: Date;
  maxAttempts?: number;
}

export class OtpRepository {
  private get prisma() {
    return getPrismaClient() as any;
  }

  /**
   * Finds the latest active (unused and unexpired) OTP token for an identifier and purpose.
   */
  async findActiveOtp(identifier: string, purpose: string) {
    return this.prisma.otpToken.findFirst({
      where: {
        identifier,
        purpose,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      include: { user: true },
    });
  }

  /**
   * Retrieves the most recent OTP token created for this identifier (used for cooldown checks).
   */
  async getLatestOtp(identifier: string, purpose: string) {
    return this.prisma.otpToken.findFirst({
      where: {
        identifier,
        purpose,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Counts OTP tokens generated within a given time window (for hourly rate limiting).
   */
  async getRecentOtpCount(identifier: string, purpose: string, since: Date): Promise<number> {
    return this.prisma.otpToken.count({
      where: {
        identifier,
        purpose,
        createdAt: { gte: since },
      },
    });
  }

  /**
   * Creates a new ephemeral OTP token.
   */
  async createOtp(params: CreateOtpParams) {
    const id = generateId(ID_PREFIXES.OTP);

    return this.prisma.otpToken.create({
      data: {
        id,
        userId: params.userId ?? null,
        identifier: params.identifier,
        purpose: params.purpose,
        tokenHash: params.tokenHash,
        attempts: 0,
        maxAttempts: params.maxAttempts ?? 3,
        isUsed: false,
        expiresAt: params.expiresAt,
      },
    });
  }

  /**
   * Increments the attempt counter for an OTP token.
   */
  async incrementAttempts(id: string): Promise<{ attempts: number; maxAttempts: number }> {
    const updated = await this.prisma.otpToken.update({
      where: { id },
      data: {
        attempts: { increment: 1 },
      },
      select: { attempts: true, maxAttempts: true },
    });

    return updated;
  }

  /**
   * Marks an OTP token as used (consumed).
   */
  async markUsed(id: string) {
    return this.prisma.otpToken.update({
      where: { id },
      data: {
        isUsed: true,
      },
    });
  }

  /**
   * Invalidates all outstanding active tokens for an identifier and purpose (e.g. before resend).
   */
  async invalidateActiveOtps(identifier: string, purpose: string): Promise<number> {
    const result = await this.prisma.otpToken.updateMany({
      where: {
        identifier,
        purpose,
        isUsed: false,
      },
      data: {
        isUsed: true,
      },
    });

    return result.count;
  }
}
