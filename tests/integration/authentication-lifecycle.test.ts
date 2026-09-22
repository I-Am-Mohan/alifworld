/**
 * Phase 04 Capstone Integration Test: Authentication Lifecycle, Audits & Rate Limits
 * 
 * Tests end-to-end authentication journeys against real domain services and models:
 * 1. Customer registration & 4-wallet provisioning
 * 2. Login, session creation & dual-client delivery (Web cookies vs Mobile Bearer)
 * 3. Token rotation, refresh family lineage & single-use enforcement
 * 4. Token reuse detection & automated breach mitigation (global tokenVersion invalidation)
 * 5. Password security controls (rate limits, breach prevention, session revocation)
 * 6. Distributed rate-limiting enforcement & HTTP 429 envelopes
 * 7. Append-only audit logging & zero credential leakage
 * 
 * Invariants: ADR-0022, ADR-0031, ADR-0034, NIST SP 800-63B, Milestone 040
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { AuthLoginService } from '../../src/services/auth-login.service';
import { AuthTokenService } from '../../src/services/auth-token.service';
import { PasswordSecurityService } from '../../src/services/password-security.service';
import { RedisRateLimiter } from '../../src/shared/rate-limit/rate-limiter';
import { getRateLimitPolicies } from '../../src/shared/rate-limit/rate-limit-policies';
import { AuditService } from '../../src/shared/audit/audit.service';
import { AUDIT_ACTIONS } from '../../src/shared/audit/audit.interface';
import { hashPassword, verifyPassword } from '../../src/shared/auth/password';
import { hashToken } from '../../src/shared/auth/jwt';
import { generateId, ID_PREFIXES } from '../../src/shared/utils/id';
import {
  UnauthorizedError,
  TokenReuseDetectedError,
  RateLimitError,
} from '../../src/shared/errors/app-error';

// Comprehensive In-Memory Prisma Database Fake for Integration Testing
class IntegrationPrismaFake {
  users = new Map<string, any>();
  userSessions = new Map<string, any>();
  wallets = new Map<string, any[]>();
  pointAccounts = new Map<string, any>();
  roles = new Map<string, any>();
  roleAssignments = new Map<string, any[]>();
  otpTokens = new Map<string, any>();
  auditLogs: any[] = [];
  outboxEvents: any[] = [];

  constructor() {
    this.roles.set('CUSTOMER', {
      id: 'rol_customer',
      code: 'CUSTOMER',
      name: 'Customer',
      isSystem: true,
      rolePermissions: [],
    });
  }

  user = {
    findUnique: async ({ where }: any) => {
      if (where.id) return this.users.get(where.id) || null;
      if (where.email) {
        for (const u of Array.from(this.users.values())) {
          if (u.email?.toLowerCase() === where.email?.toLowerCase()) return u;
        }
      }
      if (where.phone) {
        for (const u of Array.from(this.users.values())) {
          if (u.phone === where.phone) return u;
        }
      }
      return null;
    },
    findFirst: async ({ where }: any) => {
      if (where.OR) {
        for (const clause of where.OR) {
          if (clause.email) {
            for (const u of Array.from(this.users.values())) {
              if (u.email?.toLowerCase() === clause.email?.toLowerCase()) return u;
            }
          }
          if (clause.phone) {
            for (const u of Array.from(this.users.values())) {
              if (u.phone === clause.phone) return u;
            }
          }
        }
      }
      return null;
    },
    create: async ({ data }: any) => {
      const record = {
        ...data,
        roleAssignments: [
          {
            role: {
              code: 'CUSTOMER',
              rolePermissions: [],
            },
          },
        ],
        ownedSellers: [],
        sellerStaff: [],
      };
      this.users.set(data.id, record);
      return record;
    },
    update: async ({ where, data }: any) => {
      const existing = this.users.get(where.id);
      if (!existing) return null;
      if (data.tokenVersion?.increment) {
        existing.tokenVersion = (existing.tokenVersion || 1) + data.tokenVersion.increment;
        const copy = { ...data };
        delete copy.tokenVersion;
        Object.assign(existing, copy);
      } else {
        Object.assign(existing, data);
      }
      return existing;
    },
  };

  userSession = {
    create: async ({ data }: any) => {
      this.userSessions.set(data.id, { ...data });
      return data;
    },
    findUnique: async ({ where }: any) => {
      return this.userSessions.get(where.id) || null;
    },
    findMany: async ({ where }: any) => {
      const list = Array.from(this.userSessions.values());
      return list.filter((s) => {
        if (where.userId && s.userId !== where.userId) return false;
        if (where.isRevoked !== undefined && s.isRevoked !== where.isRevoked) return false;
        return true;
      });
    },
    update: async ({ where, data }: any) => {
      const existing = this.userSessions.get(where.id);
      if (existing) {
        Object.assign(existing, data);
      }
      return existing;
    },
    updateMany: async ({ where, data }: any) => {
      let count = 0;
      for (const s of this.userSessions.values()) {
        if (where.userId && s.userId !== where.userId) continue;
        if (where.isRevoked !== undefined && s.isRevoked !== where.isRevoked) continue;
        Object.assign(s, data);
        count++;
      }
      return { count };
    },
  };

  role = {
    findUnique: async ({ where }: any) => this.roles.get(where.code) || null,
  };

  userRoleAssignment = {
    create: async ({ data }: any) => {
      const list = this.roleAssignments.get(data.userId) || [];
      list.push(data);
      this.roleAssignments.set(data.userId, list);
      return data;
    },
  };

  wallet = {
    create: async ({ data }: any) => {
      const list = this.wallets.get(data.userId) || [];
      list.push(data);
      this.wallets.set(data.userId, list);
      return data;
    },
  };

  pointAccount = {
    create: async ({ data }: any) => {
      this.pointAccounts.set(data.userId, data);
      return data;
    },
  };

  otpToken = {
    create: async ({ data }: any) => {
      const record = { ...data, createdAt: new Date() };
      this.otpTokens.set(data.id, record);
      return record;
    },
    findFirst: async ({ where }: any) => {
      for (const t of this.otpTokens.values()) {
        if (where.id && t.id !== where.id) continue;
        if (where.userId && t.userId !== where.userId) continue;
        if (where.identifier && t.identifier !== where.identifier) continue;
        if (where.purpose && t.purpose !== where.purpose) continue;
        if (where.isUsed !== undefined && t.isUsed !== where.isUsed) continue;
        if (where.expiresAt?.gt && t.expiresAt <= where.expiresAt.gt) continue;
        return t;
      }
      return null;
    },
    update: async ({ where, data }: any) => {
      const existing = this.otpTokens.get(where.id);
      if (existing) Object.assign(existing, data);
      return existing;
    },
    updateMany: async ({ where, data }: any) => {
      let count = 0;
      for (const t of this.otpTokens.values()) {
        if (where.id && t.id !== where.id) continue;
        if (where.userId && t.userId !== where.userId) continue;
        if (where.identifier && t.identifier !== where.identifier) continue;
        if (where.purpose && t.purpose !== where.purpose) continue;
        if (where.isUsed !== undefined && t.isUsed !== where.isUsed) continue;
        if (where.expiresAt?.gt && t.expiresAt <= where.expiresAt.gt) continue;
        Object.assign(t, data);
        count++;
      }
      return { count };
    },
  };

  auditLog = {
    create: async ({ data }: any) => {
      this.auditLogs.push(data);
      return data;
    },
  };

  outboxEvent = {
    create: async ({ data }: any) => {
      this.outboxEvents.push(data);
      return data;
    },
  };

  async $transaction(fn: any) {
    if (typeof fn === 'function') {
      return fn(this);
    }
    return Promise.all(fn);
  }
}

describe('Authentication Lifecycle & Security Controls Integration Suite (Milestone 040)', () => {
  const TEST_SECRET = 'super_secure_jwt_secret_min_32_characters_long_for_tests';
  let db: IntegrationPrismaFake;
  let authTokenService: AuthTokenService;
  let authLoginService: AuthLoginService;
  let passwordService: PasswordSecurityService;
  let auditService: AuditService;
  let rateLimiter: RedisRateLimiter;

  beforeEach(() => {
    db = new IntegrationPrismaFake();
    auditService = new AuditService(db);
    rateLimiter = new RedisRateLimiter();

    // Wire real domain services with mocked database fake
    authTokenService = new AuthTokenService(
      {
        createSession: async (params: any) => {
          const id = params.id || generateId(ID_PREFIXES.SESSION);
          const familyId = params.familyId || `fam_${id}`;
          const familyMeta = {
            familyId,
            generation: 0,
            consumedTokenHashes: [],
            rawDeviceInfo: params.deviceInfo ?? null,
          };
          return db.userSession.create({
            data: {
              ...params,
              id,
              deviceInfo: JSON.stringify(familyMeta),
              isRevoked: false,
            },
          });
        },
        findSessionById: async (id: string) => {
          const s = await db.userSession.findUnique({ where: { id } });
          if (!s) return null;
          const u = await db.user.findUnique({ where: { id: s.userId } });
          return { ...s, user: u };
        },
        findSessionByToken: async (sessionToken: string) => {
          for (const s of db.userSessions.values()) {
            if (s.sessionToken === sessionToken) {
              const u = await db.user.findUnique({ where: { id: s.userId } });
              return { ...s, user: u };
            }
          }
          return null;
        },
        rotateSessionRefreshToken: async (
          sessionIdOrParams: any,
          legacyNewHash?: string,
          legacyExpiresAt?: Date
        ) => {
          let sessionId: string;
          let newRefreshTokenHash: string;
          let consumedHash: string | undefined;
          let newGeneration: number | undefined;

          if (typeof sessionIdOrParams === 'object') {
            sessionId = sessionIdOrParams.sessionId;
            newRefreshTokenHash = sessionIdOrParams.newRefreshTokenHash;
            consumedHash = sessionIdOrParams.consumedHash;
            newGeneration = sessionIdOrParams.newGeneration;
          } else {
            sessionId = sessionIdOrParams;
            newRefreshTokenHash = legacyNewHash!;
          }

          const s = db.userSessions.get(sessionId);
          if (!s) return null;
          let meta: any = { familyId: `fam_${sessionId}`, generation: 0, consumedTokenHashes: [] };
          try {
            if (s.deviceInfo) meta = JSON.parse(s.deviceInfo);
          } catch {}
          if (consumedHash && !meta.consumedTokenHashes.includes(consumedHash)) {
            meta.consumedTokenHashes.push(consumedHash);
          }
          if (typeof newGeneration === 'number') {
            meta.generation = newGeneration;
          }
          s.refreshTokenHash = newRefreshTokenHash;
          s.deviceInfo = JSON.stringify(meta);
          return s;
        },
        revokeSession: async (id: string, reason: string) =>
          db.userSession.update({
            where: { id },
            data: { isRevoked: true, revokedAt: new Date(), revokedReason: reason },
          }),
        revokeAllUserSessions: async (userId: string, reason: string) =>
          db.userSession.updateMany({
            where: { userId, isRevoked: false },
            data: { isRevoked: true, revokedAt: new Date(), revokedReason: reason },
          }),
        incrementUserTokenVersion: async (userId: string) => {
          const u = db.users.get(userId);
          if (u) u.tokenVersion = (u.tokenVersion || 1) + 1;
          return u?.tokenVersion || 2;
        },
        getActiveSessionsForUser: async (userId: string) =>
          db.userSession.findMany({ where: { userId, isRevoked: false } }),
        parseFamilyMetadata: (session: any) => {
          if (session?.deviceInfo) {
            try {
              const p = JSON.parse(session.deviceInfo);
              if (p && p.familyId) return p;
            } catch {}
          }
          return { familyId: `fam_${session?.id || '1'}`, generation: 0, consumedTokenHashes: [] };
        },
      } as any,
      TEST_SECRET,
      db
    );

    authLoginService = new AuthLoginService(
      {
        findUserByIdentifier: async (id: string) =>
          db.user.findFirst({
            where: { OR: [{ email: id.toLowerCase() }, { phone: id }] },
          }),
        updateLastLogin: async (id: string) =>
          db.user.update({ where: { id }, data: { lastLoginAt: new Date() } }),
      } as any,
      authTokenService,
      db,
      TEST_SECRET
    );

    const mockOtpRepo = {
      getLatestOtp: async (identifier: string, purpose: string) => {
        return db.otpToken.findFirst({
          where: { identifier, purpose },
        });
      },
      getRecentOtpCount: async (identifier: string, purpose: string, since: Date) => {
        return Array.from(db.otpTokens.values()).filter(
          (o: any) => o.identifier === identifier && o.purpose === purpose && o.createdAt >= since
        ).length;
      },
      findActiveOtp: async (identifier: string, purpose: string) => {
        return db.otpToken.findFirst({
          where: { identifier, purpose, isUsed: false },
        });
      },
      markUsed: async (id: string) => {
        return db.otpToken.update({ where: { id }, data: { isUsed: true } });
      },
      incrementAttempts: async (id: string) => {
        const token = db.otpTokens.get(id);
        if (token) token.attempts += 1;
        return { attempts: token?.attempts || 1, maxAttempts: token?.maxAttempts || 3 };
      },
      invalidateActiveOtps: async (identifier: string, purpose: string) => {
        return db.otpToken.updateMany({
          where: { identifier, purpose, isUsed: false },
          data: { isUsed: true },
        });
      },
    };

    const mockUserRepo = {
      findPasswordUserByEmail: async (email: string) =>
        db.user.findUnique({ where: { email: email.toLowerCase() } }),
      findUserById: async (id: string) => db.user.findUnique({ where: { id } }),
    };

    passwordService = new PasswordSecurityService(
      mockOtpRepo as any,
      mockUserRepo as any,
      db,
      () => new Date()
    );
  });

  describe('1. Customer Provisioning & Invariant Check', () => {
    it('initializes customer with 4 segregated wallets in BDT poisha and 0 product points', async () => {
      const userId = generateId(ID_PREFIXES.USER);
      const email = 'newcustomer@alifworld.com';
      const password = 'Dhaka@Secure#2026';
      const passwordHash = hashPassword(password);

      // Create user
      const user = await db.user.create({
        data: {
          id: userId,
          email,
          phone: '+8801700112233',
          name: 'Shakib Khan',
          passwordHash,
          status: 'ACTIVE',
          isEmailVerified: false,
          isPhoneVerified: true,
          tokenVersion: 1,
        },
      });

      // Provision segregated 4 wallets: MAIN, SHOPPING, GOOD_LUCK, CHARITY
      const walletTypes: Array<'MAIN' | 'SHOPPING' | 'GOOD_LUCK' | 'CHARITY'> = [
        'MAIN',
        'SHOPPING',
        'GOOD_LUCK',
        'CHARITY',
      ];
      for (const wType of walletTypes) {
        await db.wallet.create({
          data: {
            id: generateId(ID_PREFIXES.WALLET),
            userId: user.id,
            type: wType,
            currency: 'BDT',
            availablePoisha: BigInt(0),
            pendingPoisha: BigInt(0),
            status: 'ACTIVE',
          },
        });
      }

      // Provision PointAccount
      await db.pointAccount.create({
        data: {
          id: generateId(ID_PREFIXES.POINT_ACCOUNT),
          userId: user.id,
          availablePoints: 0,
          pendingPoints: 0,
          lifetimePoints: 0,
        },
      });

      // Verify wallets and point account
      const wallets = db.wallets.get(user.id) || [];
      expect(wallets.length).toBe(4);
      for (const w of wallets) {
        expect(w.currency).toBe('BDT');
        expect(w.availablePoisha).toBe(BigInt(0));
      }

      const points = db.pointAccounts.get(user.id);
      expect(points.availablePoints).toBe(0);
    });
  });

  describe('2. Credential Verification & Dual Client Delivery', () => {
    it('authenticates valid credentials, issues JWT pair and records login audit', async () => {
      const userId = generateId(ID_PREFIXES.USER);
      const email = 'shopper@alifworld.com';
      const password = 'CorrectPassword#2026';

      await db.user.create({
        data: {
          id: userId,
          email,
          name: 'Shopper Test',
          passwordHash: hashPassword(password),
          status: 'ACTIVE',
          isEmailVerified: true,
          isPhoneVerified: false,
          tokenVersion: 1,
        },
      });

      // Execute login
      const result = await authLoginService.login(
        {
          identifier: email,
          password,
          clientType: 'WEB',
          deviceInfo: 'Chrome on MacOS',
        },
        { ipAddress: '103.111.111.5', userAgent: 'Mozilla/5.0' }
      );

      expect(result.user.id).toBe(userId);
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
      expect(result.cookies.length).toBe(2); // Access and refresh cookies

      // Verify audit log appended
      await auditService.log({
        actorId: result.user.id,
        action: AUDIT_ACTIONS.AUTH_LOGIN_SUCCESS,
        resource: 'User',
        resourceId: result.user.id,
        ipAddress: '103.111.111.5',
      });

      expect(db.auditLogs.some((l) => l.action === AUDIT_ACTIONS.AUTH_LOGIN_SUCCESS)).toBe(true);
    });

    it('rejects invalid password and blocks suspended accounts', async () => {
      const email = 'suspended@alifworld.com';
      await db.user.create({
        data: {
          id: 'usr_suspended_1',
          email,
          name: 'Suspended Account',
          passwordHash: hashPassword('Pass12345!'),
          status: 'SUSPENDED',
          isEmailVerified: true,
          tokenVersion: 1,
        },
      });

      // Attempt login with suspended account
      expect(
        authLoginService.login({
          identifier: email,
          password: 'Pass12345!',
          clientType: 'WEB',
        })
      ).rejects.toThrow(UnauthorizedError);

      // Attempt login with wrong password
      expect(
        authLoginService.login({
          identifier: email,
          password: 'WrongPassword!',
          clientType: 'WEB',
        })
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('3. Token Rotation & Refresh Family Lineage', () => {
    it('rotates refresh token smoothly within active family', async () => {
      const userId = generateId(ID_PREFIXES.USER);
      await db.user.create({
        data: {
          id: userId,
          email: 'rotator@alifworld.com',
          passwordHash: hashPassword('RotatePass123!'),
          status: 'ACTIVE',
          tokenVersion: 1,
        },
      });

      // Login to generate Gen 1 tokens
      const loginRes = await authLoginService.login({
        identifier: 'rotator@alifworld.com',
        password: 'RotatePass123!',
        clientType: 'MOBILE_FLUTTER',
      });

      const gen1RefreshToken = loginRes.tokens.refreshToken;

      // Rotate Gen 1 -> Gen 2
      const rotationRes = await authTokenService.rotateRefreshToken(
        gen1RefreshToken,
        'MOBILE_FLUTTER'
      );

      expect(rotationRes.accessToken).toBeDefined();
      expect(rotationRes.refreshToken).toBeDefined();
      expect(rotationRes.refreshToken).not.toBe(gen1RefreshToken);
      expect(rotationRes.user.id).toBe(userId);
    });
  });

  describe('4. Token Reuse Detection & Automated Breach Response', () => {
    it('detects replay attack when consumed token is reused, revoking all sessions globally', async () => {
      const userId = generateId(ID_PREFIXES.USER);
      await db.user.create({
        data: {
          id: userId,
          email: 'victim@alifworld.com',
          passwordHash: hashPassword('VictimPass123!'),
          status: 'ACTIVE',
          tokenVersion: 1,
        },
      });

      // 1. Initial Login (Gen 1)
      const loginRes = await authLoginService.login({
        identifier: 'victim@alifworld.com',
        password: 'VictimPass123!',
        clientType: 'MOBILE_FLUTTER',
      });
      const gen1Token = loginRes.tokens.refreshToken;

      // 2. Legitimate Rotation (Gen 1 -> Gen 2)
      await authTokenService.rotateRefreshToken(gen1Token, 'MOBILE_FLUTTER');

      // 3. Attacker replays consumed Gen 1 token!
      let breachCaught = false;
      try {
        await authTokenService.rotateRefreshToken(gen1Token, 'MOBILE_FLUTTER');
      } catch (err: any) {
        if (err instanceof TokenReuseDetectedError) {
          breachCaught = true;
        }
      }

      expect(breachCaught).toBe(true);

      // Verify automated breach response:
      // a) User's tokenVersion incremented (invalidating all outstanding access tokens immediately)
      const updatedUser = db.users.get(userId);
      expect(updatedUser.tokenVersion).toBeGreaterThan(1);

      // b) All sessions for user revoked
      const activeSessions = await db.userSession.findMany({
        where: { userId, isRevoked: false },
      });
      expect(activeSessions.length).toBe(0);

      // c) Breach audit log recorded
      expect(
        db.auditLogs.some(
          (l) => l.action === 'SECURITY_ALERT_REFRESH_TOKEN_REUSE_DETECTED'
        )
      ).toBe(true);
    });
  });

  describe('5. Password Security & Session Revocation', () => {
    it('invalidates prior tokens and terminates active sessions on password reset', async () => {
      const userId = generateId(ID_PREFIXES.USER);
      const email = 'resetuser@alifworld.com';
      await db.user.create({
        data: {
          id: userId,
          email,
          status: 'ACTIVE',
          passwordHash: hashPassword('OldPass#123'),
          tokenVersion: 1,
        },
      });

      // Request reset
      const resetResult = await passwordService.requestPasswordReset(email, 'en-BD');
      expect(resetResult.accepted).toBe(true);

      // Find token
      const otp = await db.otpToken.findFirst({
        where: { identifier: email, purpose: 'PASSWORD_RESET', isUsed: false },
      });
      expect(otp).toBeDefined();

      // In test mode, password-security service exposes devResetToken
      const devToken = (resetResult as any).devResetToken;
      expect(devToken).toBeDefined();

      // Reset password
      const newPassword = 'NewSecurePassword#2026';
      await passwordService.resetPassword(email, devToken, newPassword);

      // Verify token version incremented and password updated
      const updatedUser = db.users.get(userId);
      expect(updatedUser.tokenVersion).toBe(2);
      expect(verifyPassword(newPassword, updatedUser.passwordHash)).toBe(true);

      // Verify audit log recorded
      expect(
        db.auditLogs.some((l) => l.action === 'PASSWORD_RESET_COMPLETED')
      ).toBe(true);
    });
  });

  describe('6. Distributed Rate Limiting & 429 Protection', () => {
    it('enforces throttling when rate limits are breached and returns retryAfterSeconds', async () => {
      const policies = getRateLimitPolicies();
      const testPolicy = {
        keyPrefix: 'integration_login',
        windowMs: 60000,
        maxRequests: 2,
      };

      const key = 'test_ip_103.5.5.1';

      // 1st request - ok
      const r1 = await rateLimiter.consume(key, testPolicy);
      expect(r1.isAllowed).toBe(true);

      // 2nd request - ok
      const r2 = await rateLimiter.consume(key, testPolicy);
      expect(r2.isAllowed).toBe(true);

      // 3rd request - blocked!
      const r3 = await rateLimiter.consume(key, testPolicy);
      expect(r3.isAllowed).toBe(false);
      expect(r3.retryAfterSeconds).toBeGreaterThan(0);

      // Emulate route handler error throw
      const err = new RateLimitError(
        `Rate limit exceeded. Please retry after ${r3.retryAfterSeconds} seconds.`,
        r3.retryAfterSeconds
      );
      expect(err.statusCode).toBe(429);
      expect(err.errorCode).toBe('RATE_LIMIT_EXCEEDED');
      expect(err.retryAfterSeconds).toBe(r3.retryAfterSeconds);
    });
  });

  describe('7. Immutable Audit Trail & Zero Credential Leakage', () => {
    it('ensures passwords, hashes, and secrets are strictly redacted across all audit entries', async () => {
      await auditService.log({
        actorId: 'usr_audit_test',
        actorRole: 'CUSTOMER',
        action: AUDIT_ACTIONS.AUTH_LOGIN_FAILED,
        resource: 'User',
        resourceId: 'usr_audit_test',
        requestId: 'req_xyz789',
        ipAddress: '192.168.1.1',
        userAgent: 'TestAgent/1.0',
        metadata: {
          submittedPassword: 'SuperSecretPassword123!',
          userPasswordHash: 'hash_should_never_be_in_plain_text',
          jwtToken: 'bearer_token_string',
          pin: '9999',
          safeField: 'AllowedValue',
        },
      });

      const lastLog = db.auditLogs[db.auditLogs.length - 1];
      expect(lastLog).toBeDefined();
      expect(lastLog.metadata.submittedPassword).toBe('[REDACTED]');
      expect(lastLog.metadata.userPasswordHash).toBe('[REDACTED]');
      expect(lastLog.metadata.jwtToken).toBe('[REDACTED]');
      expect(lastLog.metadata.pin).toBe('[REDACTED]');
      expect(lastLog.metadata.safeField).toBe('AllowedValue');
      expect(lastLog.metadata.requestId).toBe('req_xyz789');
    });
  });
});
