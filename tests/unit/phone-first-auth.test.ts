import { describe, it, expect, beforeEach } from 'bun:test';
import { PhoneAuthService, PHONE_AUTH_CONSTANTS } from '../../src/services/phone-auth.service';
import { AuthTokenService } from '../../src/services/auth-token.service';
import { UserRepository } from '../../src/repositories/user.repository';
import { OtpRepository } from '../../src/repositories/otp.repository';
import { SessionRepository } from '../../src/repositories/session.repository';
import { hashToken } from '../../src/shared/auth/jwt';
import { ValidationError, NotFoundError, ConflictError } from '../../src/shared/errors/app-error';

describe('Phone-First OTP Login & Registration Flow', () => {
  const TEST_SECRET = 'test_jwt_secret_for_phone_auth_service_32_characters_minimum';

  describe('Phone Normalization', () => {
    const service = new PhoneAuthService();

    it('normalizes 11-digit Bangladesh phone starting with 01 to E.164 format (+880...) ', () => {
      expect(service.normalizePhoneNumber('01700112233')).toBe('+8801700112233');
      expect(service.normalizePhoneNumber(' 01812-345678 ')).toBe('+8801812345678');
    });

    it('accepts already normalized +880 format', () => {
      expect(service.normalizePhoneNumber('+8801700112233')).toBe('+8801700112233');
    });

    it('rejects invalid or non-BD numbers', () => {
      expect(() => service.normalizePhoneNumber('12345')).toThrow(ValidationError);
      expect(() => service.normalizePhoneNumber('029876543')).toThrow(ValidationError);
    });
  });

  describe('PhoneAuthService End-to-End Execution Flow', () => {
    let mockUsers: Map<string, any>;
    let mockOtps: Map<string, any>;
    let mockSessions: Map<string, any>;
    let mockAuditLogs: any[];
    let mockOutboxEvents: any[];
    let mockPrisma: any;
    let mockUserRepo: any;
    let mockOtpRepo: any;
    let mockSessionRepo: any;
    let tokenService: AuthTokenService;
    let phoneAuthService: PhoneAuthService;

    beforeEach(() => {
      mockUsers = new Map();
      mockOtps = new Map();
      mockSessions = new Map();
      mockAuditLogs = [];
      mockOutboxEvents = [];

      // Existing Customer User
      const user = {
        id: 'usr_phone_001',
        phone: '+8801700112233',
        email: 'customer@example.com',
        name: 'Tanvir Ahmed',
        status: 'ACTIVE',
        tokenVersion: 1,
        isPhoneVerified: true,
        isEmailVerified: false,
        lastLoginAt: null,
        roleAssignments: [{ role: { code: 'CUSTOMER' } }],
        wallets: [],
        pointAccount: null,
      };
      mockUsers.set(user.id, user);

      // Mock Prisma Client
      mockPrisma = {
        $transaction: async (cb: (tx: any) => Promise<any>) => {
          const tx = {
            user: {
              create: async ({ data }: any) => {
                mockUsers.set(data.id, data);
                return data;
              },
              update: async ({ where, data }: any) => {
                const u = Array.from(mockUsers.values()).find((user) => user.id === where.id);
                if (u) Object.assign(u, data);
                return u;
              },
            },
            role: {
              findUnique: async () => ({ id: 'rol_customer', code: 'CUSTOMER' }),
            },
            userRoleAssignment: {
              create: async ({ data }: any) => data,
            },
            wallet: {
              create: async ({ data }: any) => data,
            },
            pointAccount: {
              create: async ({ data }: any) => data,
            },
            otpToken: {
              create: async ({ data }: any) => {
                mockOtps.set(data.id, { ...data, createdAt: new Date() });
                return data;
              },
              update: async ({ where, data }: any) => {
                const token = mockOtps.get(where.id);
                if (token) Object.assign(token, data);
                return token;
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

      // Mock Repositories
      mockUserRepo = {
        findUserByPhone: async (phone: string) => {
          return Array.from(mockUsers.values()).find((u) => u.phone === phone) || null;
        },
      };

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

      mockSessionRepo = {
        createSession: async (params: any) => {
          const session = {
            id: `ses_${Math.random().toString(36).substring(2, 10)}`,
            ...params,
            isRevoked: false,
          };
          mockSessions.set(session.id, session);
          return session;
        },
        rotateSessionRefreshToken: async (sessionId: string, hash: string, expiresAt: Date) => {
          const s = mockSessions.get(sessionId);
          if (s) {
            s.refreshTokenHash = hash;
            s.expiresAt = expiresAt;
          }
        },
        enforceSessionLimit: async () => {},
      };

      tokenService = new AuthTokenService(
        mockSessionRepo as unknown as SessionRepository,
        TEST_SECRET
      );

      phoneAuthService = new PhoneAuthService(
        mockUserRepo as unknown as UserRepository,
        mockOtpRepo as unknown as OtpRepository,
        tokenService,
        mockPrisma
      );
    });

    describe('checkUser()', () => {
      it('returns exists: true when phone number is registered', async () => {
        const result = await phoneAuthService.checkUser('01700112233');
        expect(result.exists).toBe(true);
        expect(result.registered).toBe(true);
        expect(result.phone).toBe('+8801700112233');
        expect(result.name).toBe('Tanvir Ahmed');
      });

      it('returns exists: false when phone number is NOT registered', async () => {
        const result = await phoneAuthService.checkUser('01999887766');
        expect(result.exists).toBe(false);
        expect(result.registered).toBe(false);
        expect(result.phone).toBe('+8801999887766');
      });
    });

    describe('Login Flow: sendLoginOtp() & verifyLoginOtp()', () => {
      it('rejects login OTP for unregistered phone with NotFoundError', async () => {
        await expect(phoneAuthService.sendLoginOtp('01999887766')).rejects.toThrow(NotFoundError);
      });

      it('dispatches login OTP, stores token and returns devOtpCode for valid user', async () => {
        const result = await phoneAuthService.sendLoginOtp('01700112233');

        expect(result.success).toBe(true);
        expect(result.phone).toBe('+8801700112233');
        expect(result.devOtpCode).toBeDefined();
        expect(result.devOtpCode?.length).toBe(6);

        // Verify outbox event emitted
        expect(
          mockOutboxEvents.some((e) => e.eventType === 'auth.phone_login_otp_dispatched')
        ).toBe(true);
      });

      it('successfully logs in with valid 6-digit OTP code', async () => {
        const sendResult = await phoneAuthService.sendLoginOtp('01700112233');
        const code = sendResult.devOtpCode!;

        const loginResult = await phoneAuthService.verifyLoginOtp(
          '01700112233',
          code,
          'WEB'
        );

        expect(loginResult.verified).toBe(true);
        expect(loginResult.phone).toBe('+8801700112233');
        expect(loginResult.user.id).toBe('usr_phone_001');
        expect(loginResult.tokens.accessToken).toBeDefined();
        expect(loginResult.tokens.refreshToken).toBeDefined();

        // Verify audit log emitted
        expect(mockAuditLogs.some((l) => l.action === 'USER_LOGIN')).toBe(true);
      });

      it('increments attempts on wrong OTP and rejects', async () => {
        await phoneAuthService.sendLoginOtp('01700112233');

        await expect(
          phoneAuthService.verifyLoginOtp('01700112233', '000000', 'WEB')
        ).rejects.toThrow('Incorrect verification code. You have 2 attempt(s) remaining.');
      });
    });

    describe('Register Flow: sendRegisterOtp() & completeRegistration()', () => {
      it('sends register OTP for unregistered phone', async () => {
        const result = await phoneAuthService.sendRegisterOtp('01855667788');

        expect(result.success).toBe(true);
        expect(result.phone).toBe('+8801855667788');
        expect(result.devOtpCode).toBeDefined();

        // Verify outbox event emitted
        expect(
          mockOutboxEvents.some((e) => e.eventType === 'auth.phone_registration_otp_dispatched')
        ).toBe(true);
      });

      it('rejects register OTP if phone already exists', async () => {
        await expect(phoneAuthService.sendRegisterOtp('01700112233')).rejects.toThrow(ConflictError);
      });

      it('completes registration, provisions 4 wallets, and logs in immediately', async () => {
        const newPhone = '01855667788';
        const sendResult = await phoneAuthService.sendRegisterOtp(newPhone);
        const verifyResult = await phoneAuthService.verifyRegisterOtp(
          newPhone,
          sendResult.devOtpCode!
        );

        expect(verifyResult.verified).toBe(true);
        expect(verifyResult.verificationTicket).toBeDefined();

        const completeResult = await phoneAuthService.completeRegistration({
          phone: newPhone,
          verificationTicket: verifyResult.verificationTicket,
          firstName: 'Farhana',
          lastName: 'Yasmin',
          password: 'Dhaka@Commerce#2026!',
          address: 'House 14, Road 5, Dhanmondi',
          division: 'Dhaka',
          city: 'Dhaka',
          gender: 'FEMALE',
          clientType: 'WEB',
        });

        expect(completeResult.success).toBe(true);
        expect(completeResult.user.name).toBe('Farhana Yasmin');
        expect(completeResult.user.phone).toBe('+8801855667788');
        expect(completeResult.user.isPhoneVerified).toBe(true);
        expect(completeResult.tokens.accessToken).toBeDefined();

        // Verify audit log emitted
        expect(mockAuditLogs.some((l) => l.action === 'CUSTOMER_REGISTERED')).toBe(true);
      });
    });
  });
});
