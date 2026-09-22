/**
 * Integration Tests: Admin Historical Audit Trail Exploration REST API (Milestone 049)
 * 
 * Verifies /api/v1/admin/audit and /api/v1/admin/audit/[id]:
 * 1. 401 Unauthorized when unauthenticated
 * 2. 403 Forbidden when Customer attempts to inspect audit trails
 * 3. 403 Forbidden when Admin lacks system:audit_read permission
 * 4. 422 Unprocessable Entity on invalid query parameter format
 * 5. 200 OK with paginated list for Super Admin & Compliance Admin
 * 6. Multi-parameter filtering by action, resource, actorId
 * 7. Single audit record inspection by ID (200 OK vs 404 Not Found)
 * 8. Append-only immutability invariant: DELETE/PUT/PATCH return 405 Method Not Allowed
 * 
 * Invariants: ADR-0003, ADR-0022, ADR-0031, Milestone 044, Milestone 049
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { NextRequest } from 'next/server';
import { GET as getAuditLogs } from '@/app/api/v1/admin/audit/route';
import {
  GET as getAuditLogById,
  DELETE as deleteAuditLog,
  PUT as putAuditLog,
  PATCH as patchAuditLog,
} from '@/app/api/v1/admin/audit/[id]/route';
import { generateAccessToken } from '@/shared/auth/jwt';
import { SystemRoleCode } from '@/features/identity/types';
import { prisma } from '@/shared/database/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_min_32_chars_long_for_security';
process.env.JWT_SECRET = JWT_SECRET;

function createBearer(params: {
  userId: string;
  roles: string[];
  permissions: string[];
  sellerId?: string | null;
}) {
  const token = generateAccessToken(
    {
      userId: params.userId,
      email: `${params.userId}@example.com`,
      phone: null,
      roles: params.roles,
      permissions: params.permissions,
      sellerId: params.sellerId ?? null,
      tokenVersion: 1,
      sessionId: 'ses_integration_audit_trail',
      clientType: 'WEB',
    },
    JWT_SECRET
  );
  return `Bearer ${token}`;
}

describe('Admin Historical Audit Trail REST API Integration (Milestone 049)', () => {
  const SUPER_ADMIN_AUTH = createBearer({
    userId: 'usr_super_admin_01',
    roles: [SystemRoleCode.SUPER_ADMIN],
    permissions: ['*'],
  });

  const COMPLIANCE_ADMIN_AUTH = createBearer({
    userId: 'usr_compliance_officer',
    roles: [SystemRoleCode.ADMIN],
    permissions: ['system:audit_read'],
  });

  const STANDARD_ADMIN_AUTH = createBearer({
    userId: 'usr_catalog_admin',
    roles: [SystemRoleCode.ADMIN],
    permissions: ['catalog:read', 'catalog:write'], // No audit_read!
  });

  const CUSTOMER_AUTH = createBearer({
    userId: 'usr_customer_alice',
    roles: [SystemRoleCode.CUSTOMER],
    permissions: ['orders:read'],
  });

  // Mock in-memory audit logs
  let mockLogs: any[];

  beforeEach(() => {
    mockLogs = [
      {
        id: 'aud_001',
        actorId: 'usr_customer_alice',
        actorRole: 'CUSTOMER',
        action: 'ORDER_CREATED',
        resource: 'ORDER',
        resourceId: 'ord_1001',
        ipAddress: '203.0.113.10',
        userAgent: 'Mozilla/5.0',
        metadata: { orderNumber: 'ORD-20260923-0001', totalPoisha: '250000' },
        createdAt: new Date('2026-09-23T01:00:00Z'),
      },
      {
        id: 'aud_002',
        actorId: 'usr_customer_alice',
        actorRole: 'CUSTOMER',
        action: 'ORDER_CANCELLED',
        resource: 'ORDER',
        resourceId: 'ord_1001',
        ipAddress: '203.0.113.10',
        userAgent: 'Mozilla/5.0',
        metadata: {
          diff: { status: { from: 'PENDING', to: 'CANCELLED' } },
          reason: 'Customer cancelled duplicate',
        },
        createdAt: new Date('2026-09-23T01:15:00Z'),
      },
      {
        id: 'aud_003',
        actorId: 'usr_merchant_walton',
        actorRole: 'SELLER_OWNER',
        action: 'PRODUCT_PUBLISHED',
        resource: 'PRODUCT',
        resourceId: 'prd_walton_01',
        ipAddress: '198.51.100.5',
        userAgent: 'PostmanRuntime/7.32',
        metadata: { status: 'PUBLISHED' },
        createdAt: new Date('2026-09-23T02:00:00Z'),
      },
      {
        id: 'aud_004',
        actorId: 'usr_attacker',
        actorRole: 'ANONYMOUS',
        action: 'CSRF_VIOLATION_DETECTED',
        resource: 'PERIMETER',
        resourceId: null,
        ipAddress: '192.0.2.99',
        userAgent: 'Curl/7.88',
        metadata: { code: 'CSRF_TOKEN_MISSING' },
        createdAt: new Date('2026-09-23T02:30:00Z'),
      },
    ];

    (prisma as any).auditLog = {
      findMany: async ({ where, skip = 0, take = 20 }: any) => {
        let filtered = [...mockLogs];
        if (where?.action) filtered = filtered.filter((l) => l.action === where.action);
        if (where?.resource) filtered = filtered.filter((l) => l.resource === where.resource);
        if (where?.actorId) filtered = filtered.filter((l) => l.actorId === where.actorId);
        return filtered.slice(skip, skip + take);
      },
      count: async ({ where }: any) => {
        let filtered = [...mockLogs];
        if (where?.action) filtered = filtered.filter((l) => l.action === where.action);
        if (where?.resource) filtered = filtered.filter((l) => l.resource === where.resource);
        if (where?.actorId) filtered = filtered.filter((l) => l.actorId === where.actorId);
        return filtered.length;
      },
      findUnique: async ({ where }: any) => {
        return mockLogs.find((l) => l.id === where.id) || null;
      },
    };
  });

  // ── 1. GET /api/v1/admin/audit ──────────────────────────────────────────────

  describe('GET /api/v1/admin/audit', () => {
    it('returns 401 Unauthorized when unauthenticated', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/admin/audit');
      const res = await getAuditLogs(req);
      expect(res.status).toBe(401);
    });

    it('returns 403 Forbidden when Customer attempts to access audit logs', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/admin/audit', {
        headers: { authorization: CUSTOMER_AUTH },
      });
      const res = await getAuditLogs(req);
      expect(res.status).toBe(403);
    });

    it('returns 403 Forbidden when Admin lacks system:audit_read permission', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/admin/audit', {
        headers: { authorization: STANDARD_ADMIN_AUTH },
      });
      const res = await getAuditLogs(req);
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.error.code).toBe('FORBIDDEN');
      expect(json.error.message).toContain('system:audit_read');
    });

    it('returns 422 Unprocessable Entity when query dates are invalid', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/admin/audit?startDate=not_a_date', {
        headers: { authorization: SUPER_ADMIN_AUTH },
      });
      const res = await getAuditLogs(req);
      expect(res.status).toBe(422);

      const json = await res.json();
      expect(json.error.code).toBe('VALIDATION_FAILED');
    });

    it('returns 200 OK with paginated list for Super Administrator', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/admin/audit', {
        headers: { authorization: SUPER_ADMIN_AUTH },
      });
      const res = await getAuditLogs(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.items.length).toBe(4);
      expect(json.pagination.total).toBe(4);
    });

    it('returns 200 OK for Compliance Admin holding system:audit_read', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/admin/audit', {
        headers: { authorization: COMPLIANCE_ADMIN_AUTH },
      });
      const res = await getAuditLogs(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.items.length).toBe(4);
    });

    it('filters audit records by action and resource parameters', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/v1/admin/audit?action=CSRF_VIOLATION_DETECTED&resource=PERIMETER',
        {
          headers: { authorization: SUPER_ADMIN_AUTH },
        }
      );
      const res = await getAuditLogs(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.items.length).toBe(1);
      expect(json.items[0].action).toBe('CSRF_VIOLATION_DETECTED');
      expect(json.items[0].resource).toBe('PERIMETER');
    });
  });

  // ── 2. GET /api/v1/admin/audit/[id] ─────────────────────────────────────────

  describe('GET /api/v1/admin/audit/[id]', () => {
    it('returns 401 Unauthorized when unauthenticated', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/admin/audit/aud_001');
      const res = await getAuditLogById(req, { params: { id: 'aud_001' } });
      expect(res.status).toBe(401);
    });

    it('returns 404 Not Found for non-existent audit record ID', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/admin/audit/aud_non_existent', {
        headers: { authorization: SUPER_ADMIN_AUTH },
      });
      const res = await getAuditLogById(req, { params: { id: 'aud_non_existent' } });
      expect(res.status).toBe(404);
    });

    it('returns 200 OK with full audit record including metadata and state diff', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/admin/audit/aud_002', {
        headers: { authorization: COMPLIANCE_ADMIN_AUTH },
      });
      const res = await getAuditLogById(req, { params: { id: 'aud_002' } });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.id).toBe('aud_002');
      expect(json.data.action).toBe('ORDER_CANCELLED');
      expect(json.data.metadata.diff.status.from).toBe('PENDING');
      expect(json.data.metadata.diff.status.to).toBe('CANCELLED');
    });
  });

  // ── 3. Append-Only Immutability Invariant Enforcement ───────────────────────

  describe('3. Immutability Invariant Enforcement (DELETE / PUT / PATCH)', () => {
    it('DELETE /api/v1/admin/audit/[id] returns 405 Method Not Allowed (IMMUTABLE_RECORD)', async () => {
      const res = await deleteAuditLog();
      expect(res.status).toBe(405);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('IMMUTABLE_RECORD');
      expect(json.error.message).toContain('strictly prohibited');
    });

    it('PUT /api/v1/admin/audit/[id] returns 405 Method Not Allowed (IMMUTABLE_RECORD)', async () => {
      const res = await putAuditLog();
      expect(res.status).toBe(405);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('IMMUTABLE_RECORD');
    });

    it('PATCH /api/v1/admin/audit/[id] returns 405 Method Not Allowed (IMMUTABLE_RECORD)', async () => {
      const res = await patchAuditLog();
      expect(res.status).toBe(405);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('IMMUTABLE_RECORD');
    });
  });
});
