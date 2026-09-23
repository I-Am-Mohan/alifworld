import { describe, expect, it } from 'bun:test';
import { z } from 'zod';
import { bn } from '@/i18n/translations/bn';
import { en } from '@/i18n/translations/en';
import { formatLocalizedText } from '@/shared/utils/localization';
import { getTransactionalTemplate, renderNotificationTemplate, shouldDeliverNotification } from '@/features/notifications/notification-contract';
import { notificationIdempotencyKey } from '@/features/notifications/notification-service';
import { validationDetails, localizedErrorMessage } from '@/shared/api/error-response';
import { UnauthorizedError } from '@/shared/errors/app-error';

const preferences = [
  { event: 'MARKETING' as const, channel: 'EMAIL' as const, enabled: true },
  { event: 'MARKETING' as const, channel: 'SMS' as const, enabled: false },
];

describe('Milestone 058 localized errors and notifications', () => {
  it('keeps localized error catalogs available in both launch locales', () => {
    expect(en.errors.VALIDATION_FAILED).toBeTruthy();
    expect(bn.errors.VALIDATION_FAILED).toBeTruthy();
    expect(formatLocalizedText(en.transactional.emailVerificationBody, { code: '123456' })).toContain('123456');
    expect(formatLocalizedText(bn.transactional.emailVerificationBody, { code: '123456' })).toContain('123456');
  });

  it('preserves specific error fallback messages over generic error code keys when messageKey is omitted', () => {
    const error = new UnauthorizedError('Invalid email/phone or password');
    const msg = localizedErrorMessage(error.errorCode, error.message, 'en-BD', {}, error.messageKey);
    expect(msg).toBe('Invalid email/phone or password');
  });

  it('normalizes Zod issues into stable API detail records', () => {
    const result = z.object({ email: z.string().email() }).safeParse({ email: 'invalid' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(validationDetails(result.error)[0]).toMatchObject({ path: 'email', code: 'invalid_string' });
    }
  });

  it('renders transactional templates using locale and placeholders', () => {
    const body = getTransactionalTemplate('emailVerificationBody', 'bn-BD');
    const rendered = renderNotificationTemplate(
      { key: 'email-verification', body, locale: 'bn-BD', required: true },
      { code: '654321' }
    );
    expect(rendered.locale).toBe('bn-BD');
    expect(rendered.body).toContain('654321');
  });

  it('always delivers security and transactional events', () => {
    expect(shouldDeliverNotification('SECURITY', 'EMAIL', [])).toBe(true);
    expect(shouldDeliverNotification('TRANSACTIONAL', 'SMS', [])).toBe(true);
  });

  it('respects marketing channel preferences', () => {
    expect(shouldDeliverNotification('MARKETING', 'EMAIL', preferences)).toBe(true);
    expect(shouldDeliverNotification('MARKETING', 'SMS', preferences)).toBe(false);
    expect(shouldDeliverNotification('MARKETING', 'PUSH', preferences)).toBe(false);
  });

  it('creates deterministic delivery idempotency keys', () => {
    const input = {
      userId: 'usr_123',
      event: 'TRANSACTIONAL' as const,
      channel: 'EMAIL' as const,
      templateKey: 'orderConfirmationSubject',
      locale: 'en-BD',
      eventId: 'ord_123',
    };
    expect(notificationIdempotencyKey(input)).toBe(notificationIdempotencyKey({ ...input }));
    expect(notificationIdempotencyKey(input)).not.toBe(notificationIdempotencyKey({ ...input, eventId: 'ord_456' }));
  });
});
