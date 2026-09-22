import { beforeEach, describe, expect, it } from 'bun:test';
import {
  PasswordSecurityService,
  PASSWORD_RESET_POLICY,
} from '@/services/password-security.service';
import { hashPassword, isCommonPassword, verifyPassword } from '@/shared/auth/password';
import { hashToken } from '@/shared/auth/jwt';
import { UnauthorizedError, ValidationError } from '@/shared/errors/app-error';

describe('Password reset, change, and breach-safe controls (Milestone 037)', () => {
  const fixedNow = new Date('2026-09-22T12:00:00.000Z');
  const rawResetToken = 'reset_token_with_more_than_thirty_two_secure_characters_037';
  const originalPassword = 'Original@Pass2026';
  const replacementPassword = 'NewUnique@Pass2027';

  let user: any;
  let otpTokens: any[];
  let sessions: any[];
  let auditLogs: any[];
  let outboxEvents: any[];
  let service: PasswordSecurityService;

  beforeEach(() => {
    user = {
      id: 'usr_password_security_01',
      email: 'customer@example.com',
      name: 'Customer',
      status: 'ACTIVE',
      passwordHash: hashPassword(originalPassword),
      tokenVersion: 1,
      deletedAt: null,
    };
    otpTokens = [];
    sessions = [
      { id: 'ses_one', userId: user.id, isRevoked: false },
      { id: 'ses_two', userId: user.id, isRevoked: false },
    ];
    auditLogs = [];
    outboxEvents = [];

    const otpRepo: any = {
      getLatestOtp: async (identifier: string, purpose: string) =>
        otpTokens
          .filter((otp) => otp.identifier === identifier && otp.purpose === purpose)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] || null,
      getRecentOtpCount: async (identifier: string, purpose: string, since: Date) =>
        otpTokens.filter(
          (otp) =>
            otp.identifier === identifier &&
            otp.purpose === purpose &&
            otp.createdAt >= since
        ).length,
      findActiveOtp: async (identifier: string, purpose: string) =>
        otpTokens
          .filter(
            (otp) =>
              otp.identifier === identifier &&
              otp.purpose === purpose &&
              !otp.isUsed &&
              otp.expiresAt > fixedNow
          )
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] || null,
      incrementAttempts: async (id: string) => {
        const otp = otpTokens.find((candidate) => candidate.id === id);
        otp.attempts += 1;
        return { attempts: otp.attempts, maxAttempts: otp.maxAttempts };
      },
      markUsed: async (id: string) => {
        const otp = otpTokens.find((candidate) => candidate.id === id);
        otp.isUsed = true;
        return otp;
      },
    };

    const userRepo: any = {
      findPasswordUserByEmail: async (email: string) =>
        email === user.email ? { ...user } : null,
      findPasswordUserById: async (id: string) => (id === user.id ? { ...user } : null),
    };

    const matchesOtp = (otp: any, where: any) => {
      if (where.id && otp.id !== where.id) return false;
      if (where.identifier && otp.identifier !== where.identifier) return false;
      if (where.userId && otp.userId !== where.userId) return false;
      if (where.purpose && otp.purpose !== where.purpose) return false;
      if (where.isUsed !== undefined && otp.isUsed !== where.isUsed) return false;
      if (where.expiresAt?.gt && otp.expiresAt <= where.expiresAt.gt) return false;
      return true;
    };

    const tx: any = {
      otpToken: {
        create: async ({ data }: any) => {
          const token = { ...data, createdAt: fixedNow };
          otpTokens.push(token);
          return token;
        },
        updateMany: async ({ where, data }: any) => {
          let count = 0;
          for (const otp of otpTokens) {
            if (matchesOtp(otp, where)) {
              Object.assign(otp, data);
              count += 1;
            }
          }
          return { count };
        },
      },
      user: {
        update: async ({ where, data }: any) => {
          if (where.id !== user.id) throw new Error('missing user');
          user.passwordHash = data.passwordHash;
          if (data.tokenVersion?.increment) user.tokenVersion += data.tokenVersion.increment;
          return user;
        },
        updateMany: async ({ where, data }: any) => {
          if (where.id !== user.id || where.passwordHash !== user.passwordHash) return { count: 0 };
          user.passwordHash = data.passwordHash;
          if (data.tokenVersion?.increment) user.tokenVersion += data.tokenVersion.increment;
          return { count: 1 };
        },
      },
      userSession: {
        updateMany: async ({ where, data }: any) => {
          let count = 0;
          for (const session of sessions) {
            if (session.userId === where.userId && session.isRevoked === where.isRevoked) {
              Object.assign(session, data);
              count += 1;
            }
          }
          return { count };
        },
      },
      auditLog: {
        create: async ({ data }: any) => {
          auditLogs.push(data);
          return data;
        },
      },
      outboxEvent: {
        create: async ({ data }: any) => {
          outboxEvents.push(data);
          return data;
        },
      },
    };

    const prisma: any = {
      $transaction: async (work: (transaction: any) => Promise<unknown>) => work(tx),
    };

    service = new PasswordSecurityService(
      otpRepo,
      userRepo,
      prisma,
      () => fixedNow,
      () => rawResetToken
    );
  });

  it('blocks commonly breached passwords even when they satisfy composition rules', () => {
    expect(isCommonPassword('Password@123')).toBe(true);
  });

  it('returns a neutral acknowledgement for an unknown email without queueing mail', async () => {
    const result = await service.requestPasswordReset('unknown@example.com', 'en-BD');
    expect(result.accepted).toBe(true);
    expect(result.message).not.toContain('unknown@example.com');
    expect(otpTokens).toHaveLength(0);
    expect(outboxEvents).toHaveLength(0);
  });

  it('stores only the reset-token hash and queues a localized outbox notification', async () => {
    await service.requestPasswordReset(user.email, 'bn-BD', { ipAddress: '127.0.0.1' });

    expect(otpTokens).toHaveLength(1);
    expect(otpTokens[0].purpose).toBe(PASSWORD_RESET_POLICY.PURPOSE);
    expect(otpTokens[0].tokenHash).toBe(hashToken(rawResetToken));
    expect(JSON.stringify(otpTokens[0])).not.toContain(rawResetToken);
    expect(outboxEvents[0].eventType).toBe('auth.password_reset_requested');
    expect(outboxEvents[0].payload.locale).toBe('bn-BD');
    expect(auditLogs[0].metadata).not.toHaveProperty('resetToken');
  });

  it('enforces cooldown without revealing that an account exists', async () => {
    const first = await service.requestPasswordReset(user.email, 'en-BD');
    const second = await service.requestPasswordReset(user.email, 'en-BD');

    expect(second.message).toBe(first.message);
    expect(otpTokens).toHaveLength(1);
    expect(outboxEvents).toHaveLength(1);
  });

  it('increments attempts for an invalid reset token', async () => {
    await service.requestPasswordReset(user.email, 'en-BD');

    await expect(
      service.resetPassword(user.email, 'wrong_token_that_is_long_enough_for_the_contract', replacementPassword)
    ).rejects.toBeInstanceOf(ValidationError);
    expect(otpTokens[0].attempts).toBe(1);
    expect(verifyPassword(originalPassword, user.passwordHash)).toBe(true);
  });

  it('atomically resets the password, consumes the token, and revokes every session', async () => {
    await service.requestPasswordReset(user.email, 'en-BD');
    const result = await service.resetPassword(user.email, rawResetToken, replacementPassword);

    expect(result.passwordReset).toBe(true);
    expect(verifyPassword(replacementPassword, user.passwordHash)).toBe(true);
    expect(user.tokenVersion).toBe(2);
    expect(otpTokens[0].isUsed).toBe(true);
    expect(sessions.every((session) => session.isRevoked)).toBe(true);
    expect(auditLogs.some((log) => log.action === 'PASSWORD_RESET_COMPLETED')).toBe(true);
  });

  it('rejects an incorrect current password without changing account state', async () => {
    await expect(
      service.changePassword(user.id, 'Wrong@Password2026', replacementPassword)
    ).rejects.toBeInstanceOf(UnauthorizedError);
    expect(user.tokenVersion).toBe(1);
    expect(sessions.every((session) => !session.isRevoked)).toBe(true);
  });

  it('changes an authenticated password and revokes all sessions', async () => {
    const result = await service.changePassword(user.id, originalPassword, replacementPassword);

    expect(result.passwordChanged).toBe(true);
    expect(verifyPassword(replacementPassword, user.passwordHash)).toBe(true);
    expect(user.tokenVersion).toBe(2);
    expect(sessions.every((session) => session.revokedReason === 'PASSWORD_CHANGED')).toBe(true);
    expect(outboxEvents.some((event) => event.eventType === 'auth.password_changed')).toBe(true);
  });
});
