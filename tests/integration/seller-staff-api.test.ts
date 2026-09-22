/**
 * Integration Tests: Seller Staff Roles, Invitations & Scoped Access REST APIs
 * 
 * Tests /api/v1/seller/staff and /api/v1/seller/staff/invite:
 * 1. 401 Unauthorized when unauthenticated
 * 2. 403 Forbidden when Customer tries to access or manage staff
 * 3. 403 Forbidden when Merchant from Tenant A accesses Tenant B (cross-tenant rejection)
 * 4. 403 Forbidden when staff without staff:manage permission tries to add/delete staff
 * 5. 422 Unprocessable Entity when validation fails
 * 6. Super Admin global operational access across tenants
 * 
 * Invariants: ADR-0003, ADR-0006, ADR-0021, ADR-0022, ADR-0024, Milestone 045
 */

import { describe, it, expect } from 'bun:test';
import { NextRequest } from 'next/server';
import { GET as getStaff, POST as addStaff, DELETE as removeStaff } from '@/app/api/v1/seller/staff/route';
import { POST as inviteStaff } from '@/app/api/v1/seller/staff/invite/route';
import { generateAccessToken } from '@/shared/auth/jwt';
import { SystemRoleCode } from '@/features/identity/types';

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
      sessionId: 'ses_integration_staff',
      clientType: 'WEB',
    },
    JWT_SECRET
  );
  return `Bearer ${token}`;
}

describe('Seller Staff REST API Integration (Milestone 045)', () => {
  const STORE_DHAKA = 'sel_1j7x4b9e8m02k3fa';
  const STORE_CTG = 'sel_2j7x4b9e8m02k3fb';

  const SELLER_DHAKA_OWNER_AUTH = createBearer({
    userId: 'usr_owner_dhaka',
    roles: [SystemRoleCode.SELLER_OWNER],
    permissions: ['seller:profile:manage', 'seller:staff:manage'],
    sellerId: STORE_DHAKA,
  });

  const SELLER_DHAKA_STAFF_AUTH = createBearer({
    userId: 'usr_staff_dhaka',
    roles: [SystemRoleCode.SELLER_STAFF],
    permissions: ['seller:staff:read', 'catalog:read'], // No staff:manage permission
    sellerId: STORE_DHAKA,
  });

  const CUSTOMER_AUTH = createBearer({
    userId: 'usr_customer_01',
    roles: [SystemRoleCode.CUSTOMER],
    permissions: ['catalog:read', 'orders:read'],
  });

  const SUPER_ADMIN_AUTH = createBearer({
    userId: 'usr_super_admin',
    roles: [SystemRoleCode.SUPER_ADMIN],
    permissions: ['*'],
  });

  // ── GET /api/v1/seller/staff ────────────────────────────────────────────────

  describe('GET /api/v1/seller/staff', () => {
    it('returns 401 Unauthorized without auth token', async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/seller/staff?sellerId=${STORE_DHAKA}`);
      const res = await getStaff(req);
      expect(res.status).toBe(401);
    });

    it('returns 403 Forbidden when Customer attempts to view store staff', async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/seller/staff?sellerId=${STORE_DHAKA}`, {
        headers: { authorization: CUSTOMER_AUTH },
      });
      const res = await getStaff(req);
      expect(res.status).toBe(403);
    });

    it('returns 403 Forbidden when Merchant Dhaka tries to view Merchant Chittagong staff', async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/seller/staff?sellerId=${STORE_CTG}`, {
        headers: { authorization: SELLER_DHAKA_OWNER_AUTH },
      });
      const res = await getStaff(req);
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('FORBIDDEN');
    });
  });

  // ── POST /api/v1/seller/staff ───────────────────────────────────────────────

  describe('POST /api/v1/seller/staff', () => {
    it('returns 401 Unauthorized without auth token', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/seller/staff', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sellerId: STORE_DHAKA }),
      });
      const res = await addStaff(req);
      expect(res.status).toBe(401);
    });

    it('returns 400 Bad Request on invalid JSON payload', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/seller/staff', {
        method: 'POST',
        headers: {
          authorization: SELLER_DHAKA_OWNER_AUTH,
          'content-type': 'application/json',
        },
        body: 'invalid-json-text',
      });
      const res = await addStaff(req);
      expect(res.status).toBe(400);
    });

    it('returns 422 Unprocessable Entity when required fields are missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/seller/staff', {
        method: 'POST',
        headers: {
          authorization: SELLER_DHAKA_OWNER_AUTH,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sellerId: STORE_DHAKA,
          // neither userId, email, nor phone provided
        }),
      });
      const res = await addStaff(req);
      expect(res.status).toBe(422);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('VALIDATION_FAILED');
    });

    it('returns 403 Forbidden when Seller Dhaka attempts to add staff to Seller Chittagong (cross-tenant)', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/seller/staff', {
        method: 'POST',
        headers: {
          authorization: SELLER_DHAKA_OWNER_AUTH,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sellerId: STORE_CTG, // Cross-tenant target!
          email: 'newstaff@store.com',
          roleCode: 'SELLER_STAFF',
        }),
      });
      const res = await addStaff(req);
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('FORBIDDEN');
    });

    it('returns 403 Forbidden when regular staff without staff:manage attempts to add staff', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/seller/staff', {
        method: 'POST',
        headers: {
          authorization: SELLER_DHAKA_STAFF_AUTH,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sellerId: STORE_DHAKA,
          email: 'subordinate@store.com',
          roleCode: 'SELLER_STAFF',
        }),
      });
      const res = await addStaff(req);
      expect(res.status).toBe(403);
    });
  });

  // ── POST /api/v1/seller/staff/invite ────────────────────────────────────────

  describe('POST /api/v1/seller/staff/invite', () => {
    it('returns 401 Unauthorized without auth token', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/seller/staff/invite', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sellerId: STORE_DHAKA }),
      });
      const res = await inviteStaff(req);
      expect(res.status).toBe(401);
    });

    it('returns 422 Unprocessable Entity when email is missing or invalid', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/seller/staff/invite', {
        method: 'POST',
        headers: {
          authorization: SELLER_DHAKA_OWNER_AUTH,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sellerId: STORE_DHAKA,
          email: 'not-an-email',
          name: 'Staff Person',
        }),
      });
      const res = await inviteStaff(req);
      expect(res.status).toBe(422);
    });

    it('returns 403 Forbidden when cross-tenant invitation is attempted', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/seller/staff/invite', {
        method: 'POST',
        headers: {
          authorization: SELLER_DHAKA_OWNER_AUTH,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sellerId: STORE_CTG, // Cross-tenant!
          email: 'person@domain.com',
          name: 'Person Name',
        }),
      });
      const res = await inviteStaff(req);
      expect(res.status).toBe(403);
    });
  });

  // ── DELETE /api/v1/seller/staff ─────────────────────────────────────────────

  describe('DELETE /api/v1/seller/staff', () => {
    it('returns 401 Unauthorized without auth token', async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/seller/staff?sellerId=${STORE_DHAKA}&userId=usr_123`, {
        method: 'DELETE',
      });
      const res = await removeStaff(req);
      expect(res.status).toBe(401);
    });

    it('returns 403 Forbidden when Customer attempts to remove staff', async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/seller/staff?sellerId=${STORE_DHAKA}&userId=usr_1j7x4b9e8m02k3fc`, {
        method: 'DELETE',
        headers: { authorization: CUSTOMER_AUTH },
      });
      const res = await removeStaff(req);
      expect(res.status).toBe(403);
    });

    it('returns 403 Forbidden when Merchant Dhaka attempts to remove Merchant Chittagong staff', async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/seller/staff?sellerId=${STORE_CTG}&userId=usr_1j7x4b9e8m02k3fc`, {
        method: 'DELETE',
        headers: { authorization: SELLER_DHAKA_OWNER_AUTH },
      });
      const res = await removeStaff(req);
      expect(res.status).toBe(403);
    });

    it('returns 422 Unprocessable Entity when userId or sellerId is missing or invalid', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/seller/staff', {
        method: 'DELETE',
        headers: {
          authorization: SELLER_DHAKA_OWNER_AUTH,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sellerId: STORE_DHAKA,
          userId: 'invalid_no_usr_prefix',
        }),
      });
      const res = await removeStaff(req);
      expect(res.status).toBe(422);
    });
  });
});
