/**
 * Canonical Date & Timezone Utilities for AlifWorld
 * Locked Invariant: Asia/Dhaka timezone for all business period cutoffs
 * Reference: docs/architecture/domain-glossary-and-ubiquitous-language.md
 */

export const DHAKA_TIMEZONE = 'Asia/Dhaka';

export type DhakaPeriodCadence = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface DhakaPeriodBounds {
  start: Date;
  end: Date;
  timezone: typeof DHAKA_TIMEZONE;
  cadence: DhakaPeriodCadence;
}

export interface DhakaPeriodOptions {
  date?: Date;
  cadence: DhakaPeriodCadence;
  /** JavaScript weekday: 0 Sunday through 6 Saturday. Used only for WEEKLY. */
  weekStartsOn?: number;
  /** Configurable local business-day start. Defaults to midnight. */
  startHour?: number;
  startMinute?: number;
}

function dhakaParts(date: Date): Record<string, number> {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: DHAKA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  return Object.fromEntries(
    parts.filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)])
  ) as Record<string, number>;
}

function fromDhakaParts(parts: { year: number; month: number; day: number; hour: number; minute: number; second?: number; millisecond?: number }): Date {
  const targetUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second ?? 0, parts.millisecond ?? 0);
  const rendered = dhakaParts(new Date(targetUtc));
  const renderedUtc = Date.UTC(rendered.year, rendered.month - 1, rendered.day, rendered.hour, rendered.minute, rendered.second, parts.millisecond ?? 0);
  return new Date(targetUtc + (targetUtc - renderedUtc));
}

function addCalendarDays(parts: { year: number; month: number; day: number }, days: number) {
  const value = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return { year: value.getUTCFullYear(), month: value.getUTCMonth() + 1, day: value.getUTCDate() };
}

/** Returns a stable local ISO representation in Asia/Dhaka, without pretending it is UTC. */
export function getDhakaIsoString(date: Date = new Date()): string {
  const parts = dhakaParts(date);
  return `${parts.year.toString().padStart(4, '0')}-${parts.month.toString().padStart(2, '0')}-${parts.day.toString().padStart(2, '0')}T${parts.hour.toString().padStart(2, '0')}:${parts.minute.toString().padStart(2, '0')}:${parts.second.toString().padStart(2, '0')}`;
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

/** Computes the configured local business-day start in Asia/Dhaka. */
export function getDhakaStartOfDay(date: Date = new Date(), startHour = 0, startMinute = 0): Date {
  const parts = dhakaParts(date);
  return fromDhakaParts({
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: startHour,
    minute: startMinute,
  });
}

/** Returns the inclusive end of the configured Dhaka business day. */
export function getDhakaEndOfDay(date: Date = new Date(), startHour = 0, startMinute = 0): Date {
  const next = getDhakaPeriodBounds({ date, cadence: 'DAILY', startHour, startMinute });
  return new Date(next.end.getTime());
}

/**
 * Computes deterministic period boundaries in Asia/Dhaka.
 * Weekly boundaries require an explicit or documented `weekStartsOn`; Monday is the default engineering convention.
 */
export function getDhakaPeriodBounds(options: DhakaPeriodOptions): DhakaPeriodBounds {
  const date = options.date ?? new Date();
  const cadence = options.cadence;
  const startHour = options.startHour ?? 0;
  const startMinute = options.startMinute ?? 0;
  if (!Number.isInteger(startHour) || startHour < 0 || startHour > 23) throw new Error('startHour must be between 0 and 23.');
  if (!Number.isInteger(startMinute) || startMinute < 0 || startMinute > 59) throw new Error('startMinute must be between 0 and 59.');

  const current = dhakaParts(date);
  let start = { year: current.year, month: current.month, day: current.day };

  if (cadence === 'WEEKLY') {
    const weekStartsOn = options.weekStartsOn ?? 1;
    if (!Number.isInteger(weekStartsOn) || weekStartsOn < 0 || weekStartsOn > 6) throw new Error('weekStartsOn must be between 0 and 6.');
    const weekday = new Date(Date.UTC(current.year, current.month - 1, current.day)).getUTCDay();
    start = addCalendarDays(start, -((weekday - weekStartsOn + 7) % 7));
  } else if (cadence === 'MONTHLY') {
    start = { year: current.year, month: current.month, day: 1 };
  } else if (cadence === 'YEARLY') {
    start = { year: current.year, month: 1, day: 1 };
  }

  const startDate = fromDhakaParts({ ...start, hour: startHour, minute: startMinute });
  let next: { year: number; month: number; day: number };
  if (cadence === 'DAILY') next = addCalendarDays(start, 1);
  else if (cadence === 'WEEKLY') next = addCalendarDays(start, 7);
  else if (cadence === 'MONTHLY') next = addCalendarDays({ year: start.month === 12 ? start.year + 1 : start.year, month: start.month === 12 ? 1 : start.month + 1, day: 1 }, 0);
  else next = { year: start.year + 1, month: 1, day: 1 };

  const nextStart = fromDhakaParts({ ...next, hour: startHour, minute: startMinute });
  return { start: startDate, end: new Date(nextStart.getTime() - 1), timezone: DHAKA_TIMEZONE, cadence };
}
