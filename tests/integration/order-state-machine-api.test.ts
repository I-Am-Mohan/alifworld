/**
 * Milestone 142: Order & Fulfillment State Machine API Integration Tests
 *
 * Verifies:
 * 1. PATCH /api/v1/orders/[id]/status — order status transitions
 * 2. PATCH /api/v1/seller/orders/[groupId]/status — fulfillment group transitions
 * 3. Invalid transitions return 409 Conflict
 * 4. Actor role permission enforcement (403)
 * 5. Non-seller access denied for fulfillment endpoints
 * 6. Transition validators schema enforcement (422)
 */

import { describe, it, expect, spyOn, afterEach } from 'bun:test';
import { NextRequest } from 'next/server';
import * as authzModule from '@/shared/authz';
import { PATCH as transitionOrderRoute } from '@/app/api/v1/orders/[id]/status/route';
import { PATCH as transitionFulfillmentRoute } from '@/app/api/v1/seller/orders/[groupId]/status/route';
import { orderTransitionService } from '@/features/orders/state-machines/order-transition.service';
import { ConflictError, AuthorizationError, NotFoundError } from '@/shared/errors/app-error';

const adminActor = {
  userId: 'usr_admin_01',
  roles: ['ADMIN'],
  permissions: ['orders:manage'],
  sellerId: null,
};

const customerActor = {
  userId: 'usr_customer_01',
  roles: ['CUSTOMER'],
  permissions: ['orders:read', 'orders:cancel'],
  sellerId: null,
};

const sellerActor = {
  userId: 'usr_seller_01',
  roles: ['SELLER'],
  permissions: ['seller:orders:manage'],
  sellerId: 'sel_dhaka_tech_01',
};

describe('Milestone 142: State Machine API Integration Tests', () => {
  let authSpy: ReturnType<typeof spyOn>;

  afterEach(() => {
    authSpy?.mockRestore();
  });

  // ─── 1. PATCH /api/v1/orders/[id]/status ───
  describe('1. Order Status Transition API', () => {
    it('rejects missing replay keys before calling either mutation service', async () => {
      authSpy = spyOn(authzModule, 'authenticateRequest').mockReturnValue({
        ...adminActor,
        sellerId: sellerActor.sellerId,
      } as any);
      const orderSpy = spyOn(orderTransitionService, 'transitionOrderStatus');
      const groupSpy = spyOn(orderTransitionService, 'transitionFulfillmentGroupStatus');
      try {
        const orderResponse = await transitionOrderRoute(
          new NextRequest('http://localhost:3000/api/v1/orders/order-1/status', {
            method: 'PATCH',
            body: JSON.stringify({ nextStatus: 'CONFIRMED' }),
          }),
          { params: Promise.resolve({ id: 'order-1' }) }
        );
        const groupResponse = await transitionFulfillmentRoute(
          new NextRequest('http://localhost:3000/api/v1/seller/orders/group-1/status', {
            method: 'PATCH',
            body: JSON.stringify({ nextStatus: 'ACCEPTED' }),
          }),
          { params: Promise.resolve({ groupId: 'group-1' }) }
        );
        expect(orderResponse.status).toBe(422);
        expect(groupResponse.status).toBe(422);
        expect(orderSpy).not.toHaveBeenCalled();
        expect(groupSpy).not.toHaveBeenCalled();
      } finally {
        orderSpy.mockRestore();
        groupSpy.mockRestore();
      }
    });
    it('rejects an admin without order-management permission before calling the service', async () => {
      authSpy = spyOn(authzModule, 'authenticateRequest').mockReturnValue({
        ...adminActor,
        permissions: [],
      } as any);
      const transitionSpy = spyOn(orderTransitionService, 'transitionOrderStatus');
      try {
        const req = new NextRequest('http://localhost:3000/api/v1/orders/ord_test_001/status', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nextStatus: 'CONFIRMED' }),
        });
        const response = await transitionOrderRoute(req, {
          params: Promise.resolve({ id: 'ord_test_001' }),
        });
        expect(response.status).toBe(403);
        expect(transitionSpy).not.toHaveBeenCalled();
      } finally {
        transitionSpy.mockRestore();
      }
    });
    it('transitions order status with valid input (ADMIN)', async () => {
      authSpy = spyOn(authzModule, 'authenticateRequest').mockReturnValue(adminActor as any);
      const transitionSpy = spyOn(
        orderTransitionService,
        'transitionOrderStatus'
      ).mockResolvedValue({
        success: true,
        previousStatus: 'PROCESSING',
        newStatus: 'CONFIRMED',
        statusLabelEn: 'Confirmed',
        statusLabelBn: 'নিশ্চিত করা হয়েছে',
        transitionedAt: '2026-09-22T12:00:00.000Z',
      });

      const req = new NextRequest('http://localhost:3000/api/v1/orders/ord_test_001/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'order-confirm-1' },
        body: JSON.stringify({ nextStatus: 'CONFIRMED', reason: 'Payment verified by admin' }),
      });

      const res = await transitionOrderRoute(req, {
        params: Promise.resolve({ id: 'ord_test_001' }),
      });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.previousStatus).toBe('PROCESSING');
      expect(body.data.newStatus).toBe('CONFIRMED');
      expect(body.data.statusLabelEn).toBe('Confirmed');
      expect(body.data.statusLabelBn).toMatch(/[\u0980-\u09FF]/);
      expect(transitionSpy.mock.calls[0][0].idempotencyKey).toBe('order-confirm-1');

      transitionSpy.mockRestore();
    });

    it('returns 409 for invalid transition', async () => {
      authSpy = spyOn(authzModule, 'authenticateRequest').mockReturnValue(adminActor as any);
      const transitionSpy = spyOn(
        orderTransitionService,
        'transitionOrderStatus'
      ).mockRejectedValue(
        new ConflictError("Invalid order transition from 'PENDING_PAYMENT' to 'DELIVERED'.", {
          code: 'INVALID_TRANSITION',
        })
      );

      const req = new NextRequest('http://localhost:3000/api/v1/orders/ord_test_001/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'delivery-invalid' },
        body: JSON.stringify({ nextStatus: 'DELIVERED' }),
      });

      const res = await transitionOrderRoute(req, {
        params: Promise.resolve({ id: 'ord_test_001' }),
      });
      expect(res.status).toBe(409);

      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('CONFLICT');

      transitionSpy.mockRestore();
    });

    it('returns 403 when actor role is not permitted for transition', async () => {
      authSpy = spyOn(authzModule, 'authenticateRequest').mockReturnValue(customerActor as any);
      const transitionSpy = spyOn(
        orderTransitionService,
        'transitionOrderStatus'
      ).mockRejectedValue(
        new AuthorizationError("Role 'CUSTOMER' is not permitted to transition order.", {
          code: 'ACTOR_NOT_PERMITTED',
        })
      );

      const req = new NextRequest('http://localhost:3000/api/v1/orders/ord_test_001/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'missing-order-confirm' },
        body: JSON.stringify({ nextStatus: 'CONFIRMED' }),
      });

      const res = await transitionOrderRoute(req, {
        params: Promise.resolve({ id: 'ord_test_001' }),
      });
      expect(res.status).toBe(403);

      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('FORBIDDEN');

      transitionSpy.mockRestore();
    });

    it('returns 422 for invalid nextStatus value', async () => {
      authSpy = spyOn(authzModule, 'authenticateRequest').mockReturnValue(adminActor as any);

      const req = new NextRequest('http://localhost:3000/api/v1/orders/ord_test_001/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nextStatus: 'INVENTED_STATUS' }),
      });

      const res = await transitionOrderRoute(req, {
        params: Promise.resolve({ id: 'ord_test_001' }),
      });
      expect(res.status).toBe(422);

      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_FAILED');
    });

    it('returns 404 when order does not exist', async () => {
      authSpy = spyOn(authzModule, 'authenticateRequest').mockReturnValue(adminActor as any);
      const transitionSpy = spyOn(
        orderTransitionService,
        'transitionOrderStatus'
      ).mockRejectedValue(new NotFoundError("Order 'ord_missing' not found."));

      const req = new NextRequest('http://localhost:3000/api/v1/orders/ord_missing/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'missing-order-confirm' },
        body: JSON.stringify({ nextStatus: 'CONFIRMED' }),
      });

      const res = await transitionOrderRoute(req, {
        params: Promise.resolve({ id: 'ord_missing' }),
      });
      expect(res.status).toBe(404);

      transitionSpy.mockRestore();
    });
  });

  // ─── 2. PATCH /api/v1/seller/orders/[groupId]/status ───
  describe('2. Fulfillment Group Status Transition API', () => {
    it.each(['SELLER_OWNER', 'SELLER_STAFF'])(
      'maps canonical %s to the seller transition policy',
      async (role) => {
        authSpy = spyOn(authzModule, 'authenticateRequest').mockReturnValue({
          ...sellerActor,
          roles: [role],
        } as any);
        const transitionSpy = spyOn(
          orderTransitionService,
          'transitionFulfillmentGroupStatus'
        ).mockResolvedValue({
          success: true,
          previousStatus: 'PENDING',
          newStatus: 'ACCEPTED',
          statusLabelEn: 'Accepted',
          statusLabelBn: 'Accepted',
          transitionedAt: '2026-09-29T00:00:00.000Z',
        });
        try {
          const response = await transitionFulfillmentRoute(
            new NextRequest('http://localhost:3000/api/v1/seller/orders/group-1/status', {
              method: 'PATCH',
              headers: { 'Idempotency-Key': `role:${role}` },
              body: JSON.stringify({ nextStatus: 'ACCEPTED' }),
            }),
            { params: Promise.resolve({ groupId: 'group-1' }) }
          );
          expect(response.status).toBe(200);
          expect(transitionSpy.mock.calls[0][0].actorRole).toBe('SELLER');
        } finally {
          transitionSpy.mockRestore();
        }
      }
    );
    it('transitions fulfillment group with valid input (SELLER)', async () => {
      authSpy = spyOn(authzModule, 'authenticateRequest').mockReturnValue(sellerActor as any);
      const transitionSpy = spyOn(
        orderTransitionService,
        'transitionFulfillmentGroupStatus'
      ).mockResolvedValue({
        success: true,
        previousStatus: 'PENDING',
        newStatus: 'ACCEPTED',
        statusLabelEn: 'Accepted by Seller',
        statusLabelBn: 'বিক্রেতা কর্তৃক গৃহীত',
        transitionedAt: '2026-09-22T12:00:00.000Z',
        parentOrderStatusChanged: false,
      });

      const req = new NextRequest(
        'http://localhost:3000/api/v1/seller/orders/sfg_test_001/status',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'accept-group-1' },
          body: JSON.stringify({ nextStatus: 'ACCEPTED', reason: 'Order accepted for processing' }),
        }
      );

      const res = await transitionFulfillmentRoute(req, {
        params: Promise.resolve({ groupId: 'sfg_test_001' }),
      });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.newStatus).toBe('ACCEPTED');
      expect(body.data.parentOrderStatusChanged).toBe(false);

      // Verify service was called with correct sellerId
      expect(transitionSpy.mock.calls[0][0].sellerId).toBe('sel_dhaka_tech_01');

      transitionSpy.mockRestore();
    });

    it('returns parent order status change when all groups delivered', async () => {
      authSpy = spyOn(authzModule, 'authenticateRequest').mockReturnValue({
        ...adminActor,
        sellerId: sellerActor.sellerId,
      } as any);
      const transitionSpy = spyOn(
        orderTransitionService,
        'transitionFulfillmentGroupStatus'
      ).mockResolvedValue({
        success: true,
        previousStatus: 'IN_TRANSIT',
        newStatus: 'DELIVERED',
        statusLabelEn: 'Delivered',
        statusLabelBn: 'ডেলিভারি সম্পন্ন',
        transitionedAt: '2026-09-22T16:00:00.000Z',
        parentOrderStatusChanged: true,
        derivedOrderStatus: 'DELIVERED',
      });

      const req = new NextRequest(
        'http://localhost:3000/api/v1/seller/orders/sfg_test_001/status',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'deliver-group-1' },
          body: JSON.stringify({ nextStatus: 'DELIVERED' }),
        }
      );

      const res = await transitionFulfillmentRoute(req, {
        params: Promise.resolve({ groupId: 'sfg_test_001' }),
      });
      const body = await res.json();

      expect(body.data.parentOrderStatusChanged).toBe(true);
      expect(body.data.derivedOrderStatus).toBe('DELIVERED');

      transitionSpy.mockRestore();
    });

    it('returns 403 when non-seller tries to transition fulfillment group', async () => {
      authSpy = spyOn(authzModule, 'authenticateRequest').mockReturnValue(customerActor as any);

      const req = new NextRequest(
        'http://localhost:3000/api/v1/seller/orders/sfg_test_001/status',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nextStatus: 'ACCEPTED' }),
        }
      );

      const res = await transitionFulfillmentRoute(req, {
        params: Promise.resolve({ groupId: 'sfg_test_001' }),
      });
      expect(res.status).toBe(403);

      const body = await res.json();
      expect(body.error.code).toBe('FORBIDDEN');
    });

    it('returns 403 TENANT_VIOLATION when seller accesses another seller group', async () => {
      authSpy = spyOn(authzModule, 'authenticateRequest').mockReturnValue(sellerActor as any);
      const transitionSpy = spyOn(
        orderTransitionService,
        'transitionFulfillmentGroupStatus'
      ).mockRejectedValue(
        new AuthorizationError(
          "Tenant access violation: you do not have permission to manage another seller's fulfillment group.",
          { code: 'TENANT_VIOLATION' }
        )
      );

      const req = new NextRequest(
        'http://localhost:3000/api/v1/seller/orders/sfg_other_seller/status',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'wrong-tenant-group' },
          body: JSON.stringify({ nextStatus: 'ACCEPTED' }),
        }
      );

      const res = await transitionFulfillmentRoute(req, {
        params: Promise.resolve({ groupId: 'sfg_other_seller' }),
      });
      expect(res.status).toBe(403);

      transitionSpy.mockRestore();
    });

    it('returns 422 for invalid fulfillment status value', async () => {
      authSpy = spyOn(authzModule, 'authenticateRequest').mockReturnValue(sellerActor as any);

      const req = new NextRequest(
        'http://localhost:3000/api/v1/seller/orders/sfg_test_001/status',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nextStatus: 'NONEXISTENT' }),
        }
      );

      const res = await transitionFulfillmentRoute(req, {
        params: Promise.resolve({ groupId: 'sfg_test_001' }),
      });
      expect(res.status).toBe(422);
    });

    it('returns 409 for transition from terminal state', async () => {
      authSpy = spyOn(authzModule, 'authenticateRequest').mockReturnValue(sellerActor as any);
      const transitionSpy = spyOn(
        orderTransitionService,
        'transitionFulfillmentGroupStatus'
      ).mockRejectedValue(
        new ConflictError(
          "Fulfillment group is in terminal state 'DELIVERED' and cannot be transitioned.",
          { code: 'TERMINAL_STATE' }
        )
      );

      const req = new NextRequest(
        'http://localhost:3000/api/v1/seller/orders/sfg_test_001/status',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'terminal-group-1' },
          body: JSON.stringify({ nextStatus: 'PENDING' }),
        }
      );

      const res = await transitionFulfillmentRoute(req, {
        params: Promise.resolve({ groupId: 'sfg_test_001' }),
      });
      expect(res.status).toBe(409);

      transitionSpy.mockRestore();
    });
  });

  // ─── 3. Validator Schema Enforcement ───
  describe('3. Transition Validator Schema Enforcement', () => {
    it('rejects missing nextStatus field for order transition', async () => {
      authSpy = spyOn(authzModule, 'authenticateRequest').mockReturnValue(adminActor as any);

      const req = new NextRequest('http://localhost:3000/api/v1/orders/ord_test_001/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const res = await transitionOrderRoute(req, {
        params: Promise.resolve({ id: 'ord_test_001' }),
      });
      expect(res.status).toBe(422);
    });

    it('rejects invalid JSON body', async () => {
      authSpy = spyOn(authzModule, 'authenticateRequest').mockReturnValue(adminActor as any);

      const req = new NextRequest('http://localhost:3000/api/v1/orders/ord_test_001/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: 'not-json{{{',
      });

      const res = await transitionOrderRoute(req, {
        params: Promise.resolve({ id: 'ord_test_001' }),
      });
      expect(res.status).toBe(422);
    });
  });
});
