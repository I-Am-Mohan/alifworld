import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
afterEach(() => mock.restore());
import * as authzModule from '@/shared/authz';
import {
  POST as applyCouponRoute,
  DELETE as removeCouponRoute,
} from '@/app/api/v1/cart/coupons/route';
import { POST as revalidateCartRoute } from '@/app/api/v1/cart/revalidate/route';
import { cartService } from '@/features/cart/services/cart.service';
import { NextRequest } from 'next/server';

describe('Milestone 129: Cart Coupons & Revalidation REST API Integration Tests', () => {
  const customerActor = {
    userId: 'usr_customer_01',
    roles: ['CUSTOMER'],
    permissions: [],
    sellerId: null,
  };

  const mockCart = {
    id: 'crt_user_01',
    userId: 'usr_customer_01',
    isGuest: false,
    guestCartToken: null,
    currency: 'BDT' as const,
    status: 'ACTIVE' as const,
    couponCode: 'WELCOME10',
    notes: null,
    isB2B: false,
    b2bQuoteId: null,
    purchaseOrderRef: null,
    items: [],
    itemsCount: 1,
    subtotalPoisha: 1850000,
    subtotalBdtFormatted: '৳18,500.00',
    totalProductPoints: 150,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockRevalidationResult = {
    cart: mockCart,
    hasChanges: false,
    isReadyForCheckout: true,
    priceChangesCount: 0,
    outOfStockCount: 0,
    priceChanges: [],
    stockAdjustments: [],
    couponStatus: {
      applied: true,
      couponCode: 'WELCOME10',
      discountPoisha: 185000,
      discountBdtFormatted: '৳1,850.00',
      reason: null,
    },
    sellerIssues: [],
    warnings: [],
  };

  beforeEach(() => {
    spyOn(authzModule, 'authenticateRequest').mockReturnValue(customerActor as any);

    spyOn(cartService, 'applyCoupon').mockResolvedValue(mockRevalidationResult as any);

    spyOn(cartService, 'removeCoupon').mockResolvedValue({
      ...mockRevalidationResult,
      cart: { ...mockCart, couponCode: null },
      couponStatus: {
        applied: false,
        couponCode: null,
        discountPoisha: 0,
        discountBdtFormatted: '৳0.00',
        reason: null,
      },
    } as any);

    spyOn(cartService, 'revalidateCart').mockResolvedValue(mockRevalidationResult as any);
  });

  it('POST /api/v1/cart/coupons applies coupon and calculates discount', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/cart/coupons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ couponCode: 'WELCOME10' }),
    });
    const res = await applyCouponRoute(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.couponStatus.applied).toBe(true);
    expect(body.data.couponStatus.discountPoisha).toBe(185000);
    expect(body.data.couponStatus.discountBdtFormatted).toBe('৳1,850.00');
  });

  it('DELETE /api/v1/cart/coupons removes applied coupon from cart', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/cart/coupons', {
      method: 'DELETE',
    });
    const res = await removeCouponRoute(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.couponStatus.applied).toBe(false);
  });

  it('POST /api/v1/cart/revalidate performs multi-dimensional check', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/cart/revalidate', {
      method: 'POST',
    });
    const res = await revalidateCartRoute(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.isReadyForCheckout).toBe(true);
  });
});
