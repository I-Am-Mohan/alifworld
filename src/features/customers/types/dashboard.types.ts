/**
 * Customer Dashboard, Order Shortcuts & Notification Domain Types
 *
 * Invariant: Self-ownership strictly enforced; zero data leakage across customers.
 * Invariant: Mandatory security and transactional alerts cannot be opted out of.
 * Invariant: Discrete Product Points and integer poisha money are accurately presented.
 */

import { CustomerProfile } from './index';

export type NotificationChannel = 'EMAIL' | 'SMS' | 'PUSH' | 'WHATSAPP';

export type NotificationEventType =
  | 'ORDER_STATUS_CHANGES'
  | 'DELIVERY_DISPATCH_ALERTS'
  | 'PRICE_DROP_ALERTS'
  | 'RESTOCK_ALERTS'
  | 'MARKETING_PROMOTIONS'
  | 'SECURITY_ALERTS';

export interface CustomerDashboardOrderShortcutDTO {
  id: string;
  orderNumber: string;
  status: string;
  totalPoisha: number;
  totalBdtFormatted: string;
  itemsCount: number;
  createdAt: string;
  firstItemTitle: string;
  firstItemImageUrl?: string | null;
  canReorder: boolean;
  canTrack: boolean;
  canReturn: boolean;
  trackingNumber?: string | null;
  courierProvider?: string | null;
}

export interface CustomerDashboardMetricsDTO {
  activeOrdersCount: number;
  completedOrdersCount: number;
  pointsBalance: number;
  pendingPoints: number;
  customerRank: string; // e.g. "BRONZE", "SILVER", "GOLD"
  mainWalletBalancePoisha: number;
  shoppingWalletBalancePoisha: number;
  savedWishlistItemsCount: number;
  unreadNotificationsCount: number;
}

export interface CustomerDashboardOverviewDTO {
  profile: CustomerProfile;
  metrics: CustomerDashboardMetricsDTO;
  recentOrders: CustomerDashboardOrderShortcutDTO[];
  defaultAddress?: {
    id: string;
    recipientName: string;
    phone: string;
    divisionName: string;
    districtName: string;
    fullAddress: string;
  } | null;
  recentNotifications: CustomerNotificationItemDTO[];
}

export interface CustomerOrderItemSnapshotDTO {
  id: string;
  productId: string;
  variantId?: string | null;
  productTitle: string;
  variantTitle?: string | null;
  sellerId: string;
  sellerName: string;
  quantity: number;
  unitPricePoisha: number;
  unitPriceBdtFormatted: string;
  totalPoisha: number;
  totalBdtFormatted: string;
  productPointSnapshot: number;
  imageUrl?: string | null;
}

export interface CustomerOrderListItemDTO {
  id: string;
  orderNumber: string;
  status: string;
  totalPoisha: number;
  totalBdtFormatted: string;
  itemsCount: number;
  totalProductPoints: number;
  shippingAddress: string;
  createdAt: string;
  items: CustomerOrderItemSnapshotDTO[];
  canReorder: boolean;
  canTrack: boolean;
}

export interface NotificationPreferenceMatrixItem {
  channel: NotificationChannel;
  eventType: NotificationEventType;
  enabled: boolean;
  isMandatory: boolean; // True for SECURITY_ALERTS and critical transactional notices
  description: string;
}

export interface CustomerNotificationItemDTO {
  id: string;
  channel: string;
  eventType: string;
  title: string;
  body: string;
  isRead: boolean;
  actionUrl?: string | null;
  createdAt: string;
}
