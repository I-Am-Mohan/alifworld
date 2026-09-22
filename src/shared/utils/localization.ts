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
export function formatLocalizedCurrency(
  poisha: bigint | number,
  locale: string = 'bn-BD'
): string {
  const canonical = normalizeToCanonicalLocale(locale);
  const minorUnits = typeof poisha === 'bigint' ? poisha : (() => {
    if (!Number.isSafeInteger(poisha)) {
      throw new Error('Poisha number inputs must be safe integers. Use bigint for large amounts.');
    }
    return BigInt(poisha);
  })();
  const negative = minorUnits < 0n;
  const absolute = negative ? -minorUnits : minorUnits;
  const whole = absolute / 100n;
  const fraction = (absolute % 100n).toString().padStart(2, '0');
  const formattedWhole = new Intl.NumberFormat('en-US').format(whole);
  const formatted = `${negative ? '-' : ''}${formattedWhole}.${fraction}`;
  return canonical === 'bn-BD' ? `৳${toBengaliNumerals(formatted)}` : `BDT ${formatted}`;
}

/**
 * Formats a number with Bengali numerals if the locale is bn-BD.
 */
export function formatLocalizedNumber(
  value: number | string,
  locale: string = 'bn-BD'
): string {
  const canonical = normalizeToCanonicalLocale(locale);
  if (canonical === 'bn-BD') {
    return toBengaliNumerals(value);
  }
  return String(value);
}

/**
 * Formats a Date in Asia/Dhaka timezone according to the specified locale.
 */
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
  const canonical = normalizeToCanonicalLocale(locale);
  return new Intl.DateTimeFormat(canonical, {
    timeZone: DHAKA_TIMEZONE,
    ...options,
  }).format(date);
}

/**
 * Formats a Date (date only) in Asia/Dhaka timezone.
 */
export function formatLocalizedDate(
  date: Date,
  locale: string = 'bn-BD'
): string {
  return formatLocalizedDateTime(date, locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export { parseBengaliNumerals, toBengaliNumerals, DHAKA_TIMEZONE };
