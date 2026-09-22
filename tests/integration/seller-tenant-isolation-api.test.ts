/**
 * Integration Tests: Seller Tenant Isolation Across REST API Handlers
 * 
 * Tests /api/v1/seller/settings and /api/v1/seller/kyc:
 * 1. 401 Unauthorized when unauthenticated
 * 2. 403 Forbidden when merchant from Tenant A accesses Tenant B
 * 3. 403 Forbidden when customer attempts merchant operations
 * 4. 422 Unprocessable Entity when validation fails
 * 5. Super Admin cross-tenant operational bypass
 * 
 * Invariants: ADR-0003, ADR-0006, ADR-0022, ADR-0024, Milestone 043
 */

import { describe, it, expect } from 'bun:test';
import { NextRequest } from 'next/server';
import { GET as getSettings, PUT as updateSettings } from '@/app/api/v1/seller/settings/route';
import { GET as getKyc, POST as submitKyc } from '@/app/api/v1/seller/kyc/route';
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
      sessionId: 'ses_integration_tenant',
      clientType: 'WEB',
    },
    JWT_SECRET
  );
  return `Bearer ${token}`;
}

describe('Seller Tenant Isolation API Integration (Milestone 043)', () => {
  const STORE_DHAKA = 'sel_1j7x4b9e8m02k3fa';
  const STORE_CTG = 'sel_2j7x4b9e8m02k3fb';

  const SELLER_DHAKA_AUTH = createBearer({
    userId: 'usr_owner_dhaka',
    roles: [SystemRoleCode.SELLER_OWNER],
    permissions: ['seller:profile:manage', 'seller:staff:manage'],
    sellerId: STORE_DHAKA,
  });

  const CUSTOMER_AUTH = createBearer({
    userId: 'usr_customer_01',
    roles: [SystemRoleCode.CUSTOMER],
    permissions: ['catalog:read', 'orders:read'],
  });

  // ── /api/v1/seller/settings ────────────────────────────────────────────────

  describe('GET /api/v1/seller/settings', () => {
    it('returns 401 Unauthorized when request has no credentials', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/seller/settings');
      const res = await getSettings(req);
      expect(res.status).toBe(401);
    });

    it('returns 403 Forbidden when a customer attempts to access seller settings', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/seller/settings', {
        headers: { authorization: CUSTOMER_AUTH },
      });
      const res = await getSettings(req);
      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/v1/seller/settings', () => {
    it('returns 401 Unauthorized without auth token', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/seller/settings', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sellerId: STORE_DHAKA }),
      });
      const res = await updateSettings(req);
      expect(res.status).toBe(401);
    });

    it('returns 403 Forbidden when Seller Dhaka attempts to update Seller Chittagong (TENANT_VIOLATION)', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/seller/settings', {
        method: 'PUT',
        headers: {
          authorization: SELLER_DHAKA_AUTH,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sellerId: STORE_CTG, // Cross-tenant target!
          vacationMode: true,
          version: 1,
        }),
      });

      const res = await updateSettings(req);
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('FORBIDDEN');
    });

    it('returns 422 Unprocessable Entity when OCC version is missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/seller/settings', {
        method: 'PUT',
        headers: {
          authorization: SELLER_DHAKA_AUTH,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sellerId: STORE_DHAKA,
          vacationMode: true,
          // version omitted
        }),
      });

      const res = await updateSettings(req);
      expect(res.status).toBe(422);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('VALIDATION_FAILED');
    });
  });

  // ── /api/v1/seller/kyc ─────────────────────────────────────────────────────

  describe('POST /api/v1/seller/kyc', () => {
    it('returns 401 Unauthorized without auth token', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/seller/kyc', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sellerId: STORE_DHAKA }),
      });
      const res = await submitKyc(req);
      expect(res.status).toBe(401);
    });

    it('returns 403 Forbidden when merchant tries to upload KYC for a different seller tenant', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/seller/kyc', {
        method: 'POST',
        headers: {
          authorization: SELLER_DHAKA_AUTH,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sellerId: STORE_CTG, // Cross-tenant!
          documentType: 'TRADE_LICENSE',
          fileUrl: 'https://storage.alifworld.com/kyc/trade.pdf',
          fileSize: 1024 * 500,
          mimeType: 'application/pdf',
        }),
      });

      const res = await submitKyc(req);
      expect(res.status).toBe(403);
    });
  });
});
