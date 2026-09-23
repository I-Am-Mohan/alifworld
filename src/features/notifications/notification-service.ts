import { createHash } from 'node:crypto';
import { generateId, ID_PREFIXES } from '@/shared/utils/id';
import { getPrismaClient } from '@/shared/database/prisma';
import { normalizeToCanonicalLocale } from '@/i18n/config';
import {
  NotificationChannel,
  NotificationEvent,
  NotificationPreference,
  shouldDeliverNotification,
} from './notification-contract';

export interface QueueNotificationInput {
  userId: string;
  event: NotificationEvent;
  channel: NotificationChannel;
  templateKey: string;
  locale?: string;
  eventId: string;
  preferences?: NotificationPreference[];
}

export interface QueuedNotification {
  idempotencyKey: string;
  id: string;
  status: 'QUEUED' | 'ALREADY_QUEUED' | 'SKIPPED';
}

export function notificationIdempotencyKey(input: Omit<QueueNotificationInput, 'preferences'>): string {
  const material = [
    input.userId,
    input.event,
    input.channel,
    input.templateKey,
    normalizeToCanonicalLocale(input.locale),
    input.eventId,
  ].join('|');

  return `notification:${createHash('sha256').update(material).digest('hex')}`;
}

export class NotificationService {
  private get prisma() {
    return getPrismaClient() as any;
  }

  async queue(input: QueueNotificationInput): Promise<QueuedNotification> {
    const locale = normalizeToCanonicalLocale(input.locale);
    const shouldDeliver = shouldDeliverNotification(input.event, input.channel, input.preferences ?? []);
    const idempotencyKey = notificationIdempotencyKey({ ...input, locale });

    if (!shouldDeliver) {
      return { idempotencyKey, id: '', status: 'SKIPPED' };
    }

    const existing = await this.prisma.userNotificationDelivery.findUnique({
      where: { idempotencyKey },
      select: { idempotencyKey: true, id: true, status: true },
    });
    if (existing) {
      return { idempotencyKey, id: existing.id, status: 'ALREADY_QUEUED' };
    }

    try {
      const created = await this.prisma.userNotificationDelivery.create({
        data: {
          idempotencyKey,
          id: generateId(ID_PREFIXES.OUTBOX),
          userId: input.userId,
          eventType: input.event,
          channel: input.channel,
          locale,
          templateKey: input.templateKey,
          status: 'QUEUED',
        },
        select: { idempotencyKey: true, id: true, status: true },
      });
      return { idempotencyKey, id: created.id, status: 'QUEUED' };
    } catch (error: any) {
      if (error?.code === 'P2002') {
        const duplicate = await this.prisma.userNotificationDelivery.findUnique({
          where: { idempotencyKey },
          select: { id: true },
        });
        if (duplicate) {
          return { idempotencyKey, id: duplicate.id, status: 'ALREADY_QUEUED' };
        }
      }
      throw error;
    }
  }
}
