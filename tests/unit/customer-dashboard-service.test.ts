import { describe, expect, it, beforeEach, spyOn } from 'bun:test';
import { CustomerDashboardService } from '@/features/customers/services/customer-dashboard.service';
import { customerAccountService } from '@/features/customers/services/customer-account.service';
import { cartService } from '@/features/cart/services/cart.service';

class MockPrismaDashboardDb {
  public orders: any[] = [];
  public orderItems: any[] = [];
  public pointAccounts: any[] = [];
  public userRanks: any[] = [];
  public wallets: any[] = [];
  public wishlists: any[] = [];
  public userAddresses: any[] = [];
  public notificationPreferences: any[] = [];
  public notificationDeliveries: any[] = [];
  public outboxEvents: any[] = [];

  public order = {
    count: async ({ where }: any) => {
      return this.orders.filter((o) => {
        if (where.userId && o.userId !== where.userId) return false;
        if (where.status?.in && !where.status.in.includes(o.status)) return false;
        if (where.status && typeof where.status === 'string' && o.status !== where.status)
          return false;
        return !o.deletedAt;
      }).length;
    },
    findMany: async ({ where, take }: any) => {
      let filtered = this.orders.filter((o) => {
        if (where.userId && o.userId !== where.userId) return false;
        if (where.status && o.status !== where.status) return false;
        return !o.deletedAt;
      });
      if (take) filtered = filtered.slice(0, take);
      return filtered;
    },
    findFirst: async ({ where }: any) => {
      return (
        this.orders.find((o) => {
          if (where.id && o.id !== where.id) return false;
          if (where.userId && o.userId !== where.userId) return false;
          return !o.deletedAt;
        }) || null
      );
    },
  };

  public pointAccount = {
    findFirst: async ({ where }: any) => {
      return this.pointAccounts.find((p) => p.userId === where.userId && !p.deletedAt) || null;
    },
  };

  public userRank = {
    findFirst: async ({ where }: any) => {
      return this.userRanks.find((r) => r.userId === where.userId && !r.deletedAt) || null;
    },
  };

  public wallet = {
    findMany: async ({ where }: any) => {
      return this.wallets.filter((w) => w.userId === where.userId && !w.deletedAt);
    },
  };

  public wishlist = {
    findMany: async ({ where }: any) => {
      return this.wishlists.filter((w) => w.userId === where.userId && !w.deletedAt);
    },
  };

  public userAddress = {
    findFirst: async ({ where }: any) => {
      return (
        this.userAddresses.find((a) => a.userId === where.userId && a.isDefault && !a.deletedAt) ||
        null
      );
    },
  };

  public userNotificationPreference = {
    findMany: async ({ where }: any) => {
      return this.notificationPreferences.filter((p) => p.userId === where.userId);
    },
    upsert: async ({ where, update, create }: any) => {
      const idx = this.notificationPreferences.findIndex(
        (p) =>
          p.userId === where.userId_channel_eventType.userId &&
          p.channel === where.userId_channel_eventType.channel &&
          p.eventType === where.userId_channel_eventType.eventType
      );
      if (idx !== -1) {
        this.notificationPreferences[idx] = {
          ...this.notificationPreferences[idx],
          ...update,
        };
        return this.notificationPreferences[idx];
      }
      const newPref = { ...create };
      this.notificationPreferences.push(newPref);
      return newPref;
    },
  };

  public userNotificationDelivery = {
    count: async ({ where }: any) => {
      return this.notificationDeliveries.filter(
        (n) => n.userId === where.userId && n.status === where.status
      ).length;
    },
    findMany: async ({ where, take }: any) => {
      let filtered = this.notificationDeliveries.filter((n) => n.userId === where.userId);
      if (take) filtered = filtered.slice(0, take);
      return filtered;
    },
    updateMany: async ({ where, data }: any) => {
      let count = 0;
      for (const n of this.notificationDeliveries) {
        if (n.userId === where.userId && (!where.id || n.id === where.id)) {
          Object.assign(n, data);
          count++;
        }
      }
      return { count };
    },
  };

  public outboxEvent = {
    create: async ({ data }: any) => {
      this.outboxEvents.push(data);
      return data;
    },
  };
}

describe('Milestone 130: Customer Dashboard & Order Shortcuts Unit Tests', () => {
  let mockDb: MockPrismaDashboardDb;
  let service: CustomerDashboardService;

  const mockProfile = {
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
  };

  beforeEach(() => {
    mockDb = new MockPrismaDashboardDb();
    service = new CustomerDashboardService();
    (service as any).db = mockDb;

    spyOn(customerAccountService, 'getCustomerProfile').mockResolvedValue(mockProfile);

    // Seed mock data
    mockDb.pointAccounts.push({
      userId: 'usr_customer_01',
      availablePoints: 450,
      pendingPoints: 50,
      deletedAt: null,
    });

    mockDb.userRanks.push({
      userId: 'usr_customer_01',
      status: 'ACTIVE',
      rankDefinition: { code: 'SILVER' },
      deletedAt: null,
    });

    mockDb.wallets.push(
      {
        userId: 'usr_customer_01',
        type: 'MAIN',
        balancePoisha: BigInt(1250000), // ৳12,500.00
        deletedAt: null,
      },
      {
        userId: 'usr_customer_01',
        type: 'SHOPPING',
        balancePoisha: BigInt(300000), // ৳3,000.00
        deletedAt: null,
      }
    );

    mockDb.wishlists.push({
      userId: 'usr_customer_01',
      _count: { items: 5 },
      deletedAt: null,
    });

    mockDb.userAddresses.push({
      id: 'addr_101',
      userId: 'usr_customer_01',
      recipientName: 'Rahim Ahmed',
      phone: '+8801711223344',
      streetAddress: 'House 42, Road 11, Banani',
      division: { nameEn: 'Dhaka' },
      district: { nameEn: 'Dhaka' },
      isDefault: true,
      deletedAt: null,
    });

    mockDb.orders.push({
      id: 'ord_101',
      userId: 'usr_customer_01',
      orderNumber: 'ORD-202610-001',
      status: 'IN_TRANSIT',
      totalPoisha: BigInt(1850000),
      shippingDivision: 'DHAKA',
      shippingDistrict: 'Dhaka',
      shippingAddress: 'House 42, Road 11, Banani',
      createdAt: new Date(),
      deletedAt: null,
      items: [
        {
          id: 'itm_1',
          productId: 'prod_1',
          variantId: 'var_1',
          productTitle: 'Walton Primo S8 Pro',
          variantTitle: 'Blue',
          quantity: 1,
          unitPricePoisha: BigInt(1850000),
          totalPoisha: BigInt(1850000),
          productPointSnapshot: 150,
          totalProductPoints: 150,
          seller: { businessName: 'Walton Flagship' },
        },
      ],
      fulfillmentGroups: [
        {
          courierProvider: 'PATHAO',
          trackingNumber: 'PTH-12345',
          status: 'IN_TRANSIT',
        },
      ],
    });

    mockDb.notificationDeliveries.push({
      id: 'notif_1',
      userId: 'usr_customer_01',
      channel: 'SMS',
      eventType: 'ORDER_STATUS_CHANGES',
      subject: 'Order In Transit',
      bodyPreview: 'Your order is on the way.',
      status: 'DELIVERED',
      createdAt: new Date(),
    });
  });

  describe('1. Dashboard Overview Aggregation', () => {
    it('aggregates profile, order metrics, points, and wallet balances', async () => {
      const overview = await service.getDashboardOverview('usr_customer_01');

      expect(overview.profile.name).toBe('Rahim Ahmed');
      expect(overview.metrics.activeOrdersCount).toBe(1);
      expect(overview.metrics.pointsBalance).toBe(450);
      expect(overview.metrics.customerRank).toBe('SILVER');
      expect(overview.metrics.mainWalletBalancePoisha).toBe(1250000);
      expect(overview.metrics.savedWishlistItemsCount).toBe(5);
      expect(overview.metrics.unreadNotificationsCount).toBe(1);
      expect(overview.recentOrders.length).toBe(1);
      expect(overview.recentOrders[0].orderNumber).toBe('ORD-202610-001');
      expect(overview.recentOrders[0].trackingNumber).toBe('PTH-12345');
    });
  });

  describe('2. Order Shortcuts & 1-Click Reorder', () => {
    it('reorders items from past order into active cart', async () => {
      const addItemSpy = spyOn(cartService, 'addItem').mockResolvedValue({} as any);

      const result = await service.reorderPastOrder('usr_customer_01', 'ord_101');

      expect(result.addedCount).toBe(1);
      expect(addItemSpy).toHaveBeenCalled();
    });
  });

  describe('3. Granular Notification Matrix Preferences', () => {
    it('returns full notification preference matrix and enforces mandatory security alerts', async () => {
      const matrix = await service.getNotificationPreferencesMatrix('usr_customer_01');

      expect(matrix.length).toBeGreaterThanOrEqual(6);
      const secAlert = matrix.find((m) => m.eventType === 'SECURITY_ALERTS');
      expect(secAlert?.isMandatory).toBe(true);
      expect(secAlert?.enabled).toBe(true);
    });

    it('updates customizable preferences while preserving mandatory security alerts', async () => {
      const updated = await service.updateNotificationPreferencesMatrix('usr_customer_01', {
        preferences: [
          { channel: 'EMAIL', eventType: 'MARKETING_PROMOTIONS', enabled: true },
          { channel: 'SMS', eventType: 'SECURITY_ALERTS', enabled: false }, // Attempt to disable mandatory alert
        ],
      });

      const secAlert = updated.find(
        (m) => m.eventType === 'SECURITY_ALERTS' && m.channel === 'SMS'
      );
      expect(secAlert?.enabled).toBe(true); // Invariant: Mandatory alert stays enabled!

      const promoEmail = updated.find(
        (m) => m.eventType === 'MARKETING_PROMOTIONS' && m.channel === 'EMAIL'
      );
      expect(promoEmail?.enabled).toBe(true);
    });
  });

  describe('4. Notification Feed & Read Statuses', () => {
    it('marks notification as read', async () => {
      await service.markNotificationRead('usr_customer_01', 'notif_1');

      const notif = mockDb.notificationDeliveries.find((n) => n.id === 'notif_1');
      expect(notif.status).toBe('READ');
    });
  });
});
