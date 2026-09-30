/**
 * Customer Dashboard, Order Shortcuts & Notification Domain Service
 *
 * Implements customer dashboard overview aggregations, 1-click past order shortcuts,
 * notification channel preference matrix governance, and notification feed management.
 *
 * Invariant: Self-ownership strictly enforced; zero cross-customer data leakage.
 * Invariant: Mandatory security and critical transactional notices cannot be opted out of.
 * Invariant: Product Points and integer poisha money are accurately presented and conserved.
 */

import { prisma } from '@/shared/database/prisma';
import { generatePrefixedId, ENTITY_PREFIXES } from '@/shared/utils/id';
import { NotFoundError, ValidationError, AuthorizationError } from '@/shared/errors/app-error';
import {
  CustomerDashboardOverviewDTO,
  CustomerDashboardMetricsDTO,
  CustomerDashboardOrderShortcutDTO,
  CustomerOrderListItemDTO,
  CustomerOrderItemSnapshotDTO,
  NotificationPreferenceMatrixItem,
  CustomerNotificationItemDTO,
  NotificationChannel,
  NotificationEventType,
} from '../types/dashboard.types';
import {
  UpdateNotificationMatrixInput,
  ListCustomerOrdersQuery,
} from '../validators/dashboard.validators';
import { customerAccountService } from './customer-account.service';
import { cartService } from '@/features/cart/services/cart.service';

export class CustomerDashboardService {
  private db = prisma;

  /**
   * Aggregates a complete customer dashboard overview.
   */
  public async getDashboardOverview(userId: string): Promise<CustomerDashboardOverviewDTO> {
    const profile = await customerAccountService.getCustomerProfile(userId);

    // 1. Fetch Orders Metrics & Recent Orders
    const [activeOrdersCount, completedOrdersCount, recentOrdersDb] = await Promise.all([
      (this.db as any).order.count({
        where: {
          userId,
          status: { in: ['PENDING', 'CONFIRMED', 'PROCESSING', 'IN_TRANSIT'] },
          deletedAt: null,
        },
      }),
      (this.db as any).order.count({
        where: {
          userId,
          status: 'DELIVERED',
          deletedAt: null,
        },
      }),
      (this.db as any).order.findMany({
        where: { userId, deletedAt: null },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            where: { deletedAt: null },
            include: {
              variant: { select: { imageUrl: true, title: true } },
              seller: { select: { businessName: true } },
            },
          },
          fulfillmentGroups: {
            where: { deletedAt: null },
            select: { courierProvider: true, trackingNumber: true, status: true },
          },
        },
      }),
    ]);

    // 2. Fetch Points & Rank
    const pointAccount = await (this.db as any).pointAccount.findFirst({
      where: { userId, deletedAt: null },
    });

    const activeRank = await (this.db as any).userRank.findFirst({
      where: { userId, status: 'ACTIVE', deletedAt: null },
      include: { rankDefinition: true },
      orderBy: { createdAt: 'desc' },
    });

    // 3. Fetch Wallet Balances
    const wallets = await (this.db as any).wallet.findMany({
      where: { userId, status: 'ACTIVE', deletedAt: null },
    });

    const mainWallet = wallets.find((w: any) => w.type === 'MAIN');
    const shoppingWallet = wallets.find((w: any) => w.type === 'SHOPPING');

    // 4. Fetch Wishlist Items Count
    const wishlists = await (this.db as any).wishlist.findMany({
      where: { userId, deletedAt: null },
      include: {
        _count: { select: { items: true } },
      },
    });

    const savedWishlistItemsCount = wishlists.reduce(
      (sum: number, w: any) => sum + (w._count?.items || 0),
      0
    );

    // 5. Fetch Default Address
    const defaultAddressDb = await (this.db as any).userAddress.findFirst({
      where: { userId, isDefault: true, deletedAt: null },
      include: { division: true, district: true },
    });

    // 6. Fetch Unread Notifications Count
    const unreadNotificationsCount = await (this.db as any).userNotificationDelivery.count({
      where: { userId, status: 'DELIVERED' },
    });

    const recentNotificationsDb = await (this.db as any).userNotificationDelivery.findMany({
      where: { userId },
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    const metrics: CustomerDashboardMetricsDTO = {
      activeOrdersCount,
      completedOrdersCount,
      pointsBalance: pointAccount?.availablePoints || 0,
      pendingPoints: pointAccount?.pendingPoints || 0,
      customerRank: activeRank?.rankDefinition?.code || 'BRONZE',
      mainWalletBalancePoisha: Number(mainWallet?.balancePoisha || 0),
      shoppingWalletBalancePoisha: Number(shoppingWallet?.balancePoisha || 0),
      savedWishlistItemsCount,
      unreadNotificationsCount,
    };

    const recentOrders: CustomerDashboardOrderShortcutDTO[] = recentOrdersDb.map((o: any) => {
      const firstItem = o.items?.[0];
      const fg = o.fulfillmentGroups?.[0];
      const totalPoisha = Number(o.totalPoisha);

      return {
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        totalPoisha,
        totalBdtFormatted: this.formatBdt(totalPoisha),
        itemsCount: o.items?.reduce((sum: number, i: any) => sum + i.quantity, 0) || 1,
        createdAt: o.createdAt.toISOString(),
        firstItemTitle: firstItem?.productTitle || 'Order Items',
        firstItemImageUrl: firstItem?.variant?.imageUrl || null,
        canReorder: o.items?.length > 0,
        canTrack: o.status !== 'CANCELLED' && o.status !== 'PENDING',
        canReturn: o.status === 'DELIVERED',
        trackingNumber: fg?.trackingNumber || null,
        courierProvider: fg?.courierProvider || null,
      };
    });

    const recentNotifications: CustomerNotificationItemDTO[] = recentNotificationsDb.map(
      (n: any) => ({
        id: n.id,
        channel: n.channel,
        eventType: n.eventType,
        title: n.subject || 'Order Notification',
        body: n.bodyPreview || 'Your order status has updated.',
        isRead: n.status === 'READ',
        actionUrl: '/account',
        createdAt: n.createdAt.toISOString(),
      })
    );

    return {
      profile,
      metrics,
      recentOrders,
      defaultAddress: defaultAddressDb
        ? {
            id: defaultAddressDb.id,
            recipientName: defaultAddressDb.recipientName,
            phone: defaultAddressDb.phone,
            divisionName: defaultAddressDb.division?.nameEn || defaultAddressDb.divisionId,
            districtName: defaultAddressDb.district?.nameEn || defaultAddressDb.districtId,
            fullAddress: defaultAddressDb.streetAddress,
          }
        : null,
      recentNotifications,
    };
  }

  /**
   * Lists customer parent orders with pagination and filtering.
   */
  public async listCustomerOrders(
    userId: string,
    query: ListCustomerOrdersQuery
  ): Promise<{
    orders: CustomerOrderListItemDTO[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {
      userId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
    };

    const [orders, total] = await Promise.all([
      (this.db as any).order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            where: { deletedAt: null },
            include: {
              variant: { select: { imageUrl: true, title: true } },
              seller: { select: { businessName: true } },
            },
          },
        },
      }),
      (this.db as any).order.count({ where }),
    ]);

    const mappedOrders: CustomerOrderListItemDTO[] = orders.map((o: any) => {
      const totalPoisha = Number(o.totalPoisha);
      const totalProductPoints =
        o.items?.reduce((sum: number, i: any) => sum + (i.totalProductPoints || 0), 0) || 0;

      const items: CustomerOrderItemSnapshotDTO[] = (o.items || []).map((i: any) => {
        const itemUnitPrice = Number(i.unitPricePoisha);
        const itemTotalPrice = Number(i.totalPoisha);

        return {
          id: i.id,
          productId: i.productId || i.variantId,
          variantId: i.variantId,
          productTitle: i.productTitle,
          variantTitle: i.variantTitle,
          sellerId: i.sellerId,
          sellerName: i.seller?.businessName || 'Verified Merchant',
          quantity: i.quantity,
          unitPricePoisha: itemUnitPrice,
          unitPriceBdtFormatted: this.formatBdt(itemUnitPrice),
          totalPoisha: itemTotalPrice,
          totalBdtFormatted: this.formatBdt(itemTotalPrice),
          productPointSnapshot: i.productPointSnapshot || 0,
          imageUrl: i.variant?.imageUrl || null,
        };
      });

      return {
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        totalPoisha,
        totalBdtFormatted: this.formatBdt(totalPoisha),
        itemsCount: items.reduce((sum, i) => sum + i.quantity, 0),
        totalProductPoints,
        shippingAddress: `${o.shippingDivision}, ${o.shippingDistrict}, ${o.shippingAddress}`,
        createdAt: o.createdAt.toISOString(),
        items,
        canReorder: items.length > 0,
        canTrack: o.status !== 'CANCELLED',
      };
    });

    return {
      orders: mappedOrders,
      total,
      page,
      limit,
    };
  }

  /**
   * Order Shortcut: Reorders all items from a past order into the customer's active cart.
   */
  public async reorderPastOrder(
    userId: string,
    orderId: string
  ): Promise<{ addedCount: number; warnings: string[] }> {
    const order = await (this.db as any).order.findFirst({
      where: { id: orderId, userId, deletedAt: null },
      include: {
        items: {
          where: { deletedAt: null },
        },
      },
    });

    if (!order) {
      throw new NotFoundError(`Order '${orderId}' not found in your account.`);
    }

    let addedCount = 0;
    const warnings: string[] = [];

    for (const item of order.items) {
      try {
        await cartService.addItem(
          {
            variantId: item.variantId,
            quantity: item.quantity,
          },
          userId
        );
        addedCount++;
      } catch (err: any) {
        warnings.push(`Could not add '${item.productTitle}': ${err.message}`);
      }
    }

    return {
      addedCount,
      warnings,
    };
  }

  /**
   * Retrieves granular notification preference matrix across all channels.
   */
  public async getNotificationPreferencesMatrix(
    userId: string
  ): Promise<NotificationPreferenceMatrixItem[]> {
    const prefs = await (this.db as any).userNotificationPreference.findMany({
      where: { userId },
    });

    const matrix: Array<{
      channel: NotificationChannel;
      eventType: NotificationEventType;
      defaultEnabled: boolean;
      isMandatory: boolean;
      description: string;
    }> = [
      {
        channel: 'SMS',
        eventType: 'SECURITY_ALERTS',
        defaultEnabled: true,
        isMandatory: true,
        description: 'Critical password changes, login OTPs, and account security alerts.',
      },
      {
        channel: 'EMAIL',
        eventType: 'SECURITY_ALERTS',
        defaultEnabled: true,
        isMandatory: true,
        description: 'Account recovery links and security event digests.',
      },
      {
        channel: 'SMS',
        eventType: 'ORDER_STATUS_CHANGES',
        defaultEnabled: true,
        isMandatory: false,
        description: 'Real-time SMS updates when your order is confirmed, packed, or delivered.',
      },
      {
        channel: 'PUSH',
        eventType: 'DELIVERY_DISPATCH_ALERTS',
        defaultEnabled: true,
        isMandatory: false,
        description: 'Push notifications when rider is out for delivery with live tracking.',
      },
      {
        channel: 'EMAIL',
        eventType: 'MARKETING_PROMOTIONS',
        defaultEnabled: false,
        isMandatory: false,
        description: 'Weekly promotions, campaign discounts, and curated flash sales.',
      },
      {
        channel: 'PUSH',
        eventType: 'PRICE_DROP_ALERTS',
        defaultEnabled: true,
        isMandatory: false,
        description: 'Instant alerts when items in your saved wishlist drop in price.',
      },
      {
        channel: 'SMS',
        eventType: 'RESTOCK_ALERTS',
        defaultEnabled: true,
        isMandatory: false,
        description: 'Alerts when out-of-stock items become available for order.',
      },
    ];

    return matrix.map((item) => {
      const existing = prefs.find(
        (p: any) => p.channel === item.channel && p.eventType === item.eventType
      );

      return {
        channel: item.channel,
        eventType: item.eventType,
        enabled: item.isMandatory ? true : existing ? existing.enabled : item.defaultEnabled,
        isMandatory: item.isMandatory,
        description: item.description,
      };
    });
  }

  /**
   * Updates granular notification preferences while strictly enforcing mandatory security invariants.
   */
  public async updateNotificationPreferencesMatrix(
    userId: string,
    input: UpdateNotificationMatrixInput
  ): Promise<NotificationPreferenceMatrixItem[]> {
    for (const item of input.preferences) {
      // Invariant: Mandatory security alerts cannot be disabled!
      const effectiveEnabled = item.eventType === 'SECURITY_ALERTS' ? true : item.enabled;

      await (this.db as any).userNotificationPreference.upsert({
        where: {
          userId_channel_eventType: {
            userId,
            channel: item.channel,
            eventType: item.eventType,
          },
        },
        update: {
          enabled: effectiveEnabled,
        },
        create: {
          id: `unp_${Math.random().toString(36).substring(2, 10)}`,
          userId,
          channel: item.channel,
          eventType: item.eventType,
          enabled: effectiveEnabled,
        },
      });
    }

    await this.recordOutboxEvent('customer.notification_preferences_updated', userId, {
      userId,
      preferencesCount: input.preferences.length,
    });

    return this.getNotificationPreferencesMatrix(userId);
  }

  /**
   * Lists customer notification delivery history.
   */
  public async listCustomerNotifications(
    userId: string,
    limit: number = 20
  ): Promise<CustomerNotificationItemDTO[]> {
    const notifications = await (this.db as any).userNotificationDelivery.findMany({
      where: { userId },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return notifications.map((n: any) => ({
      id: n.id,
      channel: n.channel,
      eventType: n.eventType,
      title: n.subject || 'Order Notification',
      body: n.bodyPreview || 'Your order status has updated.',
      isRead: n.status === 'READ',
      actionUrl: '/account',
      createdAt: n.createdAt.toISOString(),
    }));
  }

  /**
   * Marks a notification as read.
   */
  public async markNotificationRead(userId: string, notificationId: string): Promise<void> {
    await (this.db as any).userNotificationDelivery.updateMany({
      where: { id: notificationId, userId },
      data: { status: 'READ' },
    });
  }

  /**
   * Marks all customer notifications as read.
   */
  public async markAllNotificationsRead(userId: string): Promise<void> {
    await (this.db as any).userNotificationDelivery.updateMany({
      where: { userId, status: 'DELIVERED' },
      data: { status: 'READ' },
    });
  }

  private formatBdt(poisha: bigint | number): string {
    const num = typeof poisha === 'bigint' ? Number(poisha) : poisha;
    const bdt = (num / 100).toLocaleString('en-BD', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `৳${bdt}`;
  }

  private async recordOutboxEvent(
    eventType: string,
    aggregateId: string,
    payload: any
  ): Promise<void> {
    try {
      await (this.db as any).outboxEvent.create({
        data: {
          id: generatePrefixedId(ENTITY_PREFIXES.OUTBOX),
          eventType,
          aggregateType: 'CUSTOMER_DASHBOARD',
          aggregateId,
          payload: payload ?? {},
          status: 'PENDING',
          attempts: 0,
          version: 1,
        },
      });
    } catch (err) {
      console.warn('Non-fatal outbox record error:', err);
    }
  }
}

export const customerDashboardService = new CustomerDashboardService();
