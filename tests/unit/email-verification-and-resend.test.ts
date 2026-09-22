import { describe, it, expect, beforeEach } from 'bun:test';
import { verifyEmailSchema, resendVerificationSchema } from '../../src/validators/auth.validator';
import { EmailVerificationService, EMAIL_VERIFICATION_CONSTANTS } from '../../src/services/email-verification.service';
import { OtpRepository } from '../../src/repositories/otp.repository';
import { UserRepository } from '../../src/repositories/user.repository';
import { hashToken } from '../../src/shared/auth/jwt';
import { NotFoundError, ValidationError } from '../../src/shared/errors/app-error';

describe('Email Verification and Resend Controls (Milestone 033)', () => {
  describe('Zod Validation Schemas', () => {
    it('successfully parses valid verifyEmail payload and normalizes email', () => {
      const payload = {
        email: '  Tanvir.Ahmed@Example.Com  ',
        code: '582914',
      };

      const parsed = verifyEmailSchema.parse(payload);
      expect(parsed.email).toBe('tanvir.ahmed@example.com');
      expect(parsed.code).toBe('582914');
    });

    it('rejects verifyEmail with non-6-digit code', () => {
      expect(() => verifyEmailSchema.parse({ email: 'tanvir@example.com', code: '12345' })).toThrow();
      expect(() => verifyEmailSchema.parse({ email: 'tanvir@example.com', code: '1234567' })).toThrow();
      expect(() => verifyEmailSchema.parse({ email: 'tanvir@example.com', code: '' })).toThrow();
    });

    it('rejects verifyEmail with non-numeric code characters', () => {
      expect(() => verifyEmailSchema.parse({ email: 'tanvir@example.com', code: '12345a' })).toThrow();
      expect(() => verifyEmailSchema.parse({ email: 'tanvir@example.com', code: 'ABCDEF' })).toThrow();
      expect(() => verifyEmailSchema.parse({ email: 'tanvir@example.com', code: '12 456' })).toThrow();
    });

    it('rejects verifyEmail with invalid email', () => {
      expect(() => verifyEmailSchema.parse({ email: 'not-an-email', code: '123456' })).toThrow();
    });

    it('successfully parses valid resendVerification payload and normalizes email', () => {
      const payload = {
        email: '  TANVIR@EXAMPLE.COM ',
      };

      const parsed = resendVerificationSchema.parse(payload);
      expect(parsed.email).toBe('tanvir@example.com');
    });

    it('rejects resendVerification with invalid email', () => {
      expect(() => resendVerificationSchema.parse({ email: 'invalid-email-address' })).toThrow();
      expect(() => resendVerificationSchema.parse({ email: '' })).toThrow();
    });
  });

  describe('EmailVerificationService Execution Flow', () => {
    let mockUsers: Map<string, any>;
    let mockOtps: Map<string, any>;
    let mockAuditLogs: any[];
    let mockOutboxEvents: any[];
    let mockPrisma: any;
    let mockUserRepo: any;
    let mockOtpRepo: any;
    let service: EmailVerificationService;

    beforeEach(() => {
      mockUsers = new Map();
      mockOtps = new Map();
      mockAuditLogs = [];
      mockOutboxEvents = [];

      // Mock User
      mockUsers.set('user_123', {
        id: 'usr_01j7x4b9e8m02k3f8d7c6b5a1',
        email: 'tanvir@example.com',
        name: 'Tanvir Ahmed',
        isEmailVerified: false,
      });

      // Mock Prisma Client Transaction
      mockPrisma = {
        $transaction: async (cb: (tx: any) => Promise<any>) => {
          const tx = {
            otpToken: {
              update: async ({ where, data }: any) => {
                const token = mockOtps.get(where.id);
                if (token) Object.assign(token, data);
                return token;
              },
              create: async ({ data }: any) => {
                mockOtps.set(data.id, { ...data, createdAt: new Date() });
                return data;
              },
            },
            user: {
              update: async ({ where, data }: any) => {
                const u = Array.from(mockUsers.values()).find((user) => user.id === where.id);
                if (u) Object.assign(u, data);
                return u;
              },
            },
            auditLog: {
              create: async ({ data }: any) => {
                mockAuditLogs.push(data);
                return data;
              },
            },
            outboxEvent: {
              create: async ({ data }: any) => {
                mockOutboxEvents.push(data);
                return data;
              },
            },
          };
          return cb(tx);
        },
      };

      // Mock UserRepository
      mockUserRepo = {
        findUserByEmail: async (email: string) => {
          return Array.from(mockUsers.values()).find((u) => u.email === email) || null;
        },
      };

      // Mock OtpRepository
      mockOtpRepo = {
        findActiveOtp: async (identifier: string, purpose: string) => {
          return (
            Array.from(mockOtps.values()).find(
              (o) =>
                o.identifier === identifier &&
                o.purpose === purpose &&
                !o.isUsed &&
                new Date(o.expiresAt).getTime() > Date.now()
            ) || null
          );
        },
        getLatestOtp: async (identifier: string, purpose: string) => {
          const matching = Array.from(mockOtps.values())
            .filter((o) => o.identifier === identifier && o.purpose === purpose)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          return matching[0] || null;
        },
        getRecentOtpCount: async (identifier: string, purpose: string, since: Date) => {
          return Array.from(mockOtps.values()).filter(
            (o) =>
              o.identifier === identifier &&
              o.purpose === purpose &&
              new Date(o.createdAt).getTime() >= since.getTime()
          ).length;
        },
        incrementAttempts: async (id: string) => {
          const token = mockOtps.get(id);
          if (token) {
            token.attempts += 1;
            return { attempts: token.attempts, maxAttempts: token.maxAttempts };
          }
          return { attempts: 1, maxAttempts: 3 };
        },
        markUsed: async (id: string) => {
          const token = mockOtps.get(id);
          if (token) token.isUsed = true;
          return token;
        },
        invalidateActiveOtps: async (identifier: string, purpose: string) => {
          let count = 0;
          for (const token of mockOtps.values()) {
            if (token.identifier === identifier && token.purpose === purpose && !token.isUsed) {
              token.isUsed = true;
              count++;
            }
          }
          return count;
        },
      };

      service = new EmailVerificationService(
        mockOtpRepo as unknown as OtpRepository,
        mockUserRepo as unknown as UserRepository,
        mockPrisma
      );
    });

    describe('verifyEmail()', () => {
      it('successfully verifies email with valid 6-digit OTP code', async () => {
        const rawCode = '742918';
        const tokenId = 'otp_01j7testtoken000000000001';
        mockOtps.set(tokenId, {
          id: tokenId,
          identifier: 'tanvir@example.com',
          purpose: EMAIL_VERIFICATION_CONSTANTS.PURPOSE,
          tokenHash: hashToken(rawCode),
          attempts: 0,
          maxAttempts: 3,
          isUsed: false,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          createdAt: new Date(),
        });

        const result = await service.verifyEmail('tanvir@example.com', rawCode);

        expect(result.verified).toBe(true);
        expect(result.email).toBe('tanvir@example.com');
        expect(result.userId).toBe('usr_01j7x4b9e8m02k3f8d7c6b5a1');

        // Verify user was updated to isEmailVerified = true
        const user = await mockUserRepo.findUserByEmail('tanvir@example.com');
        expect(user.isEmailVerified).toBe(true);

        // Verify OTP token was consumed (isUsed = true)
        const token = mockOtps.get(tokenId);
        expect(token.isUsed).toBe(true);

        // Verify audit log emitted
        expect(mockAuditLogs.some((log) => log.action === 'EMAIL_VERIFIED')).toBe(true);

        // Verify outbox event emitted
        expect(mockOutboxEvents.some((event) => event.eventType === 'auth.email_verified')).toBe(true);
      });

      it('returns idempotent success if user is already verified', async () => {
        const user = await mockUserRepo.findUserByEmail('tanvir@example.com');
        user.isEmailVerified = true;

        const result = await service.verifyEmail('tanvir@example.com', '123456');

        expect(result.verified).toBe(true);
        expect(result.alreadyVerified).toBe(true);
        expect(result.message).toContain('already verified');
      });

      it('throws NotFoundError if email does not exist', async () => {
        await expect(service.verifyEmail('nonexistent@example.com', '123456')).rejects.toThrow(
          NotFoundError
        );
      });

      it('throws ValidationError if no active OTP token is found or expired', async () => {
        await expect(service.verifyEmail('tanvir@example.com', '123456')).rejects.toThrow(
          ValidationError
        );
      });

      it('increments attempts on wrong code and reports remaining attempts', async () => {
        const tokenId = 'otp_01j7testtoken000000000002';
        mockOtps.set(tokenId, {
          id: tokenId,
          identifier: 'tanvir@example.com',
          purpose: EMAIL_VERIFICATION_CONSTANTS.PURPOSE,
          tokenHash: hashToken('999999'),
          attempts: 0,
          maxAttempts: 3,
          isUsed: false,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          createdAt: new Date(),
        });

        // 1st wrong attempt
        await expect(service.verifyEmail('tanvir@example.com', '111111')).rejects.toThrow(
          'Incorrect verification code. You have 2 attempt(s) remaining.'
        );
        expect(mockOtps.get(tokenId).attempts).toBe(1);

        // 2nd wrong attempt
        await expect(service.verifyEmail('tanvir@example.com', '222222')).rejects.toThrow(
          'Incorrect verification code. You have 1 attempt(s) remaining.'
        );
        expect(mockOtps.get(tokenId).attempts).toBe(2);

        // 3rd wrong attempt (lockout)
        await expect(service.verifyEmail('tanvir@example.com', '333333')).rejects.toThrow(
          'Incorrect verification code. Maximum attempts reached. Please request a new code.'
        );
        const token = mockOtps.get(tokenId);
        expect(token.attempts).toBe(3);
        expect(token.isUsed).toBe(true); // Token consumed/invalidated
      });

      it('rejects immediately if token attempts have already reached maximum', async () => {
        const tokenId = 'otp_01j7testtoken000000000003';
        mockOtps.set(tokenId, {
          id: tokenId,
          identifier: 'tanvir@example.com',
          purpose: EMAIL_VERIFICATION_CONSTANTS.PURPOSE,
          tokenHash: hashToken('999999'),
          attempts: 3,
          maxAttempts: 3,
          isUsed: false,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          createdAt: new Date(),
        });

        await expect(service.verifyEmail('tanvir@example.com', '999999')).rejects.toThrow(
          'Too many failed attempts. This code has been invalidated. Please request a new verification code.'
        );
        expect(mockOtps.get(tokenId).isUsed).toBe(true);
      });
    });

    describe('resendVerificationCode()', () => {
      it('returns neutral success response for non-existent email to prevent enumeration', async () => {
        const result = await service.resendVerificationCode('unknown@example.com');

        expect(result.success).toBe(true);
        expect(result.message).toBe(
          'If an account exists with this email, a verification code has been sent.'
        );
        expect(result.cooldownSeconds).toBe(60);
      });

      it('returns alreadyVerified status without generating new token if already verified', async () => {
        const user = await mockUserRepo.findUserByEmail('tanvir@example.com');
        user.isEmailVerified = true;

        const result = await service.resendVerificationCode('tanvir@example.com');

        expect(result.success).toBe(true);
        expect(result.alreadyVerified).toBe(true);
        expect(result.cooldownSeconds).toBe(0);
      });

      it('enforces strict 60-second cooldown from latest OTP request', async () => {
        // Create an OTP that was sent 30 seconds ago
        const recentTime = new Date(Date.now() - 30 * 1000);
        mockOtps.set('otp_recent_1', {
          id: 'otp_recent_1',
          identifier: 'tanvir@example.com',
          purpose: EMAIL_VERIFICATION_CONSTANTS.PURPOSE,
          tokenHash: 'hash1',
          attempts: 0,
          maxAttempts: 3,
          isUsed: false,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          createdAt: recentTime,
        });

        await expect(service.resendVerificationCode('tanvir@example.com')).rejects.toThrow(
          ValidationError
        );
      });

      it('enforces maximum 3 resend attempts per hour rate limit', async () => {
        // Create 3 OTP tokens created within the last 40 minutes (outside 60s cooldown)
        const now = Date.now();
        mockOtps.set('otp_old_1', {
          id: 'otp_old_1',
          identifier: 'tanvir@example.com',
          purpose: EMAIL_VERIFICATION_CONSTANTS.PURPOSE,
          tokenHash: 'hash1',
          attempts: 0,
          maxAttempts: 3,
          isUsed: true,
          expiresAt: new Date(now + 15 * 60 * 1000),
          createdAt: new Date(now - 45 * 60 * 1000),
        });
        mockOtps.set('otp_old_2', {
          id: 'otp_old_2',
          identifier: 'tanvir@example.com',
          purpose: EMAIL_VERIFICATION_CONSTANTS.PURPOSE,
          tokenHash: 'hash2',
          attempts: 0,
          maxAttempts: 3,
          isUsed: true,
          expiresAt: new Date(now + 15 * 60 * 1000),
          createdAt: new Date(now - 30 * 60 * 1000),
        });
        mockOtps.set('otp_old_3', {
          id: 'otp_old_3',
          identifier: 'tanvir@example.com',
          purpose: EMAIL_VERIFICATION_CONSTANTS.PURPOSE,
          tokenHash: 'hash3',
          attempts: 0,
          maxAttempts: 3,
          isUsed: true,
          expiresAt: new Date(now + 15 * 60 * 1000),
          createdAt: new Date(now - 5 * 60 * 1000), // 5 min ago (cooldown expired, but within 1 hr)
        });

        await expect(service.resendVerificationCode('tanvir@example.com')).rejects.toThrow(
          'Maximum resend limit reached for this hour (3 attempts). Please try again later or contact support.'
        );
      });

      it('successfully issues fresh 6-digit OTP code after cooldown and invalidates old ones', async () => {
        // Create an old active OTP created 2 minutes ago
        const oldTime = new Date(Date.now() - 120 * 1000);
        const oldOtpId = 'otp_previous_active';
        mockOtps.set(oldOtpId, {
          id: oldOtpId,
          identifier: 'tanvir@example.com',
          purpose: EMAIL_VERIFICATION_CONSTANTS.PURPOSE,
          tokenHash: 'old_hash',
          attempts: 0,
          maxAttempts: 3,
          isUsed: false,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          createdAt: oldTime,
        });

        const result = await service.resendVerificationCode('tanvir@example.com');

        expect(result.success).toBe(true);
        expect(result.cooldownSeconds).toBe(60);
        expect(result.message).toContain('A new 6-digit verification code has been sent');
        expect(result.devVerificationCode).toBeDefined();
        expect(result.devVerificationCode?.length).toBe(6);

        // Verify previous active token was invalidated
        expect(mockOtps.get(oldOtpId).isUsed).toBe(true);

        // Verify audit log emitted
        expect(mockAuditLogs.some((log) => log.action === 'VERIFICATION_CODE_RESENT')).toBe(true);

        // Verify outbox event emitted
        expect(
          mockOutboxEvents.some((event) => event.eventType === 'auth.verification_email_resend')
        ).toBe(true);
      });
    });
  });
});
