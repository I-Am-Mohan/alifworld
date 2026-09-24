/**
 * Integration Tests: Object-Level Authorization and Ownership Verification REST API (Milestone 047)
 * 
 * Verifies end-to-end HTTP request handlers:
 * 1. /api/v1/customer/profile:
 *    - 401 Unauthorized when unauthenticated
 *    - 200 OK when customer reads own profile
 *    - 200 OK when customer updates self-service attributes
 *    - 403 Forbidden (PRIVILEGE_ESCALATION) when customer attempts to modify protected security/financial fields
 *    - 422 Unprocessable Entity on schema validation failure
 * 2. /api/v1/orders/[id]:
 *    - 401 Unauthorized when unauthenticated
 *    - 404 Not Found when order does not exist
 *    - 200 OK when customer reads own placed order
 *    - 403 Forbidden (OWNERSHIP_VIOLATION) when Customer B attempts to read Customer A's order
 *    - 200 OK when merchant reads order containing their fulfillment group
 *    - 403 Forbidden (TENANT_VIOLATION) when merchant reads order of a foreign merchant
 * 3. /api/v1/orders/[id]/cancel:
 *    - 403 Forbidden (OWNERSHIP_VIOLATION) when Customer B attempts to cancel Customer A's order
 *    - 403 Forbidden when Customer A attempts to cancel order in DELIVERED status
 *    - 200 OK when Customer A cancels their own PENDING order
 * 4. /api/v1/cart:
 *    - 401 Unauthorized when unauthenticated
 *    - 200 OK returns authenticated customer's cart
 * 5. /api/v1/cart/checkout:
 *    - 403 Forbidden (OWNERSHIP_VIOLATION) when Customer A attempts to checkout Customer B's cart
 * 
 * Invariants: ADR-0003, ADR-0006, ADR-0010, ADR-0022, ADR-0023, Milestone 047
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { NextRequest } from 'next/server';
import { GET as getProfile, PUT as updateProfile } from '@/app/api/v1/customer/profile/route';
import { GET as getOrderById } from '@/app/api/v1/orders/[id]/route';
import { POST as cancelOrder } from '@/app/api/v1/orders/[id]/cancel/route';
import { GET as getCart } from '@/app/api/v1/cart/route';
import { POST as checkoutCart } from '@/app/api/v1/cart/checkout/route';
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
      sessionId: 'ses_integration_object_authz',
      clientType: 'WEB',
    },
    JWT_SECRET
  );
  return `Bearer ${token}`;
}

describe('Object-Level Authorization REST API Integration (Milestone 047)', () => {
  const CUSTOMER_ALICE_ID = 'usr_alice_123';
  const CUSTOMER_BOB_ID = 'usr_bob_456';
  const SELLER_WALTON_ID = 'sel_walton_store';
  const SELLER_APEX_ID = 'sel_apex_store';

  const ALICE_AUTH = createBearer({
    userId: CUSTOMER_ALICE_ID,
    roles: [SystemRoleCode.CUSTOMER],
    permissions: ['catalog:read', 'orders:read'],
  });

  const BOB_AUTH = createBearer({
    userId: CUSTOMER_BOB_ID,
    roles: [SystemRoleCode.CUSTOMER],
    permissions: ['catalog:read', 'orders:read'],
  });

  const WALTON_SELLER_AUTH = createBearer({
    userId: 'usr_merchant_walton',
    roles: [SystemRoleCode.SELLER_OWNER],
    permissions: ['seller:read', 'orders:read'],
    sellerId: SELLER_WALTON_ID,
  });

  const APEX_SELLER_AUTH = createBearer({
    userId: 'usr_merchant_apex',
    roles: [SystemRoleCode.SELLER_OWNER],
    permissions: ['seller:read', 'orders:read'],
    sellerId: SELLER_APEX_ID,
  });

  // Mock data store
  let mockUserAlice: any;
  let mockOrderAlicePending: any;
  let mockOrderAliceDelivered: any;
  let mockCartAlice: any;
  let mockCartBob: any;

  beforeEach(() => {
    mockUserAlice = {
      id: CUSTOMER_ALICE_ID,
      email: 'alice@example.com',
      phone: '+8801700112233',
      name: 'Alice Khan',
      avatarUrl: 'https://cdn.alifworld.com/avatars/alice.jpg',
      status: 'ACTIVE',
      isEmailVerified: true,
      isPhoneVerified: true,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockOrderAlicePending = {
      id: 'ord_alice_pending_1',
      orderNumber: 'ORD-20260923-0001',
      customerId: CUSTOMER_ALICE_ID,
      status: 'PENDING',
      currency: 'BDT',
      totalPoisha: 250000n,
      totalProductPoints: 250,
      fulfillmentGroups: [
        {
          id: 'sfg_walton_1',
          orderId: 'ord_alice_pending_1',
          sellerId: SELLER_WALTON_ID,
          status: 'PENDING',
          shipments: [],
        },
      ],
      items: [],
      statusHistory: [],
    };

    mockOrderAliceDelivered = {
      id: 'ord_alice_delivered_1',
      orderNumber: 'ORD-20260923-0002',
      customerId: CUSTOMER_ALICE_ID,
      status: 'DELIVERED',
      currency: 'BDT',
      totalPoisha: 500000n,
      totalProductPoints: 500,
      fulfillmentGroups: [
        {
          id: 'sfg_walton_2',
          orderId: 'ord_alice_delivered_1',
          sellerId: SELLER_WALTON_ID,
          status: 'DELIVERED',
          shipments: [],
        },
      ],
      items: [],
      statusHistory: [],
    };

    mockCartAlice = {
      id: 'crt_alice_1',
      userId: CUSTOMER_ALICE_ID,
      status: 'ACTIVE',
      items: [
        {
          id: 'citm_1',
          sellerId: SELLER_WALTON_ID,
          variantId: 'var_1',
          quantity: 1,
          pricePoisha: 250000n,
          productPoint: 250,
        },
      ],
    };

    mockCartBob = {
      id: 'crt_bob_1',
      userId: CUSTOMER_BOB_ID,
      status: 'ACTIVE',
      items: [
        {
          id: 'citm_2',
          sellerId: SELLER_WALTON_ID,
          variantId: 'var_1',
          quantity: 2,
          pricePoisha: 500000n,
          productPoint: 500,
        },
      ],
    };

    // Mock prisma queries
    (prisma as any).auditLog = {
      create: async () => ({ id: 'aud_mock' }),
    };

    (prisma as any).user = {
      findFirst: async ({ where }: any) => {
        if (where.id === CUSTOMER_ALICE_ID) return mockUserAlice;
        return null;
      },
      update: async ({ where, data }: any) => {
        if (where.id === CUSTOMER_ALICE_ID) {
          mockUserAlice = { ...mockUserAlice, ...data, version: mockUserAlice.version + 1 };
          return mockUserAlice;
        }
        return null;
      },
    };

    (prisma as any).order = {
      findFirst: async ({ where }: any) => {
        if (where.id === 'ord_alice_pending_1') return mockOrderAlicePending;
        if (where.id === 'ord_alice_delivered_1') return mockOrderAliceDelivered;
        return null;
      },
      update: async ({ where, data }: any) => {
        if (where.id === 'ord_alice_pending_1') {
          mockOrderAlicePending = { ...mockOrderAlicePending, ...data };
          return mockOrderAlicePending;
        }
        return null;
      },
    };

    (prisma as any).orderStatusHistory = {
      create: async ({ data }: any) => ({ id: 'osh_mock', ...data }),
    };

    (prisma as any).cart = {
      findFirst: async ({ where }: any) => {
        if (where.userId === CUSTOMER_ALICE_ID || where.id === 'crt_alice_1') return mockCartAlice;
        if (where.userId === CUSTOMER_BOB_ID || where.id === 'crt_bob_1') return mockCartBob;
        return null;
      },
    };
  });

  // ── 1. /api/v1/customer/profile ─────────────────────────────────────────────

  describe('Customer Profile API (/api/v1/customer/profile)', () => {
    it('returns 401 Unauthorized when unauthenticated', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/customer/profile');
      const res = await getProfile(req);
      expect(res.status).toBe(401);
    });

    it('returns 200 OK with customer profile when authenticated', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/customer/profile', {
        headers: { authorization: ALICE_AUTH },
      });
      const res = await getProfile(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.id).toBe(CUSTOMER_ALICE_ID);
      expect(json.data.name).toBe('Alice Khan');
    });

    it('returns 403 Forbidden (PRIVILEGE_ESCALATION) when attempting to modify roles or wallet balance', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/customer/profile', {
        method: 'PUT',
        headers: {
          authorization: ALICE_AUTH,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Alice Khan',
          roles: [SystemRoleCode.SUPER_ADMIN],
          walletBalance: 100000000,
        }),
      });

      const res = await updateProfile(req);
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.details?.code || json.error.code).toBe('PRIVILEGE_ESCALATION');
    });

    it('returns 422 Unprocessable Entity when profile payload fails schema validation', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/customer/profile', {
        method: 'PUT',
        headers: {
          authorization: ALICE_AUTH,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          name: 'A', // Too short (min 2 chars)
        }),
      });

      const res = await updateProfile(req);
      expect(res.status).toBe(422);
    });

    it('returns 200 OK when customer updates valid profile attributes', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/customer/profile', {
        method: 'PUT',
        headers: {
          authorization: ALICE_AUTH,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Alice Khan Chowdhury',
        }),
      });

      const res = await updateProfile(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.name).toBe('Alice Khan Chowdhury');
    });
  });

  // ── 2. /api/v1/orders/[id] ──────────────────────────────────────────────────

  describe('Single Order Object Authorization (/api/v1/orders/[id])', () => {
    it('returns 401 Unauthorized when unauthenticated', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/orders/ord_alice_pending_1');
      const res = await getOrderById(req, { params: Promise.resolve({ id: 'ord_alice_pending_1' }) });
      expect(res.status).toBe(401);
    });

    it('returns 404 Not Found when order does not exist', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/orders/ord_non_existent', {
        headers: { authorization: ALICE_AUTH },
      });
      const res = await getOrderById(req, { params: Promise.resolve({ id: 'ord_non_existent' }) });
      expect(res.status).toBe(404);
    });

    it('returns 200 OK when customer reads their own placed order', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/orders/ord_alice_pending_1', {
        headers: { authorization: ALICE_AUTH },
      });
      const res = await getOrderById(req, { params: Promise.resolve({ id: 'ord_alice_pending_1' }) });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.id).toBe('ord_alice_pending_1');
      expect(json.data.customerId).toBe(CUSTOMER_ALICE_ID);
    });

    it('returns 403 Forbidden (OWNERSHIP_VIOLATION) when Customer B attempts to inspect Customer A\'s order', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/orders/ord_alice_pending_1', {
        headers: { authorization: BOB_AUTH },
      });
      const res = await getOrderById(req, { params: Promise.resolve({ id: 'ord_alice_pending_1' }) });
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.details.code).toBe('OWNERSHIP_VIOLATION');
    });

    it('returns 200 OK when merchant views order containing their fulfillment group', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/orders/ord_alice_pending_1', {
        headers: { authorization: WALTON_SELLER_AUTH },
      });
      const res = await getOrderById(req, { params: Promise.resolve({ id: 'ord_alice_pending_1' }) });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.id).toBe('ord_alice_pending_1');
    });

    it('returns 403 Forbidden (TENANT_VIOLATION) when merchant views order belonging to another store', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/orders/ord_alice_pending_1', {
        headers: { authorization: APEX_SELLER_AUTH },
      });
      const res = await getOrderById(req, { params: Promise.resolve({ id: 'ord_alice_pending_1' }) });
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.details.code).toBe('TENANT_VIOLATION');
    });
  });

  // ── 3. /api/v1/orders/[id]/cancel ───────────────────────────────────────────

  describe('Order Cancellation Self-Ownership & Invariants (/api/v1/orders/[id]/cancel)', () => {
    it('returns 403 Forbidden (OWNERSHIP_VIOLATION) when Bob tries to cancel Alice\'s order', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/orders/ord_alice_pending_1/cancel', {
        method: 'POST',
        headers: {
          authorization: BOB_AUTH,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ reason: 'Customer changed mind' }),
      });

      const res = await cancelOrder(req, { params: Promise.resolve({ id: 'ord_alice_pending_1' }) });
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.error.details.code).toBe('OWNERSHIP_VIOLATION');
    });

    it('returns 403 Forbidden when Alice tries to cancel an order already in DELIVERED status', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/orders/ord_alice_delivered_1/cancel', {
        method: 'POST',
        headers: {
          authorization: ALICE_AUTH,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ reason: 'Item unwanted' }),
      });

      const res = await cancelOrder(req, { params: Promise.resolve({ id: 'ord_alice_delivered_1' }) });
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.error.message).toContain("cannot be cancelled in 'DELIVERED'");
    });

    it('returns 200 OK when Alice cancels her own PENDING order', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/orders/ord_alice_pending_1/cancel', {
        method: 'POST',
        headers: {
          authorization: ALICE_AUTH,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ reason: 'Accidentally selected wrong quantity' }),
      });

      const res = await cancelOrder(req, { params: Promise.resolve({ id: 'ord_alice_pending_1' }) });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.status).toBe('CANCELLED');
    });
  });

  // ── 4. /api/v1/cart ─────────────────────────────────────────────────────────

  describe('Shopping Cart Self-Ownership (/api/v1/cart)', () => {
    it('returns 401 Unauthorized when unauthenticated', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/cart');
      const res = await getCart(req);
      expect(res.status).toBe(401);
    });

    it('returns 200 OK with active cart scoped to authenticated customer', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/cart', {
        headers: { authorization: ALICE_AUTH },
      });
      const res = await getCart(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.userId).toBe(CUSTOMER_ALICE_ID);
    });
  });

  // ── 5. /api/v1/cart/checkout ────────────────────────────────────────────────

  describe('Cart Checkout Ownership Enforcement (/api/v1/cart/checkout)', () => {
    it('returns 403 Forbidden (OWNERSHIP_VIOLATION) when Alice attempts to check out Bob\'s cart', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/cart/checkout', {
        method: 'POST',
        headers: {
          authorization: ALICE_AUTH,
          'content-type': 'application/json',
          'Idempotency-Key': 'cross-user-checkout-1',
        },
        body: JSON.stringify({
          cartId: 'crt_bob_1', // Bob's cart!
          checkout: {
            shippingName: 'Alice Khan',
            shippingPhone: '+8801700112233',
            shippingDivision: 'DHAKA',
            shippingDistrict: 'Dhaka',
            shippingAddress: 'House 1, Road 2, Banani',
          },
        }),
      });

      const res = await checkoutCart(req);
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.error.details.code).toBe('OWNERSHIP_VIOLATION');
    });
  });
});
