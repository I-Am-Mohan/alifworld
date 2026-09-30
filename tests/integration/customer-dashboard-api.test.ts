import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
afterEach(() => mock.restore());
import * as authzModule from '@/shared/authz';
import { GET as getDashboardRoute } from '@/app/api/v1/customer/dashboard/route';
import { GET as getOrdersRoute } from '@/app/api/v1/customer/orders/route';
import { POST as reorderRoute } from '@/app/api/v1/customer/orders/[id]/reorder/route';
import {
  GET as getNotifPrefsRoute,
  PUT as updateNotifPrefsRoute,
} from '@/app/api/v1/customer/notifications/preferences/route';
import { GET as listNotifsRoute } from '@/app/api/v1/customer/notifications/route';
import { PATCH as markNotifReadRoute } from '@/app/api/v1/customer/notifications/[id]/read/route';
import { POST as markAllNotifsReadRoute } from '@/app/api/v1/customer/notifications/read-all/route';
import { customerDashboardService } from '@/features/customers';
import { NextRequest } from 'next/server';

describe('Milestone 130: Customer Dashboard & Notifications REST API Integration Tests', () => {
  const customerActor = {
    userId: 'usr_customer_01',
    roles: ['CUSTOMER'],
    permissions: [],
    sellerId: null,
  };

  const mockOverview = {
    profile: {
      userId: 'usr_customer_01',
      name: 'Rahim Ahmed',
      email: 'rahim@example.com',
      phone: '+8801711223344',
      avatarUrl: null,
      locale: 'en-BD' as const,
      isEmailVerified: true,
      isPhoneVerified: true,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      version: 1,
    },
    metrics: {
      activeOrdersCount: 1,
      completedOrdersCount: 5,
      pointsBalance: 450,
      pendingPoints: 50,
      customerRank: 'SILVER',
      mainWalletBalancePoisha: 1250000,
      shoppingWalletBalancePoisha: 300000,
      savedWishlistItemsCount: 8,
      unreadNotificationsCount: 2,
    },
    recentOrders: [
      {
        id: 'ord_101',
        orderNumber: 'ORD-202610-8819',
        status: 'IN_TRANSIT',
        totalPoisha: 1850000,
        totalBdtFormatted: '৳18,500.00',
        itemsCount: 1,
        createdAt: new Date().toISOString(),
        firstItemTitle: 'Walton Primo S8 Pro',
        firstItemImageUrl: null,
        canReorder: true,
        canTrack: true,
        canReturn: false,
        trackingNumber: 'PTH-8899',
        courierProvider: 'PATHAO',
      },
    ],
    defaultAddress: null,
    recentNotifications: [],
  };

  beforeEach(() => {
    spyOn(authzModule, 'authenticateRequest').mockReturnValue(customerActor as any);

    spyOn(customerDashboardService, 'getDashboardOverview').mockResolvedValue(mockOverview as any);

    spyOn(customerDashboardService, 'listCustomerOrders').mockResolvedValue({
      orders: [],
      total: 0,
      page: 1,
      limit: 10,
    });

    spyOn(customerDashboardService, 'reorderPastOrder').mockResolvedValue({
      addedCount: 2,
      warnings: [],
    });

    spyOn(customerDashboardService, 'getNotificationPreferencesMatrix').mockResolvedValue([
      {
        channel: 'SMS',
        eventType: 'SECURITY_ALERTS',
        enabled: true,
        isMandatory: true,
        description: 'Critical security alerts',
      },
    ]);

    spyOn(customerDashboardService, 'updateNotificationPreferencesMatrix').mockResolvedValue([
      {
        channel: 'SMS',
        eventType: 'SECURITY_ALERTS',
        enabled: true,
        isMandatory: true,
        description: 'Critical security alerts',
      },
    ]);

    spyOn(customerDashboardService, 'listCustomerNotifications').mockResolvedValue([]);
    spyOn(customerDashboardService, 'markNotificationRead').mockResolvedValue();
    spyOn(customerDashboardService, 'markAllNotificationsRead').mockResolvedValue();
  });

  it('GET /api/v1/customer/dashboard returns dashboard overview', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/customer/dashboard');
    const res = await getDashboardRoute(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.metrics.pointsBalance).toBe(450);
    expect(body.data.profile.name).toBe('Rahim Ahmed');
  });

  it('GET /api/v1/customer/orders returns customer orders', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/customer/orders?page=1&limit=10');
    const res = await getOrdersRoute(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('POST /api/v1/customer/orders/[id]/reorder reorders past items', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/customer/orders/ord_101/reorder', {
      method: 'POST',
    });
    const res = await reorderRoute(req, {
      params: Promise.resolve({ id: 'ord_101' }),
    });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.addedCount).toBe(2);
  });

  it('GET and PUT /api/v1/customer/notifications/preferences manages channel matrix', async () => {
    const getReq = new NextRequest(
      'http://localhost:3000/api/v1/customer/notifications/preferences'
    );
    const getRes = await getNotifPrefsRoute(getReq);
    expect(getRes.status).toBe(200);

    const putReq = new NextRequest(
      'http://localhost:3000/api/v1/customer/notifications/preferences',
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferences: [{ channel: 'EMAIL', eventType: 'MARKETING_PROMOTIONS', enabled: true }],
        }),
      }
    );
    const putRes = await updateNotifPrefsRoute(putReq);
    expect(putRes.status).toBe(200);
  });

  it('GET /api/v1/customer/notifications and PATCH read endpoints work', async () => {
    const listReq = new NextRequest('http://localhost:3000/api/v1/customer/notifications');
    const listRes = await listNotifsRoute(listReq);
    expect(listRes.status).toBe(200);

    const readReq = new NextRequest(
      'http://localhost:3000/api/v1/customer/notifications/notif_1/read',
      {
        method: 'PATCH',
      }
    );
    const readRes = await markNotifReadRoute(readReq, {
      params: Promise.resolve({ id: 'notif_1' }),
    });
    expect(readRes.status).toBe(200);

    const readAllReq = new NextRequest(
      'http://localhost:3000/api/v1/customer/notifications/read-all',
      {
        method: 'POST',
      }
    );
    const readAllRes = await markAllNotifsReadRoute(readAllReq);
    expect(readAllRes.status).toBe(200);
  });
});
