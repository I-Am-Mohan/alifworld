/**
 * Canonical Date & Timezone Utilities for AlifWorld
 * Locked Invariant: Asia/Dhaka timezone for all business period cutoffs
 * Reference: docs/architecture/domain-glossary-and-ubiquitous-language.md
 */

export const DHAKA_TIMEZONE = 'Asia/Dhaka';

/**
 * Returns current ISO string formatted in Asia/Dhaka time.
 */
export function getDhakaIsoString(date: Date = new Date()): string {
  return date.toLocaleString('en-US', { timeZone: DHAKA_TIMEZONE });
}

/**
 * Formats a given Date for localized display in Bangladesh.
 */
export function formatDhakaDateTime(
  date: Date,
  locale: 'bn-BD' | 'en-BD' = 'bn-BD'
): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: DHAKA_TIMEZONE,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/**
 * Computes midnight cutoff Date for daily, weekly, or monthly club cycles in Asia/Dhaka.
 */
export function getDhakaStartOfDay(date: Date = new Date()): Date {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: DHAKA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const dateParts = formatter.format(date); // YYYY-MM-DD
  // Dhaka is UTC+6
  return new Date(`${dateParts}T00:00:00+06:00`);
}
