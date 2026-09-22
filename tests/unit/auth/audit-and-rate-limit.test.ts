import { describe, it, expect, beforeEach } from 'bun:test';
import { redactSensitiveData, isSensitiveKey } from '../../../src/shared/audit/redactor';
import { computeAuditDiff } from '../../../src/shared/audit/audit-diff';
import { AuditService } from '../../../src/shared/audit/audit.service';
import { AUDIT_ACTIONS } from '../../../src/shared/audit/audit.interface';
import { RedisRateLimiter } from '../../../src/shared/rate-limit/rate-limiter';
import { getRateLimitPolicies } from '../../../src/shared/rate-limit/rate-limit-policies';
import { RateLimitError } from '../../../src/shared/errors/app-error';

// Mock in-memory Prisma client for AuditService testing
class MockPrismaAudit {
  auditLogs: any[] = [];

  auditLog = {
    create: async ({ data }: any) => {
      this.auditLogs.push(data);
      return data;
    },
  };
}

describe('Authentication Audits & Rate Limiting (Milestone 040)', () => {
  describe('Sensitive Data Redactor', () => {
    it('identifies sensitive key names correctly', () => {
      expect(isSensitiveKey('password')).toBe(true);
      expect(isSensitiveKey('passwordHash')).toBe(true);
      expect(isSensitiveKey('accessToken')).toBe(true);
      expect(isSensitiveKey('refreshToken')).toBe(true);
      expect(isSensitiveKey('secretKey')).toBe(true);
      expect(isSensitiveKey('otpCode')).toBe(true);
      expect(isSensitiveKey('authorization')).toBe(true);
      expect(isSensitiveKey('cardNumber')).toBe(true);
      expect(isSensitiveKey('cvv')).toBe(true);

      expect(isSensitiveKey('email')).toBe(false);
      expect(isSensitiveKey('userId')).toBe(false);
      expect(isSensitiveKey('status')).toBe(false);
      expect(isSensitiveKey('role')).toBe(false);
    });

    it('redacts sensitive credentials while preserving safe attributes', () => {
      const payload = {
        userId: 'usr_123',
        email: 'customer@alifworld.com',
        role: 'CUSTOMER',
        password: 'PlainTextPassword123!',
        passwordHash: 'pbkdf2$50000$salt$hash',
        token: 'eyJh...jwtToken',
        nested: {
          clientType: 'WEB',
          refreshToken: 'refresh_token_secret',
          safeField: 100,
          inner: {
            otp: '123456',
            phone: '+8801700112233',
          },
        },
      };

      const redacted = redactSensitiveData(payload);

      expect(redacted.userId).toBe('usr_123');
      expect(redacted.email).toBe('customer@alifworld.com');
      expect(redacted.role).toBe('CUSTOMER');
      expect(redacted.password).toBe('[REDACTED]');
      expect(redacted.passwordHash).toBe('[REDACTED]');
      expect(redacted.token).toBe('[REDACTED]');
      expect(redacted.nested.clientType).toBe('WEB');
      expect(redacted.nested.refreshToken).toBe('[REDACTED]');
      expect(redacted.nested.safeField).toBe(100);
      expect(redacted.nested.inner.otp).toBe('[REDACTED]');
      expect(redacted.nested.inner.phone).toBe('+8801700112233');
    });

    it('handles arrays and null/undefined values safely', () => {
      const list = [
        { id: 1, secret: 'top_secret' },
        { id: 2, secret: 'another_secret' },
      ];

      const redacted = redactSensitiveData(list);
      expect(redacted[0].id).toBe(1);
      expect(redacted[0].secret).toBe('[REDACTED]');
      expect(redacted[1].id).toBe(2);
      expect(redacted[1].secret).toBe('[REDACTED]');

      expect(redactSensitiveData(null)).toBeNull();
      expect(redactSensitiveData(undefined)).toBeUndefined();
    });

    it('prevents circular reference stack overflows', () => {
      const circularObj: any = { name: 'safe' };
      circularObj.self = circularObj;

      const result = redactSensitiveData(circularObj);
      expect(result.name).toBe('safe');
      expect(result.self).toBe('[CIRCULAR]');
    });
  });

  describe('Audit State Diff Calculation', () => {
    it('computes sanitized state diffs correctly', () => {
      const beforeState = {
        name: 'Old Name',
        email: 'user@example.com',
        passwordHash: 'old_hash_123',
        status: 'ACTIVE',
      };

      const afterState = {
        name: 'New Name',
        email: 'user@example.com',
        passwordHash: 'new_hash_456',
        status: 'SUSPENDED',
      };

      const diff = computeAuditDiff(beforeState, afterState);
      expect(diff).toBeDefined();
      expect(diff?.name).toEqual({ from: 'Old Name', to: 'New Name' });
      expect(diff?.status).toEqual({ from: 'ACTIVE', to: 'SUSPENDED' });
      // Email unchanged, should not appear in diff
      expect(diff?.email).toBeUndefined();
      // Sensitive hash should be redacted on both sides
      expect(diff?.passwordHash).toEqual({ from: '[REDACTED]', to: '[REDACTED]' });
    });

    it('returns null when there are no state changes', () => {
      const state = { role: 'CUSTOMER', status: 'ACTIVE' };
      expect(computeAuditDiff(state, state)).toBeNull();
    });
  });

  describe('AuditService Persistence', () => {
    it('appends an immutable sanitized audit record to database', async () => {
      const mockPrisma = new MockPrismaAudit();
      const audit = new AuditService(mockPrisma);

      await audit.log({
        actorId: 'usr_actor_99',
        actorRole: 'CUSTOMER',
        action: AUDIT_ACTIONS.AUTH_LOGIN_SUCCESS,
        resource: 'User',
        resourceId: 'usr_actor_99',
        requestId: 'req_test_123',
        ipAddress: '103.100.100.1',
        userAgent: 'Mozilla/5.0',
        metadata: {
          sessionId: 'ses_123',
          password: 'should_not_leak',
          accessToken: 'should_not_leak_either',
        },
      });

      expect(mockPrisma.auditLogs.length).toBe(1);
      const record = mockPrisma.auditLogs[0];
      expect(record.id).toBeDefined();
      expect(record.actorId).toBe('usr_actor_99');
      expect(record.action).toBe('AUTH_LOGIN_SUCCESS');
      expect(record.ipAddress).toBe('103.100.100.1');
      expect(record.userAgent).toBe('Mozilla/5.0');
      // Verifying metadata redaction
      expect(record.metadata.requestId).toBe('req_test_123');
      expect(record.metadata.sessionId).toBe('[REDACTED]');
      expect(record.metadata.password).toBe('[REDACTED]');
      expect(record.metadata.accessToken).toBe('[REDACTED]');
    });

    it('does not throw when database write fails (non-blocking tolerance)', async () => {
      const faultyPrisma = {
        auditLog: {
          create: async () => {
            throw new Error('Database connection lost');
          },
        },
      };

      const audit = new AuditService(faultyPrisma);

      // Should complete without throwing exception
      await expect(
        audit.log({
          action: AUDIT_ACTIONS.AUTH_LOGIN_FAILED,
          resource: 'User',
        })
      ).resolves.toBeUndefined();
    });
  });

  describe('Distributed Sliding-Window Rate Limiter', () => {
    let rateLimiter: RedisRateLimiter;

    beforeEach(() => {
      // Initialize rate limiter (will use in-memory sliding window fallback in unit test)
      rateLimiter = new RedisRateLimiter();
    });

    it('allows requests within policy limits and computes remaining accurately', async () => {
      const policy = {
        keyPrefix: 'test_auth',
        windowMs: 60000,
        maxRequests: 3,
      };

      const r1 = await rateLimiter.consume('user_1', policy);
      expect(r1.isAllowed).toBe(true);
      expect(r1.remaining).toBe(2);

      const r2 = await rateLimiter.consume('user_1', policy);
      expect(r2.isAllowed).toBe(true);
      expect(r2.remaining).toBe(1);

      const r3 = await rateLimiter.consume('user_1', policy);
      expect(r3.isAllowed).toBe(true);
      expect(r3.remaining).toBe(0);

      // 4th request exceeds maxRequests = 3
      const r4 = await rateLimiter.consume('user_1', policy);
      expect(r4.isAllowed).toBe(false);
      expect(r4.remaining).toBe(0);
      expect(r4.retryAfterSeconds).toBeGreaterThan(0);
    });

    it('isolates counters between different identifiers', async () => {
      const policy = {
        keyPrefix: 'test_auth',
        windowMs: 60000,
        maxRequests: 1,
      };

      const userA1 = await rateLimiter.consume('user_A', policy);
      expect(userA1.isAllowed).toBe(true);

      const userA2 = await rateLimiter.consume('user_A', policy);
      expect(userA2.isAllowed).toBe(false);

      // User B has their own independent bucket
      const userB1 = await rateLimiter.consume('user_B', policy);
      expect(userB1.isAllowed).toBe(true);
    });

    it('resets counter when explicitly requested', async () => {
      const policy = {
        keyPrefix: 'test_reset',
        windowMs: 60000,
        maxRequests: 1,
      };

      await rateLimiter.consume('user_reset', policy);
      const blocked = await rateLimiter.consume('user_reset', policy);
      expect(blocked.isAllowed).toBe(false);

      await rateLimiter.reset('user_reset', policy.keyPrefix);

      const allowedAgain = await rateLimiter.consume('user_reset', policy);
      expect(allowedAgain.isAllowed).toBe(true);
    });
  });

  describe('Rate Limiting Policies Alignment', () => {
    it('loads standard environment-aligned auth policies', () => {
      const policies = getRateLimitPolicies();

      expect(policies.AUTH_LOGIN).toBeDefined();
      expect(policies.AUTH_LOGIN.maxRequests).toBe(5);

      expect(policies.AUTH_SMS_OTP).toBeDefined();
      expect(policies.AUTH_SMS_OTP.maxRequests).toBe(3);
      expect(policies.AUTH_SMS_OTP.windowMs).toBe(3600000); // 1 hour

      expect(policies.AUTH_PASSWORD_RESET).toBeDefined();
      expect(policies.AUTH_PASSWORD_RESET.maxRequests).toBe(3);

      expect(policies.AUTH_TOKEN_REFRESH).toBeDefined();
      expect(policies.AUTH_TOKEN_REFRESH.maxRequests).toBe(30);

      expect(policies.GLOBAL_API).toBeDefined();
      expect(policies.GLOBAL_API.maxRequests).toBe(100);
    });
  });
});
