import { describe, it, expect, beforeEach, spyOn } from 'bun:test';
import * as authzModule from '@/shared/authz';
import { GET as getGroupedCartRoute } from '@/app/api/v1/cart/grouped/route';
import { cartService } from '@/features/cart/services/cart.service';
import { NextRequest } from 'next/server';

describe('Milestone 128: Cart Grouped REST API Integration Tests', () => {
  const customerActor = {
    userId: 'usr_customer_01',
    roles: ['CUSTOMER'],
    permissions: [],
    sellerId: null,
  };

  const mockGroupedCart = {
    id: 'crt_user_01',
    userId: 'usr_customer_01',
    isGuest: false,
    guestCartToken: null,
    currency: 'BDT' as const,
    status: 'ACTIVE',
    couponCode: null,
    notes: null,
    isB2B: false,
    b2bQuoteId: null,
    purchaseOrderRef: null,
    sellerGroups: [
      {
        sellerId: 'sel_walton_01',
        sellerName: 'Walton Official Store',
        sellerSlug: 'walton-store',
        sellerStatus: 'VERIFIED',
        packageNumber: 1,
        items: [],
        itemsCount: 1,
        subtotalPoisha: 1850000,
        subtotalBdtFormatted: '৳18,500.00',
        shippingFeePoisha: 0,
        shippingFeeBdtFormatted: '৳0.00',
        totalPoisha: 1850000,
        totalBdtFormatted: '৳18,500.00',
        totalProductPoints: 150,
        constraints: {
          minOrderPoisha: null,
          minOrderBdtFormatted: null,
          isMinOrderSatisfied: true,
          freeShippingThresholdPoisha: 200000,
          freeShippingThresholdBdtFormatted: '৳2,000.00',
          qualifiesForFreeShipping: true,
          amountNeededForFreeShippingPoisha: 0,
          amountNeededForFreeShippingBdtFormatted: null,
          shippingMode: 'PLATFORM',
          defaultHandlingDays: 2,
          estimatedDeliveryMinDays: 3,
          estimatedDeliveryMaxDays: 5,
          vacationMode: false,
          vacationMessage: null,
          warnings: [],
        },
      },
    ],
    sellerGroupsCount: 1,
    totalItemsCount: 1,
    totalSubtotalPoisha: 1850000,
    totalSubtotalBdtFormatted: '৳18,500.00',
    totalShippingFeePoisha: 0,
    totalShippingFeeBdtFormatted: '৳0.00',
    grandTotalPoisha: 1850000,
    grandTotalBdtFormatted: '৳18,500.00',
    totalProductPoints: 150,
    isReadyForCheckout: true,
    warnings: [],
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    spyOn(authzModule, 'authenticateRequest').mockReturnValue(customerActor as any);
    spyOn(cartService, 'getGroupedCart').mockResolvedValue(mockGroupedCart as any);
  });

  it('GET /api/v1/cart/grouped returns multi-vendor seller fulfillment packages', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/cart/grouped?division=DHAKA');
    const res = await getGroupedCartRoute(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.sellerGroupsCount).toBe(1);
    expect(body.data.sellerGroups[0].packageNumber).toBe(1);
    expect(body.data.sellerGroups[0].sellerName).toBe('Walton Official Store');
    expect(body.data.sellerGroups[0].constraints.qualifiesForFreeShipping).toBe(true);
    expect(body.data.grandTotalBdtFormatted).toBe('৳18,500.00');
  });
});
