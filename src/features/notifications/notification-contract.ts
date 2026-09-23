import { z } from 'zod';
import { getDictionary } from '@/i18n/translations';
import { normalizeToCanonicalLocale } from '@/i18n/config';
import { formatLocalizedText } from '@/shared/utils/localization';

export const NotificationChannelSchema = z.enum(['EMAIL', 'SMS', 'PUSH', 'IN_APP']);
export type NotificationChannel = z.infer<typeof NotificationChannelSchema>;

export const NotificationEventSchema = z.enum([
  'SECURITY',
  'TRANSACTIONAL',
  'MARKETING',
]);
export type NotificationEvent = z.infer<typeof NotificationEventSchema>;

export interface NotificationPreference {
  channel: NotificationChannel;
  event: NotificationEvent;
  enabled: boolean;
}

export interface NotificationTemplate {
  key: string;
  subject?: string;
  body: string;
  locale: string;
  required: boolean;
}

export function renderNotificationTemplate(
  template: NotificationTemplate,
  params: Record<string, string | number | bigint> = {}
): { subject?: string; body: string; locale: string } {
  return {
    subject: template.subject ? formatLocalizedText(template.subject, params) : undefined,
    body: formatLocalizedText(template.body, params),
    locale: normalizeToCanonicalLocale(template.locale),
  };
}

export function getTransactionalTemplate(
  key: 'emailVerificationSubject' | 'emailVerificationBody' | 'passwordResetSubject' | 'orderConfirmationSubject',
  locale: string
): string {
  const dictionary = getDictionary(locale) as any;
  return dictionary.transactional[key];
}

export function shouldDeliverNotification(
  event: NotificationEvent,
  channel: NotificationChannel,
  preferences: NotificationPreference[]
): boolean {
  if (event === 'SECURITY' || event === 'TRANSACTIONAL') return true;
  return preferences.find((preference) => preference.event === event && preference.channel === channel)?.enabled ?? false;
}
