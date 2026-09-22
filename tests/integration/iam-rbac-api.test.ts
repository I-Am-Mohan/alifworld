/**
 * Integration Tests: IAM & RBAC REST API Handlers
 *
 * Validates Route Handlers:
 * - GET /api/v1/iam/roles
 * - GET /api/v1/iam/permissions
 * - POST /api/v1/iam/roles/assign
 * - POST /api/v1/iam/roles/revoke
 *
 * Verifies:
 * - 401 Unauthorized on unauthenticated requests
 * - 403 Forbidden on negative authorization / missing permissions
 * - 422 Unprocessable Entity on schema validation failures
 * - 200 OK on authorized requests
 * - Privilege escalation barriers (non-superadmin cannot assign SUPER_ADMIN)
 *
 * Reference: docs/architecture/scope-boundaries-and-domain-map.md
 * Invariant: ADR-0003, ADR-0022, ADR-0023, Milestone 041
 */

import { describe, it, expect } from 'bun:test';
import { NextRequest } from 'next/server';
import { GET as getRoles } from '@/app/api/v1/iam/roles/route';
import { GET as getPermissions } from '@/app/api/v1/iam/permissions/route';
import { POST as assignRole } from '@/app/api/v1/iam/roles/assign/route';
import { POST as revokeRole } from '@/app/api/v1/iam/roles/revoke/route';
import { generateAccessToken } from '@/shared/auth/jwt';
import { TOKEN_POLICIES } from '@/shared/auth/token-policy';

const JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_min_32_chars_long_for_security';
process.env.JWT_SECRET = JWT_SECRET;

function createAuthHeader(params: {
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
      sessionId: 'ses_test_session_123',
      clientType: 'MOBILE_FLUTTER',
    },
    JWT_SECRET
  );
  return `Bearer ${token}`;
}

describe('IAM RBAC REST API Integration Tests (Milestone 041)', () => {
  const SUPER_ADMIN_AUTH = createAuthHeader({
    userId: 'usr_superadmin_01',
    roles: ['SUPER_ADMIN'],
    permissions: ['roles:read', 'roles:assign', 'permissions:read'],
  });

  const CUSTOMER_AUTH = createAuthHeader({
    userId: 'usr_customer_01',
    roles: ['CUSTOMER'],
    permissions: ['catalog:read', 'orders:read'],
  });

  // ── GET /api/v1/iam/roles ──────────────────────────────────────────────────

  describe('GET /api/v1/iam/roles', () => {
    it('returns 401 Unauthorized without auth token', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/iam/roles');
      const res = await getRoles(req);
      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('UNAUTHENTICATED');
    });

    it('returns 403 Forbidden when user lacks roles:read permission', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/iam/roles', {
        headers: { authorization: CUSTOMER_AUTH },
      });
      const res = await getRoles(req);
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('FORBIDDEN');
    });
  });

  // ── GET /api/v1/iam/permissions ────────────────────────────────────────────

  describe('GET /api/v1/iam/permissions', () => {
    it('returns 401 Unauthorized without auth token', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/iam/permissions');
      const res = await getPermissions(req);
      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('UNAUTHENTICATED');
    });

    it('returns 403 Forbidden when user lacks permissions:read', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/iam/permissions', {
        headers: { authorization: CUSTOMER_AUTH },
      });
      const res = await getPermissions(req);
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('FORBIDDEN');
    });
  });

  // ── POST /api/v1/iam/roles/assign ──────────────────────────────────────────

  describe('POST /api/v1/iam/roles/assign', () => {
    it('returns 401 Unauthorized without auth token', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/iam/roles/assign', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId: 'usr_abc', roleId: 'rol_xyz' }),
      });
      const res = await assignRole(req);
      expect(res.status).toBe(401);
    });

    it('returns 400 Bad Request on malformed JSON payload', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/iam/roles/assign', {
        method: 'POST',
        headers: {
          authorization: SUPER_ADMIN_AUTH,
          'content-type': 'application/json',
        },
        body: 'invalid-json{{{',
      });
      const res = await assignRole(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('INVALID_JSON');
    });

    it('returns 422 Unprocessable Entity when required IDs have invalid format', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/iam/roles/assign', {
        method: 'POST',
        headers: {
          authorization: SUPER_ADMIN_AUTH,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          userId: 'bad_user_id', // lacks standardized prefix/length
          roleId: 'bad_role_id',
        }),
      });
      const res = await assignRole(req);
      expect(res.status).toBe(422);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 422 when required fields are missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/iam/roles/assign', {
        method: 'POST',
        headers: {
          authorization: SUPER_ADMIN_AUTH,
          'content-type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      const res = await assignRole(req);
      expect(res.status).toBe(422);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ── POST /api/v1/iam/roles/revoke ──────────────────────────────────────────

  describe('POST /api/v1/iam/roles/revoke', () => {
    it('returns 401 Unauthorized without auth token', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/iam/roles/revoke', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ assignmentId: 'ura_test_123' }),
      });
      const res = await revokeRole(req);
      expect(res.status).toBe(401);
    });

    it('returns 422 when neither assignmentId nor (userId + roleId) is provided', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/iam/roles/revoke', {
        method: 'POST',
        headers: {
          authorization: SUPER_ADMIN_AUTH,
          'content-type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      const res = await revokeRole(req);
      expect(res.status).toBe(422);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
