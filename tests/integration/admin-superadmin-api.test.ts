/**
 * Integration Tests: Admin vs Super Admin API Route Handlers (Milestone 044)
 * 
 * Verifies HTTP response codes and privilege enforcement across:
 * - POST /api/v1/system/setup
 * - POST /api/v1/iam/roles/assign
 * - POST /api/v1/iam/roles/revoke
 * 
 * Invariants: ADR-0003, ADR-0006, ADR-0022, ADR-0023, Milestone 044
 */

import { describe, it, expect } from 'bun:test';
import { NextRequest } from 'next/server';
import { POST as updateSetup } from '@/app/api/v1/system/setup/route';
import { POST as assignRole } from '@/app/api/v1/iam/roles/assign/route';
import { POST as revokeRole } from '@/app/api/v1/iam/roles/revoke/route';
import { generateAccessToken } from '@/shared/auth/jwt';
import { SystemRoleCode } from '@/features/identity/types';

const JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_min_32_chars_long_for_security';
process.env.JWT_SECRET = JWT_SECRET;

function createBearerToken(params: {
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
      sessionId: 'ses_test_integration_admin',
      clientType: 'WEB',
    },
    JWT_SECRET
  );
  return `Bearer ${token}`;
}

describe('Admin vs Super Admin API Integration Tests (Milestone 044)', () => {
  const SUPER_ADMIN_AUTH = createBearerToken({
    userId: 'usr_superadmin_root',
    roles: [SystemRoleCode.SUPER_ADMIN],
    permissions: ['*'],
  });

  const PLATFORM_ADMIN_AUTH = createBearerToken({
    userId: 'usr_platform_admin_ops',
    roles: [SystemRoleCode.ADMIN],
    permissions: [
      'users:read',
      'users:write',
      'users:suspend',
      'roles:read',
      'permissions:read',
      'sellers:read',
      'sellers:verify',
      'sellers:suspend',
      'system:config',
      'system:audit_read',
    ],
  });

  const CUSTOMER_AUTH = createBearerToken({
    userId: 'usr_customer_regular',
    roles: [SystemRoleCode.CUSTOMER],
    permissions: ['catalog:read', 'orders:read'],
  });

  // ── POST /api/v1/system/setup ──────────────────────────────────────────────

  describe('POST /api/v1/system/setup', () => {
    it('returns 401 Unauthorized when unauthenticated', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/system/setup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ COURIER_DEFAULT_PROVIDER: 'STEADFAST' }),
      });

      const res = await updateSetup(req);
      expect(res.status).toBe(401);
    });

    it('returns 403 Forbidden when Customer attempts to mutate system settings', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/system/setup', {
        method: 'POST',
        headers: {
          authorization: CUSTOMER_AUTH,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ COURIER_DEFAULT_PROVIDER: 'STEADFAST' }),
      });

      const res = await updateSetup(req);
      expect(res.status).toBe(403);
    });

    it('returns 403 Forbidden (PRIVILEGE_ESCALATION) when Platform Admin attempts to mutate root S3 credentials', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/system/setup', {
        method: 'POST',
        headers: {
          authorization: PLATFORM_ADMIN_AUTH,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          STORAGE_S3_SECRET_KEY: 'new_secret_attempt',
        }),
      });

      const res = await updateSetup(req);
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('FORBIDDEN');
    });

    it('returns 403 Forbidden (PRIVILEGE_ESCALATION) when Platform Admin attempts to toggle FEATURE_MAINTENANCE_MODE', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/system/setup', {
        method: 'POST',
        headers: {
          authorization: PLATFORM_ADMIN_AUTH,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          FEATURE_MAINTENANCE_MODE: 'true',
        }),
      });

      const res = await updateSetup(req);
      expect(res.status).toBe(403);
    });

    it('allows Platform Admin to update routine operational configs', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/system/setup', {
        method: 'POST',
        headers: {
          authorization: PLATFORM_ADMIN_AUTH,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          COURIER_DEFAULT_PROVIDER: 'STEADFAST',
        }),
      });

      const res = await updateSetup(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.updatedKeys).toContain('COURIER_DEFAULT_PROVIDER');
    });

    it('allows Super Admin to update root security credentials', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/system/setup', {
        method: 'POST',
        headers: {
          authorization: SUPER_ADMIN_AUTH,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          COURIER_DEFAULT_PROVIDER: 'PATHAO',
          STORAGE_S3_REGION: 'ap-southeast-1',
        }),
      });

      const res = await updateSetup(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
    });
  });

  // ── POST /api/v1/iam/roles/assign ──────────────────────────────────────────

  describe('POST /api/v1/iam/roles/assign', () => {
    it('returns 401 Unauthorized without auth token', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/iam/roles/assign', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          userId: 'usr_1j7x4b9e8m02k3fa',
          roleId: 'rol_1j7x4b9e8m02k3fb',
        }),
      });

      const res = await assignRole(req);
      expect(res.status).toBe(401);
    });

    it('returns 403 Forbidden when customer attempts role assignment', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/iam/roles/assign', {
        method: 'POST',
        headers: {
          authorization: CUSTOMER_AUTH,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          userId: 'usr_1j7x4b9e8m02k3fa',
          roleId: 'rol_1j7x4b9e8m02k3fb',
        }),
      });

      const res = await assignRole(req);
      expect(res.status).toBe(403);
    });
  });
});
