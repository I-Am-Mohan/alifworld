import { describe, it, expect, beforeEach, spyOn } from 'bun:test';
import * as authzModule from '@/shared/authz';
import {
  GET as getCartRoute,
  POST as addItemRoute,
  DELETE as clearCartRoute,
} from '@/app/api/v1/cart/route';
import {
  PATCH as updateItemRoute,
  DELETE as removeItemRoute,
} from '@/app/api/v1/cart/items/[itemId]/route';
import { POST as mergeCartRoute } from '@/app/api/v1/cart/merge/route';
import { POST as revalidateCartRoute } from '@/app/api/v1/cart/revalidate/route';
import { cartService } from '@/features/cart/services/cart.service';
import { NextRequest } from 'next/server';

describe('Milestone 127: Cart & Safe Merge REST API Integration Tests', () => {
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
    couponCode: null,
    notes: null,
    isB2B: false,
    b2bQuoteId: null,
    purchaseOrderRef: null,
    items: [
      {
        id: 'cit_101',
        cartId: 'crt_user_01',
        variantId: 'var_phone_blue',
        sellerId: 'sel_walton_01',
        sellerName: 'Walton Official Store',
        productTitle: 'Walton Primo S8 Pro',
        variantTitle: 'Ocean Blue (8GB/128GB)',
        sku: 'WLT-S8-BLU',
        quantity: 2,
        pricePoisha: 1850000,
        priceBdtFormatted: '৳18,500.00',
        productPoint: 150,
        subtotalPoisha: 3700000,
        subtotalBdtFormatted: '৳37,000.00',
        totalProductPoints: 300,
        inStock: true,
      },
    ],
    itemsCount: 2,
    subtotalPoisha: 3700000,
    subtotalBdtFormatted: '৳37,000.00',
    totalProductPoints: 300,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockGuestCart = {
    ...mockCart,
    id: 'crt_gst_9988',
    userId: null,
    isGuest: true,
    guestCartToken: 'crt_gst_9988',
  };

  beforeEach(() => {
    spyOn(authzModule, 'authenticateRequest').mockReturnValue(customerActor as any);

    spyOn(cartService, 'getCart').mockResolvedValue(mockCart);

    spyOn(cartService, 'addItem').mockResolvedValue({
      cart: mockCart,
      guestCartToken: undefined,
    });

    spyOn(cartService, 'updateItemQuantity').mockResolvedValue({
      ...mockCart,
      items: [{ ...mockCart.items[0], quantity: 3 }],
      itemsCount: 3,
    });

    spyOn(cartService, 'removeItem').mockResolvedValue({
      ...mockCart,
      items: [],
      itemsCount: 0,
      subtotalPoisha: 0,
    });

    spyOn(cartService, 'clearCart').mockResolvedValue({
      ...mockCart,
      items: [],
      itemsCount: 0,
      subtotalPoisha: 0,
    });

    spyOn(cartService, 'mergeGuestCart').mockResolvedValue({
      userCart: mockCart,
      guestCartId: 'crt_gst_9988',
      mergedItemsCount: 2,
      warnings: [],
    });

    spyOn(cartService, 'revalidateCart').mockResolvedValue({
      cart: mockCart,
      hasChanges: false,
      priceChangesCount: 0,
      outOfStockCount: 0,
      warnings: [],
    });
  });

  it('GET /api/v1/cart retrieves authenticated customer active cart', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/cart');
    const res = await getCartRoute(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe('crt_user_01');
    expect(body.data.items.length).toBe(1);
    expect(body.data.totalProductPoints).toBe(300);
  });

  it('GET /api/v1/cart with x-guest-cart-token retrieves guest cart', async () => {
    spyOn(authzModule, 'authenticateRequest').mockImplementation(() => {
      throw new Error('Unauthenticated');
    });
    spyOn(cartService, 'getCart').mockResolvedValue(mockGuestCart);

    const req = new NextRequest('http://localhost:3000/api/v1/cart', {
      headers: { 'x-guest-cart-token': 'crt_gst_9988' },
    });
    const res = await getCartRoute(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.isGuest).toBe(true);
  });

  it('POST /api/v1/cart adds item with price snapshot', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        variantId: 'var_phone_blue',
        quantity: 2,
      }),
    });
    const res = await addItemRoute(req);
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.itemsCount).toBe(2);
  });

  it('PATCH /api/v1/cart/items/[itemId] updates quantity', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/cart/items/cit_101', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: 3 }),
    });
    const res = await updateItemRoute(req, {
      params: Promise.resolve({ itemId: 'cit_101' }),
    });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.itemsCount).toBe(3);
  });

  it('DELETE /api/v1/cart/items/[itemId] removes item', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/cart/items/cit_101', {
      method: 'DELETE',
    });
    const res = await removeItemRoute(req, {
      params: Promise.resolve({ itemId: 'cit_101' }),
    });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.items.length).toBe(0);
  });

  it('POST /api/v1/cart/merge merges guest cart into authenticated user cart', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/cart/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guestCartToken: 'crt_gst_9988' }),
    });
    const res = await mergeCartRoute(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.mergedItemsCount).toBe(2);
    expect(body.data.guestCartId).toBe('crt_gst_9988');
  });

  it('POST /api/v1/cart/revalidate revalidates live pricing and stock', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/cart/revalidate', {
      method: 'POST',
    });
    const res = await revalidateCartRoute(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.hasChanges).toBe(false);
  });
});
