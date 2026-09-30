/**
 * Customer Dashboard, Order Shortcuts & Notification Validators
 */

import { z } from 'zod';

export const NotificationChannelEnum = z.enum(['EMAIL', 'SMS', 'PUSH', 'WHATSAPP']);

export const NotificationEventTypeEnum = z.enum([
  'ORDER_STATUS_CHANGES',
  'DELIVERY_DISPATCH_ALERTS',
  'PRICE_DROP_ALERTS',
  'RESTOCK_ALERTS',
  'MARKETING_PROMOTIONS',
  'SECURITY_ALERTS',
]);

export const NotificationPreferenceItemInputSchema = z.object({
  channel: NotificationChannelEnum,
  eventType: NotificationEventTypeEnum,
  enabled: z.boolean(),
});

export const UpdateNotificationMatrixSchema = z.object({
  preferences: z.array(NotificationPreferenceItemInputSchema).min(1),
});

export const ListCustomerOrdersQuerySchema = z.object({
  status: z
    .enum(['PENDING', 'PROCESSING', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'RETURNED'])
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type NotificationPreferenceItemInput = z.infer<typeof NotificationPreferenceItemInputSchema>;
export type UpdateNotificationMatrixInput = z.infer<typeof UpdateNotificationMatrixSchema>;
export type ListCustomerOrdersQuery = z.infer<typeof ListCustomerOrdersQuerySchema>;
