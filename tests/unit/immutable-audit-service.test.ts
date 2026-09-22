/**
 * Unit Tests: Immutable Security and Business Audit Logging
 * 
 * Verifies:
 * 1. AuditRepository append-only persistence and immutability assertions
 * 2. Multi-filter historical querying and pagination
 * 3. AuditService.logSecurityEvent with request telemetry and metadata redaction
 * 4. AuditService.logBusinessEvent with automatic state diffing
 * 5. Sensitive data redaction engine (passwords, tokens, OTPs, PINs, card numbers)
 * 6. Non-blocking error handling (database failures never abort business logic)
 * 7. Query authorization rules (SuperAdmin and system:audit_read)
 * 
 * Invariants: ADR-0022, ADR-0031, Milestone 049, NIST SP 800-63B
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { NextRequest } from 'next/server';
import { AuditService } from '@/shared/audit/audit.service';
import { AuditRepository } from '@/shared/audit/audit.repository';
import { redactSensitiveData, isSensitiveKey } from '@/shared/audit/redactor';
import { computeAuditDiff } from '@/shared/audit/audit-diff';
import { ActorContext } from '@/shared/authz/authz.types';
import { SystemRoleCode } from '@/features/identity/types';
import { AuthorizationError, NotFoundError, ValidationError } from '@/shared/errors/app-error';

// In-memory mock Prisma client for isolated unit testing
class MockAuditPrisma {
  public logs: any[] = [];
  public shouldFail: boolean = false;

  public auditLog = {
    create: async ({ data }: any) => {
      if (this.shouldFail) {
        throw new Error('Database connection pool exhausted');
      }
      const record = { ...data, id: data.id || `aud_mock_${Date.now()}` };
      this.logs.push(record);
      return record;
    },
    findMany: async ({ where, skip = 0, take = 20 }: any) => {
      let filtered = [...this.logs];
      if (where?.action) filtered = filtered.filter((l) => l.action === where.action);
      if (where?.resource) filtered = filtered.filter((l) => l.resource === where.resource);
      if (where?.actorId) filtered = filtered.filter((l) => l.actorId === where.actorId);
      return filtered.slice(skip, skip + take);
    },
    count: async ({ where }: any) => {
      let filtered = [...this.logs];
      if (where?.action) filtered = filtered.filter((l) => l.action === where.action);
      if (where?.resource) filtered = filtered.filter((l) => l.resource === where.resource);
      if (where?.actorId) filtered = filtered.filter((l) => l.actorId === where.actorId);
      return filtered.length;
    },
    findUnique: async ({ where }: any) => {
      return this.logs.find((l) => l.id === where.id) || null;
    },
  };
}

describe('Immutable Security & Business Audit Logging Unit Tests (Milestone 049)', () => {
  let mockPrisma: MockAuditPrisma;
  let repository: AuditRepository;
  let service: AuditService;

  beforeEach(() => {
    mockPrisma = new MockAuditPrisma();
    repository = new AuditRepository();
    // Inject mockPrisma into repository.db
    Object.defineProperty(repository, 'db', {
      get: () => mockPrisma,
      configurable: true,
    });
    service = new AuditService(mockPrisma, repository);
  });

  // ── 1. Sensitive Data Redaction Engine ──────────────────────────────────────

  describe('1. Sensitive Data Redaction Engine', () => {
    it('detects sensitive keys (password, token, otp, secret, card, pin, session)', () => {
      expect(isSensitiveKey('password')).toBe(true);
      expect(isSensitiveKey('oldPassword')).toBe(true);
      expect(isSensitiveKey('accessToken')).toBe(true);
      expect(isSensitiveKey('refreshToken')).toBe(true);
      expect(isSensitiveKey('otpCode')).toBe(true);
      expect(isSensitiveKey('card_number')).toBe(true);
      expect(isSensitiveKey('cvv')).toBe(true);
      expect(isSensitiveKey('sessionId')).toBe(true);

      // Safe business keys
      expect(isSensitiveKey('orderNumber')).toBe(false);
      expect(isSensitiveKey('status')).toBe(false);
      expect(isSensitiveKey('totalPoisha')).toBe(false);
      expect(isSensitiveKey('email')).toBe(false);
    });

    it('recursively replaces sensitive fields with [REDACTED]', () => {
      const payload = {
        userId: 'usr_123',
        email: 'alice@example.com',
        credentials: 'stored_hash_value',
        authData: {
          password: 'SuperSecretPassword123!',
          salt: 'random_salt_hex',
        },
        tokens: ['token_abc', 'token_def'],
        paymentInfo: {
          cardNumber: '4111111111111111',
          cvv: '123',
          amountPoisha: '500000',
        },
      };

      const redacted = redactSensitiveData(payload);
      expect(redacted.userId).toBe('usr_123');
      expect(redacted.email).toBe('alice@example.com');
      expect(redacted.credentials).toBe('[REDACTED]');
      expect(redacted.authData.password).toBe('[REDACTED]');
      expect(redacted.authData.salt).toBe('[REDACTED]');
      expect(redacted.paymentInfo.cardNumber).toBe('[REDACTED]');
      expect(redacted.paymentInfo.cvv).toBe('[REDACTED]');
      expect(redacted.paymentInfo.amountPoisha).toBe('500000'); // Preserved!
    });
  });

  // ── 2. Redaction-Safe State Diffs ───────────────────────────────────────────

  describe('2. State Diff Computation (computeAuditDiff)', () => {
    it('computes before and after field differences', () => {
      const before = { status: 'PENDING', totalPoisha: 250000 };
      const after = { status: 'CANCELLED', totalPoisha: 250000 };

      const diff = computeAuditDiff(before, after);
      expect(diff).not.toBeNull();
      expect(diff?.status).toEqual({ from: 'PENDING', to: 'CANCELLED' });
      expect(diff?.totalPoisha).toBeUndefined(); // Unchanged field omitted
    });

    it('redacts sensitive fields within state diffs', () => {
      const before = { status: 'ACTIVE', passwordHash: 'hash_old' };
      const after = { status: 'ACTIVE', passwordHash: 'hash_new' };

      const diff = computeAuditDiff(before, after);
      expect(diff).not.toBeNull();
      expect(diff?.passwordHash).toEqual({ from: '[REDACTED]', to: '[REDACTED]' });
    });
  });

  // ── 3. AuditRepository & Immutability Assertion ──────────────���──────────────

  describe('3. AuditRepository Immutability & Persistence', () => {
    it('appends an audit log entry with prefix aud_', async () => {
      const record = await repository.appendEntry({
        action: 'ORDER_CREATED',
        resource: 'ORDER',
        resourceId: 'ord_123',
        actorId: 'usr_alice',
        actorRole: 'CUSTOMER',
      });

      expect(record.id.startsWith('aud_')).toBe(true);
      expect(record.action).toBe('ORDER_CREATED');
      expect(mockPrisma.logs.length).toBe(1);
    });

    it('assertImmutable strictly forbids deletion or modification under ADR-0022', () => {
      expect(() => repository.assertImmutable()).toThrow(ValidationError);
    });

    it('findLogs filters by action and resource with pagination', async () => {
      await repository.appendEntry({ action: 'ORDER_CREATED', resource: 'ORDER' });
      await repository.appendEntry({ action: 'ORDER_CANCELLED', resource: 'ORDER' });
      await repository.appendEntry({ action: 'CSRF_VIOLATION_DETECTED', resource: 'PERIMETER' });

      const orderLogs = await repository.findLogs({ resource: 'ORDER' });
      expect(orderLogs.items.length).toBe(2);
      expect(orderLogs.pagination.total).toBe(2);

      const csrfLogs = await repository.findLogs({ action: 'CSRF_VIOLATION_DETECTED' });
      expect(csrfLogs.items.length).toBe(1);
    });
  });

  // ── 4. AuditService High-Level Security & Business Helpers ──────────────────

  describe('4. AuditService Security & Business Events', () => {
    it('logSecurityEvent captures telemetry and redacts sensitive metadata', async () => {
      const fakeReq = new NextRequest('http://localhost:3000/api/v1/orders', {
        headers: {
          'x-request-id': 'req_sec_001',
          'x-forwarded-for': '203.0.113.195',
          'user-agent': 'SecurityTestAgent/1.0',
        },
      });

      await service.logSecurityEvent({
        action: 'CSRF_VIOLATION_DETECTED',
        resource: 'PERIMETER',
        req: fakeReq,
        metadata: {
          code: 'CSRF_TOKEN_INVALID',
          secretKey: 'should_be_redacted',
          reason: 'Token mismatch',
        },
      });

      expect(mockPrisma.logs.length).toBe(1);
      const log = mockPrisma.logs[0];
      expect(log.action).toBe('CSRF_VIOLATION_DETECTED');
      expect(log.ipAddress).toBe('203.0.113.195');
      expect(log.userAgent).toBe('SecurityTestAgent/1.0');
      expect(log.metadata.requestId).toBe('req_sec_001');
      expect(log.metadata.secretKey).toBe('[REDACTED]');
      expect(log.metadata.reason).toBe('Token mismatch');
    });

    it('logBusinessEvent attaches state diff and correlation ID', async () => {
      await service.logBusinessEvent({
        action: 'ORDER_CANCELLED',
        resource: 'ORDER',
        resourceId: 'ord_456',
        actorId: 'usr_customer_1',
        actorRole: 'CUSTOMER',
        requestId: 'req_biz_002',
        before: { status: 'PENDING' },
        after: { status: 'CANCELLED' },
        metadata: { reason: 'Accidental order' },
      });

      expect(mockPrisma.logs.length).toBe(1);
      const log = mockPrisma.logs[0];
      expect(log.action).toBe('ORDER_CANCELLED');
      expect(log.resourceId).toBe('ord_456');
      expect(log.metadata.diff.status).toEqual({ from: 'PENDING', to: 'CANCELLED' });
      expect(log.metadata.requestId).toBe('req_biz_002');
    });

    it('non-blocking failure tolerance: does not throw when database fails', async () => {
      mockPrisma.shouldFail = true;

      // Must not throw exception
      expect(
        service.log({
          action: 'ORDER_CREATED',
          resource: 'ORDER',
        })
      ).resolves.toBeUndefined();
    });
  });

  // ── 5. Query Authorization & Governance ─────────────────────────────────────

  describe('5. Audit Query Access Control', () => {
    const superAdmin: ActorContext = {
      userId: 'usr_super',
      roles: [SystemRoleCode.SUPER_ADMIN],
      permissions: ['*'],
    };

    const complianceAdmin: ActorContext = {
      userId: 'usr_auditor',
      roles: [SystemRoleCode.ADMIN],
      permissions: ['system:audit_read'],
    };

    const regularCustomer: ActorContext = {
      userId: 'usr_customer',
      roles: [SystemRoleCode.CUSTOMER],
      permissions: ['orders:read'],
    };

    it('allows Super Administrator to query audit logs', async () => {
      await repository.appendEntry({ action: 'AUTH_LOGIN_SUCCESS', resource: 'AUTH_SESSION' });
      const result = await service.queryAuditLogs(superAdmin, {});
      expect(result.items.length).toBe(1);
    });

    it('allows Admin with system:audit_read to query audit logs', async () => {
      await repository.appendEntry({ action: 'AUTH_LOGIN_SUCCESS', resource: 'AUTH_SESSION' });
      const result = await service.queryAuditLogs(complianceAdmin, {});
      expect(result.items.length).toBe(1);
    });

    it('strictly forbids Customer from querying audit logs (AuthorizationError)', async () => {
      expect(service.queryAuditLogs(regularCustomer, {})).rejects.toThrow(AuthorizationError);
    });

    it('getAuditLogById throws NotFoundError when record does not exist', async () => {
      expect(service.getAuditLogById(superAdmin, 'aud_non_existent')).rejects.toThrow(
        NotFoundError
      );
    });
  });
});
