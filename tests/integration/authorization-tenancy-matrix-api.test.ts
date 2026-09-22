/**
 * Integration Tests: Negative Attack Scenarios & Penetration Test Matrix (Milestone 050)
 * 
 * Simulates adversarial attack vectors across REST API endpoints:
 * 1. Horizontal cross-tenant attacks (Merchant A -> Merchant B resources)
 * 2. Horizontal cross-user attacks (Customer A -> Customer B resources)
 * 3. Vertical privilege escalation attacks (Customer/Seller -> IAM/Admin operations)
 * 4. Administrator privilege escalation attacks (Admin -> Super Admin escalation)
 * 5. Account lifecycle lockouts (Suspended & Deactivated accounts)
 * 6. State invariant inversion attacks (Modifying immutable audit records, cancelling delivered orders)
 * 7. Web perimeter attack simulations (CSRF bypass, CORS origin spoofing, UI framing)
 * 
 * Invariants: ADR-0003, ADR-0006, ADR-0022, ADR-0023, Milestone 050
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { NextRequest } from 'next/server';
import { middleware } from '@/middleware';
import { GET as getSettings, PUT as updateSettings } from '@/app/api/v1/seller/settings/route';
import { GET as getKyc, POST as submitKyc } from '@/app/api/v1/seller/kyc/route';
import { GET as getOrderById } from '@/app/api/v1/orders/[id]/route';
import { POST as cancelOrder } from '@/app/api/v1/orders/[id]/cancel/route';
import { POST as checkoutCart } from '@/app/api/v1/cart/checkout/route';
import { PUT as updateProfile } from '@/app/api/v1/customer/profile/route';
import { POST as assignRole } from '@/app/api/v1/iam/roles/assign/route';
import { GET as getAuditLogs } from '@/app/api/v1/admin/audit/route';
import { DELETE as deleteAuditLog } from '@/app/api/v1/admin/audit/[id]/route';
import { generateAccessToken } from '@/shared/auth/jwt';
import { SystemRoleCode } from '@/features/identity/types';
import { prisma } from '@/shared/database/prisma';
import { TOKEN_POLICIES } from '@/shared/auth/token-policy';

const JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_min_32_chars_long_for_security';
process.env.JWT_SECRET = JWT_SECRET;

function createBearer(params: {
  userId: string;
  roles: string[];
  permissions: string[];
  sellerId?: string | null;
  status?: string;
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
      sessionId: 'ses_pen_test_matrix',
      clientType: 'WEB',
    },
    JWT_SECRET
  );
  return `Bearer ${token}`;
}

describe('Negative Security Matrix & Penetration Test Suite (Milestone 050)', () => {
  const STORE_A = 'sel_1j7x4b9e8m02k3fa';
  const STORE_B = 'sel_2j7x4b9e8m02k3fb';
  const USER_ALICE = 'usr_1j7x4b9e8m02k3fa';
  const USER_BOB = 'usr_2j7x4b9e8m02k3fb';
  const ROLE_ADMIN = 'rol_1j7x4b9e8m02k3fb';
  const ROLE_SUPER_ADMIN = 'rol_3j7x4b9e8m02k3fc';

  const SELLER_A_AUTH = createBearer({
    userId: 'usr_seller_apex_01',
    roles: [SystemRoleCode.SELLER_OWNER],
    permissions: ['seller:profile:manage', 'seller:staff:manage', 'orders:read', 'orders:manage'],
    sellerId: STORE_A,
  });

  const CUSTOMER_A_AUTH = createBearer({
    userId: USER_ALICE,
    roles: [SystemRoleCode.CUSTOMER],
    permissions: ['catalog:read', 'orders:read'],
  });

  const CUSTOMER_B_AUTH = createBearer({
    userId: USER_BOB,
    roles: [SystemRoleCode.CUSTOMER],
    permissions: ['catalog:read', 'orders:read'],
  });

  const ADMIN_AUTH = createBearer({
    userId: 'usr_platform_admin',
    roles: [SystemRoleCode.ADMIN],
    permissions: ['users:read', 'roles:assign', 'system:config'],
  });

  beforeEach(() => {
    // Mock prisma responses
    (prisma as any).auditLog = {
      create: async () => ({ id: 'aud_mock' }),
      findMany: async () => [],
      count: async () => 0,
      findUnique: async () => null,
    };

    (prisma as any).sellerStoreSettings = {
      findFirst: async ({ where }: any) => {
        if (where.sellerId === STORE_B) {
          return { id: 'set_2j7x4b9e8m02k3fb', sellerId: STORE_B, storeName: 'Walton Official', version: 1 };
        }
        return null;
      },
    };

    (prisma as any).order = {
      findFirst: async ({ where }: any) => {
        if (where.id === 'ord_bob_pending') {
          return {
            id: 'ord_bob_pending',
            orderNumber: 'ORD-2026-BOB',
            customerId: USER_BOB,
            status: 'PENDING',
            fulfillmentGroups: [{ id: 'sfg_b', sellerId: STORE_B, status: 'PENDING' }],
          };
        }
        if (where.id === 'ord_alice_delivered') {
          return {
            id: 'ord_alice_delivered',
            orderNumber: 'ORD-2026-ALICE',
            customerId: USER_ALICE,
            status: 'DELIVERED',
            fulfillmentGroups: [{ id: 'sfg_a', sellerId: STORE_A, status: 'DELIVERED' }],
          };
        }
        return null;
      },
    };

    (prisma as any).cart = {
      findFirst: async ({ where }: any) => {
        if (where.id === 'crt_bob_cart') {
          return { id: 'crt_bob_cart', userId: USER_BOB, status: 'ACTIVE' };
        }
        return null;
      },
    };

    (prisma as any).role = {
      findFirst: async ({ where }: any) => {
        if (where?.id === ROLE_SUPER_ADMIN || where?.code === SystemRoleCode.SUPER_ADMIN) {
          return { id: ROLE_SUPER_ADMIN, code: SystemRoleCode.SUPER_ADMIN };
        }
        return { id: ROLE_ADMIN, code: SystemRoleCode.ADMIN };
      },
    };

    (prisma as any).user = {
      findFirst: async () => ({ id: USER_ALICE, version: 1, roles: [] }),
    };
  });

  // ── 1. HORIZONTAL CROSS-TENANT ATTACKS ──────────────────────────────────────

  describe('1. Horizontal Cross-Tenant Attacks (Merchant A -> Merchant B)', () => {
    it('Attack 1.1: Merchant A fails to access Merchant B settings (403 TENANT_VIOLATION)', async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/seller/settings?sellerId=${STORE_B}`, {
        headers: { authorization: SELLER_A_AUTH },
      });

      const res = await getSettings(req);
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.error.details.code).toBe('TENANT_VIOLATION');
    });

    it('Attack 1.2: Merchant A fails to update Merchant B settings (403 TENANT_VIOLATION)', async () => {
      const req = new NextRequest(`http://localhost:3000/api/v1/seller/settings?sellerId=${STORE_B}`, {
        method: 'PUT',
        headers: {
          authorization: SELLER_A_AUTH,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sellerId: STORE_B,
          version: 1,
        }),
      });

      const res = await updateSettings(req);
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.error.details.code).toBe('TENANT_VIOLATION');
    });

    it('Attack 1.3: Merchant A fails to inspect Merchant B order fulfillment group (403 TENANT_VIOLATION)', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/orders/ord_bob_pending', {
        headers: { authorization: SELLER_A_AUTH },
      });

      const res = await getOrderById(req, { params: { id: 'ord_bob_pending' } });
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.error.details.code).toBe('TENANT_VIOLATION');
    });
  });

  // ── 2. HORIZONTAL CROSS-USER ATTACKS ────────────────────────────────────────

  describe('2. Horizontal Cross-User Attacks (Customer A -> Customer B)', () => {
    it('Attack 2.1: Customer A fails to inspect Customer B order (403 OWNERSHIP_VIOLATION)', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/orders/ord_bob_pending', {
        headers: { authorization: CUSTOMER_A_AUTH },
      });

      const res = await getOrderById(req, { params: { id: 'ord_bob_pending' } });
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.error.details.code).toBe('OWNERSHIP_VIOLATION');
    });

    it('Attack 2.2: Customer A fails to cancel Customer B order (403 OWNERSHIP_VIOLATION)', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/orders/ord_bob_pending/cancel', {
        method: 'POST',
        headers: {
          authorization: CUSTOMER_A_AUTH,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ reason: 'Malicious cancellation' }),
      });

      const res = await cancelOrder(req, { params: { id: 'ord_bob_pending' } });
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.error.details.code).toBe('OWNERSHIP_VIOLATION');
    });

    it('Attack 2.3: Customer A fails to checkout Customer B cart (403 OWNERSHIP_VIOLATION)', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/cart/checkout', {
        method: 'POST',
        headers: {
          authorization: CUSTOMER_A_AUTH,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          cartId: 'crt_bob_cart',
          checkout: {
            shippingName: 'Alice Intruder',
            shippingPhone: '+8801700112233',
            shippingDivision: 'DHAKA',
            shippingDistrict: 'Dhaka',
            shippingAddress: 'House 1',
          },
        }),
      });

      const res = await checkoutCart(req);
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.error.details.code).toBe('OWNERSHIP_VIOLATION');
    });
  });

  // ── 3. VERTICAL PRIVILEGE ESCALATION ATTACKS ────────────────────────────────

  describe('3. Vertical Privilege Escalation Attacks', () => {
    it('Attack 3.1: Customer fails to assign roles via IAM API (403 FORBIDDEN)', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/iam/roles/assign', {
        method: 'POST',
        headers: {
          authorization: CUSTOMER_A_AUTH,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          userId: USER_ALICE,
          roleId: ROLE_ADMIN,
        }),
      });

      const res = await assignRole(req);
      expect(res.status).toBe(403);
    });

    it('Attack 3.2: Customer fails to modify wallet balance or roles on profile update (403 PRIVILEGE_ESCALATION)', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/customer/profile', {
        method: 'PUT',
        headers: {
          authorization: CUSTOMER_A_AUTH,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Alice',
          roles: [SystemRoleCode.SUPER_ADMIN],
          walletBalance: 999999999,
        }),
      });

      const res = await updateProfile(req);
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.error.details.code).toBe('PRIVILEGE_ESCALATION');
    });

    it('Attack 3.3: Merchant fails to access compliance audit logs (403 FORBIDDEN)', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/admin/audit', {
        headers: { authorization: SELLER_A_AUTH },
      });

      const res = await getAuditLogs(req);
      expect(res.status).toBe(403);
    });

    it('Attack 3.4: Platform Admin fails to assign SUPER_ADMIN role (403 PRIVILEGE_ESCALATION)', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/iam/roles/assign', {
        method: 'POST',
        headers: {
          authorization: ADMIN_AUTH,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          userId: USER_ALICE,
          roleId: ROLE_SUPER_ADMIN,
        }),
      });

      const res = await assignRole(req);
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.error.code).toBe('FORBIDDEN');
      expect(json.error.message).toContain('Insufficient privileges');
    });
  });

  // ── 4. STATE & LIFECYCLE INVARIANT INVERSIONS ───────────────────────────────

  describe('4. State Invariant Inversions & Immutability Attacks', () => {
    it('Attack 4.1: Customer fails to cancel order already in DELIVERED state (403 FORBIDDEN)', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/orders/ord_alice_delivered/cancel', {
        method: 'POST',
        headers: {
          authorization: CUSTOMER_A_AUTH,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ reason: 'Too late cancellation' }),
      });

      const res = await cancelOrder(req, { params: { id: 'ord_alice_delivered' } });
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.error.message).toContain("cannot be cancelled in 'DELIVERED'");
    });

    it('Attack 4.2: Operator fails to delete immutable audit log (405 Method Not Allowed)', async () => {
      const res = await deleteAuditLog();
      expect(res.status).toBe(405);

      const json = await res.json();
      expect(json.error.code).toBe('IMMUTABLE_RECORD');
    });
  });

  // ── 5. WEB PERIMETER PENETRATION SCENARIOS ──────────────────────────────────

  describe('5. Web Perimeter Attack Scenarios (Middleware)', () => {
    it('Attack 5.1: Malicious cross-origin preflight OPTIONS is rejected (403 CORS_ORIGIN_DENIED)', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/customer/profile', {
        method: 'OPTIONS',
        headers: {
          origin: 'https://attacker-phishing-host.xyz',
          'access-control-request-method': 'PUT',
        },
      });

      const res = await middleware(req);
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.error.code).toBe('CORS_ORIGIN_DENIED');
    });

    it('Attack 5.2: State-modifying POST request without CSRF token is rejected (403 CSRF_TOKEN_MISSING)', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/cart/checkout', {
        method: 'POST',
        headers: {
          host: 'localhost:3000',
          origin: 'http://localhost:3000',
          cookie: `${TOKEN_POLICIES.ACCESS_TOKEN_COOKIE_NAME}=session_token`,
        },
      });

      const res = await middleware(req);
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.error.code).toBe('CSRF_TOKEN_MISSING');
    });

    it('Attack 5.3: Framing operational admin console is blocked (X-Frame-Options: DENY & frame-ancestors none)', async () => {
      const req = new NextRequest('http://localhost:3000/admin/settings', { method: 'GET' });
      const res = await middleware(req);

      expect(res.headers.get('X-Frame-Options')).toBe('DENY');
      expect(res.headers.get('Content-Security-Policy')).toContain("frame-ancestors 'none'");
    });
  });
});
