import { describe, it, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import * as authzModule from '@/shared/authz';
import { POST as cartCheckoutRoute } from '@/app/api/v1/cart/checkout/route';
import { POST as mobileCheckoutRoute } from '@/app/api/v1/checkout/route';
import { checkoutOrchestratorService } from '@/features/checkout';
import { NextRequest } from 'next/server';

describe('Milestone 131: Checkout Orchestration REST API Integration Tests', () => {
  let authSpy: any;
  let checkoutSpy: any;

  const customerActor = {
    userId: 'usr_customer_01',
    roles: ['CUSTOMER'],
    permissions: [],
    sellerId: null,
  };

  const mockCheckoutResult = {
    orderId: 'ord_202610_001',
    orderNumber: 'ORD-20261014-ABCDEF1234',
    customerId: 'usr_customer_01',
    status: 'PENDING_PAYMENT',
    paymentStatus: 'UNPAID',
    fulfillmentStatus: 'UNFULFILLED',
    currency: 'BDT' as const,
    subtotalPoisha: 3700000,
    discountPoisha: 0,
    shippingFeePoisha: 0,
    taxPoisha: 0,
    totalPoisha: 3700000,
    totalBdtFormatted: '৳37,000.00',
    totalProductPoints: 300,
    isB2B: false,
    b2bQuoteId: null,
    purchaseOrderRef: null,
    fulfillmentGroupsCount: 1,
    createdAt: new Date().toISOString(),
    isIdempotentReplay: false,
  };

  beforeEach(() => {
    authSpy = spyOn(authzModule, 'authenticateRequest').mockReturnValue(customerActor as any);

    checkoutSpy = spyOn(checkoutOrchestratorService, 'executeCheckout').mockResolvedValue(
      mockCheckoutResult as any
    );
  });

  afterEach(() => {
    authSpy?.mockRestore();
    checkoutSpy?.mockRestore();
  });

  it('POST /api/v1/cart/checkout creates order with Idempotency-Key header', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/cart/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': 'idemp-test-key-12345',
      },
      body: JSON.stringify({
        cartId: 'crt_user_01',
        checkout: {
          shippingName: 'Rahim Ahmed',
          shippingPhone: '01711223344',
          shippingDivision: 'DHAKA',
          shippingDistrict: 'Dhaka',
          shippingAddress: 'House 42, Road 11, Banani',
        },
      }),
    });

    const res = await cartCheckoutRoute(req);
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.orderNumber).toBe('ORD-20261014-ABCDEF1234');
    expect(body.data.totalProductPoints).toBe(300);
    expect(body.data.isIdempotentReplay).toBe(false);
  });

  it('POST /api/v1/checkout supports mobile client checkout', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': 'idemp-mobile-key-67890',
      },
      body: JSON.stringify({
        cartId: 'crt_user_01',
        checkout: {
          shippingName: 'Rahim Ahmed',
          shippingPhone: '01711223344',
          shippingDivision: 'DHAKA',
          shippingDistrict: 'Dhaka',
          shippingAddress: 'House 42, Road 11, Banani',
        },
      }),
    });

    const res = await mobileCheckoutRoute(req);
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('POST /api/v1/cart/checkout returns 200 on idempotent replay', async () => {
    spyOn(checkoutOrchestratorService, 'executeCheckout').mockResolvedValue({
      ...mockCheckoutResult,
      isIdempotentReplay: true,
    } as any);

    const req = new NextRequest('http://localhost:3000/api/v1/cart/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': 'idemp-test-key-12345',
      },
      body: JSON.stringify({
        cartId: 'crt_user_01',
        checkout: {
          shippingName: 'Rahim Ahmed',
          shippingPhone: '01711223344',
          shippingDivision: 'DHAKA',
          shippingDistrict: 'Dhaka',
          shippingAddress: 'House 42, Road 11, Banani',
        },
      }),
    });

    const res = await cartCheckoutRoute(req);
    expect(res.status).toBe(200); // 200 on idempotent replay

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.isIdempotentReplay).toBe(true);
  });

  it('POST /api/v1/cart/checkout throws 422 if Idempotency-Key header is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/cart/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cartId: 'crt_user_01',
        checkout: {
          shippingName: 'Rahim Ahmed',
          shippingPhone: '01711223344',
          shippingDivision: 'DHAKA',
          shippingDistrict: 'Dhaka',
          shippingAddress: 'Banani',
        },
      }),
    });

    const res = await cartCheckoutRoute(req);
    expect(res.status).toBe(422);

    const body = await res.json();
    expect(body.success).toBe(false);
  });
});
