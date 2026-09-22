/**
 * Integration Tests: Server-Side Authorization Route Guard & Policy Decorator
 * 
 * Verifies withAuthorization decorator and authorizeRequest helper across HTTP scenarios:
 * 1. 401 Unauthorized when credentials are absent
 * 2. 403 Forbidden when policy denies request
 * 3. 403 Feature Pending when Gate-05 maker-checker check fails
 * 4. 200 OK and execution of wrapped handler when authorized
 * 5. Dynamic resource extraction from incoming request params
 * 
 * Invariants: ADR-0003, ADR-0022, ADR-0023, Milestone 042
 */

import { describe, it, expect } from 'bun:test';
import { NextRequest, NextResponse } from 'next/server';
import { withAuthorization, authorizeRequest, PolicyEngine } from '@/shared/authz';
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
      sessionId: 'ses_integration_01',
      clientType: 'WEB',
    },
    JWT_SECRET
  );
  return `Bearer ${token}`;
}

describe('Server-Side withAuthorization Route Guard Integration (Milestone 042)', () => {
  const customEngine = new PolicyEngine({ log: async () => {} } as any);

  // Mock protected route handler wrapped with withAuthorization
  const protectedHandler = withAuthorization(
    'manage',
    (req) => {
      const url = new URL(req.url);
      const sellerId = url.searchParams.get('sellerId') || 'sel_default';
      return {
        type: 'SELLER',
        id: sellerId,
        sellerId,
      };
    },
    async (req, { actor, decision }) => {
      return NextResponse.json({
        success: true,
        data: {
          message: 'Operation executed successfully',
          actorId: actor.userId,
          policy: decision.policyName,
        },
      });
    },
    customEngine
  );

  it('returns 401 Unauthorized when request lacks Bearer token and cookie', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/protected?sellerId=sel_dhaka');
    const res = await protectedHandler(req);
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHENTICATED');
  });

  it('returns 403 Forbidden when seller staff attempts cross-tenant operation', async () => {
    const sellerDhakaAuth = createBearer({
      userId: 'usr_staff_dhaka',
      roles: [SystemRoleCode.SELLER_STAFF],
      permissions: ['seller:read'],
      sellerId: 'sel_dhaka_01',
    });

    // Requesting access to Chittagong store
    const req = new NextRequest('http://localhost:3000/api/v1/protected?sellerId=sel_ctg_02', {
      headers: { authorization: sellerDhakaAuth },
    });

    const res = await protectedHandler(req);
    expect(res.status).toBe(403);

    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('FORBIDDEN');
    expect(body.error.details.code).toBe('TENANT_VIOLATION');
  });

  it('returns 200 OK and executes inner logic when merchant accesses their own store', async () => {
    const sellerDhakaAuth = createBearer({
      userId: 'usr_owner_dhaka',
      roles: [SystemRoleCode.SELLER_OWNER],
      permissions: ['seller:profile:manage'],
      sellerId: 'sel_dhaka_01',
    });

    const req = new NextRequest('http://localhost:3000/api/v1/protected?sellerId=sel_dhaka_01', {
      headers: { authorization: sellerDhakaAuth },
    });

    const res = await protectedHandler(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.actorId).toBe('usr_owner_dhaka');
    expect(body.data.message).toBe('Operation executed successfully');
  });

  it('returns 200 OK for Super Administrator accessing any tenant', async () => {
    const superAdminAuth = createBearer({
      userId: 'usr_superadmin',
      roles: [SystemRoleCode.SUPER_ADMIN],
      permissions: [],
    });

    const req = new NextRequest('http://localhost:3000/api/v1/protected?sellerId=sel_ctg_02', {
      headers: { authorization: superAdminAuth },
    });

    const res = await protectedHandler(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.actorId).toBe('usr_superadmin');
  });

  it('enforces Gate-05 Maker-Checker dual authorization on financial route', async () => {
    const payoutHandler = withAuthorization(
      'payout',
      {
        type: 'WALLET',
        data: {
          amountPoisha: 10000000n, // 100,000 BDT
          makerId: 'usr_finance_01',
          checkerId: null, // missing checker
        },
      },
      async () => NextResponse.json({ success: true }),
      customEngine
    );

    const financeAuth = createBearer({
      userId: 'usr_finance_01',
      roles: [SystemRoleCode.ADMIN],
      permissions: ['finance:payout'],
    });

    const req = new NextRequest('http://localhost:3000/api/v1/finance/payout', {
      headers: { authorization: financeAuth },
    });

    const res = await payoutHandler(req);
    expect(res.status).toBe(403);

    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('FEATURE_PENDING_REGULATORY_APPROVAL');
  });
});
