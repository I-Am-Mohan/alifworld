/**
 * AlifWorld Canonical Localization & Formatting Utilities
 * 
 * Provides unified formatting for:
 * 1. BDT currency and integer poisha (৳1,250.50 / ১,২৫০.৫০ ৳)
 * 2. Bengali numerals (০-৯) vs ASCII digits (0-9)
 * 3. Asia/Dhaka timezone dates and business periods
 * 
 * Invariants: ADR-0003, ADR-0022, Phase 06 Milestone 051
 */

import { DHAKA_TIMEZONE } from './date';
import { parseBengaliNumerals, toBengaliNumerals } from './phone';
import { CanonicalLocale } from '@/i18n/types';
import { normalizeToCanonicalLocale } from '@/i18n/config';

/**
 * Formats integer Poisha into localized BDT currency string.
 * - bn-BD: '৳১,২৫০.৫০'
 * - en-BD: 'BDT 1,250.50'
 */
export type LocalizedDateStyle = 'date' | 'time' | 'datetime';

function asSafeIntegerPoisha(value: bigint | number): bigint {
  if (typeof value === 'bigint') return value;
  if (!Number.isSafeInteger(value)) {
    throw new Error('Poisha number inputs must be safe integers. Use bigint for large amounts.');
  }
  return BigInt(value);
}

/** Formats a number using the active Bangladesh locale and never silently accepts NaN. */
export function formatLocalizedNumber(
  value: number | bigint,
  locale: string = 'bn-BD',
  options: Intl.NumberFormatOptions = {}
): string {
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new Error('Number values must be finite.');
  }
  const canonical = normalizeToCanonicalLocale(locale);
  const formatted = new Intl.NumberFormat('en-US', options).format(value);
  return canonical === 'bn-BD' ? toBengaliNumerals(formatted) : formatted;
}

/** Formats integer poisha exactly as BDT without converting bigint through Number. */
export function formatLocalizedCurrency(
  poisha: bigint | number,
  locale: string = 'bn-BD'
): string {
  const canonical = normalizeToCanonicalLocale(locale);
  const minorUnits = asSafeIntegerPoisha(poisha);
  const negative = minorUnits < 0n;
  const absolute = negative ? -minorUnits : minorUnits;
  const whole = absolute / 100n;
  const fraction = (absolute % 100n).toString().padStart(2, '0');
  const formattedWhole = new Intl.NumberFormat('en-US').format(whole);
  const decimal = '.';
  const sign = negative ? '-' : '';
  const amount = `${sign}${formattedWhole}${decimal}${fraction}`;
  return canonical === 'bn-BD' ? `৳${toBengaliNumerals(amount)}` : `BDT ${amount}`;
}

/**
 * Formats a Date in Asia/Dhaka timezone according to the specified locale.
 */
function assertValidDate(date: Date): void {
  if (Number.isNaN(date.getTime())) throw new Error('Invalid date value.');
}

export function formatLocalizedDateTime(
  date: Date,
  locale: string = 'bn-BD',
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }
): string {
  assertValidDate(date);
  const canonical = normalizeToCanonicalLocale(locale);
  return new Intl.DateTimeFormat(canonical, {
    timeZone: DHAKA_TIMEZONE,
    ...options,
  }).format(date);
}

/** Formats a Date (date only) in the fixed Asia/Dhaka timezone. */
export function formatLocalizedDate(date: Date, locale: string = 'bn-BD'): string {
  return formatLocalizedDateTime(date, locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Formats a time in the fixed Asia/Dhaka timezone. */
export function formatLocalizedTime(date: Date, locale: string = 'bn-BD'): string {
  return formatLocalizedDateTime(date, locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

/** Safely interpolates text values without evaluating markup or executable content. */
export function formatLocalizedText(
  template: string,
  params: Record<string, string | number | bigint> = {}
): string {
  return template.replace(/\{([A-Za-z0-9_.-]+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match
  );
}

export { parseBengaliNumerals, toBengaliNumerals, DHAKA_TIMEZONE };
