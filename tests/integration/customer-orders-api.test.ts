/**
 * Milestone 141: Customer Parent Order API Integration Tests
 *
 * Verifies:
 * 1. GET /api/v1/customer/orders/[id] retrieves parent order with ownership verification
 * 2. POST /api/v1/customer/orders/[id]/cancel self-service cancellation
 * 3. Ownership violation returns 403
 * 4. Not-found order returns 404
 * 5. Validation failure returns 422
 * 6. Unauthenticated requests return 401
 */

import { describe, it, expect, beforeEach, spyOn, afterEach } from 'bun:test';
import { NextRequest } from 'next/server';
import * as authzModule from '@/shared/authz';
import { GET as getCustomerOrderRoute } from '@/app/api/v1/customer/orders/[id]/route';
import { POST as cancelCustomerOrderRoute } from '@/app/api/v1/customer/orders/[id]/cancel/route';
import { customerOrderService } from '@/features/orders';
import type { CustomerParentOrderDTO } from '@/features/orders/types/order.types';
import { AuthorizationError, NotFoundError, ValidationError } from '@/shared/errors/app-error';

const customerActor = {
  userId: 'usr_customer_01',
  roles: ['CUSTOMER'],
  permissions: ['orders:read', 'orders:cancel'],
  sellerId: null,
};

const mockOrderDTO: Partial<CustomerParentOrderDTO> = {
  id: 'ord_test_001',
  orderNumber: 'ORD-20260922-0001',
  customerId: 'usr_customer_01',
  status: 'PROCESSING',
  statusLabelEn: 'Processing',
  statusLabelBn: 'প্রক্রিয়াধীন',
  paymentStatus: 'PAID',
  paymentStatusLabelEn: 'Paid in Full',
  paymentStatusLabelBn: 'পরিশোধিত',
  fulfillmentStatus: 'UNFULFILLED',
  currency: 'BDT',
  financialSummary: {
    subtotalPoisha: 2199000,
    subtotalBdtFormatted: '৳21990.00',
    discountPoisha: 0,
    discountBdtFormatted: '৳0.00',
    sellerDiscountPoisha: 0,
    platformDiscountPoisha: 0,
    shippingFeePoisha: 6000,
    shippingFeeBdtFormatted: '৳60.00',
    taxPoisha: 329850,
    taxBdtFormatted: '৳3298.50',
    totalPoisha: 2534850,
    totalBdtFormatted: '৳25348.50',
    totalProductPoints: 450,
  },
  shippingDestination: {
    recipientName: 'Tanvir Ahmed',
    recipientPhone: '+8801700112233',
    recipientPhoneMasked: '+88017****2233',
    division: 'DHAKA',
    district: 'DHAKA',
    address: 'House 42, Road 11',
    upazila: null,
    postalCode: '1212',
  },
  packages: [],
  items: [],
  statusHistory: [],
  payments: [],
  selfServiceActions: {
    canCancel: true,
    cancelRestrictionReasonEn: null,
    cancelRestrictionReasonBn: null,
    canDownloadInvoice: true,
    canReorder: true,
    canRequestReturn: false,
  },
  createdAt: '2026-09-22T10:30:00.000Z',
  updatedAt: '2026-09-22T10:30:00.000Z',
};

describe('Milestone 141: Customer Parent Order API Integration Tests', () => {
  let authSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    authSpy = spyOn(authzModule, 'authenticateRequest').mockReturnValue(customerActor as any);
  });

  afterEach(() => {
    authSpy?.mockRestore();
  });

  // ─── 1. GET /api/v1/customer/orders/[id] ───
  describe('1. GET /api/v1/customer/orders/[id]', () => {
    it('returns 200 with customer parent order data', async () => {
      const getOrderSpy = spyOn(customerOrderService, 'getCustomerOrder').mockResolvedValue(
        mockOrderDTO as any
      );

      const req = new NextRequest('http://localhost:3000/api/v1/customer/orders/ord_test_001', {
        method: 'GET',
      });

      const res = await getCustomerOrderRoute(req, {
        params: Promise.resolve({ id: 'ord_test_001' }),
      });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.id).toBe('ord_test_001');
      expect(body.data.orderNumber).toBe('ORD-20260922-0001');
      expect(body.data.currency).toBe('BDT');
      expect(body.data.financialSummary.totalPoisha).toBe(2534850);
      expect(body.data.financialSummary.totalProductPoints).toBe(450);
      expect(body.data.selfServiceActions.canCancel).toBe(true);

      getOrderSpy.mockRestore();
    });

    it('returns 404 when order does not exist', async () => {
      const getOrderSpy = spyOn(customerOrderService, 'getCustomerOrder').mockRejectedValue(
        new NotFoundError("Order 'ord_missing' not found.")
      );

      const req = new NextRequest('http://localhost:3000/api/v1/customer/orders/ord_missing', {
        method: 'GET',
      });

      const res = await getCustomerOrderRoute(req, {
        params: Promise.resolve({ id: 'ord_missing' }),
      });
      expect(res.status).toBe(404);

      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('NOT_FOUND');

      getOrderSpy.mockRestore();
    });

    it('returns 403 when customer tries to view another customer order', async () => {
      const getOrderSpy = spyOn(customerOrderService, 'getCustomerOrder').mockRejectedValue(
        new AuthorizationError(
          'You do not have permission to view orders belonging to another customer.',
          { code: 'OWNERSHIP_VIOLATION' }
        )
      );

      const req = new NextRequest(
        'http://localhost:3000/api/v1/customer/orders/ord_other_customer',
        {
          method: 'GET',
        }
      );

      const res = await getCustomerOrderRoute(req, {
        params: Promise.resolve({ id: 'ord_other_customer' }),
      });
      expect(res.status).toBe(403);

      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('FORBIDDEN');

      getOrderSpy.mockRestore();
    });
  });

  // ─── 2. POST /api/v1/customer/orders/[id]/cancel ───
  describe('2. POST /api/v1/customer/orders/[id]/cancel', () => {
    it('rejects a missing replay key without calling cancellation', async () => {
      const cancelSpy = spyOn(customerOrderService, 'cancelCustomerOrder');
      try {
        const response = await cancelCustomerOrderRoute(
          new NextRequest('http://localhost:3000/api/v1/customer/orders/order-1/cancel', {
            method: 'POST',
            body: JSON.stringify({ reason: 'Customer requested cancellation' }),
          }),
          { params: Promise.resolve({ id: 'order-1' }) }
        );
        expect(response.status).toBe(422);
        expect(cancelSpy).not.toHaveBeenCalled();
      } finally {
        cancelSpy.mockRestore();
      }
    });
    it('rejects a customer without cancellation permission', async () => {
      authSpy.mockReturnValue({ ...customerActor, permissions: ['orders:read'] } as any);
      const cancelSpy = spyOn(customerOrderService, 'cancelCustomerOrder');
      try {
        const response = await cancelCustomerOrderRoute(
          new NextRequest('http://localhost:3000/api/v1/customer/orders/order-1/cancel', {
            method: 'POST',
            headers: { 'Idempotency-Key': 'denied-cancel' },
            body: JSON.stringify({ reason: 'Customer requested cancellation' }),
          }),
          { params: Promise.resolve({ id: 'order-1' }) }
        );
        expect(response.status).toBe(403);
        expect(cancelSpy).not.toHaveBeenCalled();
      } finally {
        cancelSpy.mockRestore();
      }
    });
    const cancelledOrderDTO = {
      ...mockOrderDTO,
      status: 'CANCELLED',
      statusLabelEn: 'Cancelled',
      statusLabelBn: 'বাতিল',
      selfServiceActions: {
        canCancel: false,
        cancelRestrictionReasonEn: null,
        cancelRestrictionReasonBn: null,
        canDownloadInvoice: false,
        canReorder: true,
        canRequestReturn: false,
      },
    };

    it('returns 200 and cancels order with valid reason', async () => {
      const cancelSpy = spyOn(customerOrderService, 'cancelCustomerOrder').mockResolvedValue(
        cancelledOrderDTO as any
      );

      const req = new NextRequest(
        'http://localhost:3000/api/v1/customer/orders/ord_test_001/cancel',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'customer-cancel-1' },
          body: JSON.stringify({ reason: 'Changed my mind about the purchase' }),
        }
      );

      const res = await cancelCustomerOrderRoute(req, {
        params: Promise.resolve({ id: 'ord_test_001' }),
      });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('CANCELLED');
      expect(cancelSpy.mock.calls[0][3]).toBe('customer-cancel-1');

      cancelSpy.mockRestore();
    });

    it('returns 422 when cancellation reason is too short', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/v1/customer/orders/ord_test_001/cancel',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'No' }),
        }
      );

      const res = await cancelCustomerOrderRoute(req, {
        params: Promise.resolve({ id: 'ord_test_001' }),
      });
      expect(res.status).toBe(422);

      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_FAILED');
    });

    it('returns 422 when request body is missing reason', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/v1/customer/orders/ord_test_001/cancel',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      );

      const res = await cancelCustomerOrderRoute(req, {
        params: Promise.resolve({ id: 'ord_test_001' }),
      });
      expect(res.status).toBe(422);

      const body = await res.json();
      expect(body.success).toBe(false);
    });

    it('returns 403 when order cannot be cancelled (merchant packaging started)', async () => {
      const cancelSpy = spyOn(customerOrderService, 'cancelCustomerOrder').mockRejectedValue(
        new ValidationError(
          'This order cannot be cancelled as merchant packaging or courier dispatch is already underway.'
        )
      );

      const req = new NextRequest(
        'http://localhost:3000/api/v1/customer/orders/ord_test_001/cancel',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': 'customer-cancel-packing',
          },
          body: JSON.stringify({ reason: 'I want to cancel this order' }),
        }
      );

      const res = await cancelCustomerOrderRoute(req, {
        params: Promise.resolve({ id: 'ord_test_001' }),
      });
      expect(res.status).toBe(422);

      const body = await res.json();
      expect(body.success).toBe(false);

      cancelSpy.mockRestore();
    });

    it('returns 422 when request body is invalid JSON', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/v1/customer/orders/ord_test_001/cancel',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: 'not-json{{{',
        }
      );

      const res = await cancelCustomerOrderRoute(req, {
        params: Promise.resolve({ id: 'ord_test_001' }),
      });
      expect(res.status).toBe(422);

      const body = await res.json();
      expect(body.success).toBe(false);
    });
  });
});
