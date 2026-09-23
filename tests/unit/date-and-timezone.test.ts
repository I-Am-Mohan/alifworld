/**
 * Unit Tests for Asia/Dhaka Date and Timezone Invariants
 * Reference: docs/architecture/domain-glossary-and-ubiquitous-language.md
 */

import { describe, it, expect } from 'bun:test';
import {
  DHAKA_TIMEZONE,
  getDhakaIsoString,
  formatDhakaDateTime,
  getDhakaStartOfDay,
  getDhakaEndOfDay,
  getDhakaPeriodBounds,
} from '@/shared/utils/date';

describe('Domain Primitives: Date & Asia/Dhaka Timezone', () => {
  it('locks canonical timezone constant to Asia/Dhaka', () => {
    expect(DHAKA_TIMEZONE).toBe('Asia/Dhaka');
  });

  it('formats dates in Asia/Dhaka timezone', () => {
    const fixedUtcDate = new Date('2026-09-22T06:00:00Z'); // 12:00 PM in Dhaka (UTC+6)
    const formatted = formatDhakaDateTime(fixedUtcDate, 'en-BD');
    expect(formatted).toContain('2026');
    expect(formatted).toContain('September');
  });

  it('calculates midnight start-of-day in Asia/Dhaka', () => {
    const testDate = new Date('2026-09-22T18:30:00Z'); // 2026-09-23 00:30:00 in Dhaka
    const startOfDay = getDhakaStartOfDay(testDate);
    expect(startOfDay.toISOString()).toContain('2026-09-22T18:00:00.000Z'); // 00:00:00 +06:00 = 18:00:00 UTC previous day
  });

  it('returns a local Dhaka ISO representation without relabeling it as UTC', () => {
    expect(getDhakaIsoString(new Date('2026-09-22T18:00:00Z'))).toBe('2026-09-23T00:00:00');
  });

  it('calculates inclusive daily boundaries', () => {
    const date = new Date('2026-09-22T18:30:00Z');
    expect(getDhakaEndOfDay(date).toISOString()).toBe('2026-09-23T17:59:59.999Z');
  });

  it('calculates configurable weekly, monthly, and yearly boundaries', () => {
    const date = new Date('2026-09-23T12:00:00Z'); // Wednesday in Dhaka
    const weekly = getDhakaPeriodBounds({ date, cadence: 'WEEKLY', weekStartsOn: 6 });
    expect(weekly.start.toISOString()).toBe('2026-09-18T18:00:00.000Z'); // Saturday 00:00 Dhaka
    expect(weekly.end.toISOString()).toBe('2026-09-25T17:59:59.999Z');

    const monthly = getDhakaPeriodBounds({ date, cadence: 'MONTHLY' });
    expect(monthly.start.toISOString()).toBe('2026-08-31T18:00:00.000Z');
    expect(monthly.end.toISOString()).toBe('2026-09-30T17:59:59.999Z');

    const yearly = getDhakaPeriodBounds({ date, cadence: 'YEARLY' });
    expect(yearly.start.toISOString()).toBe('2025-12-31T18:00:00.000Z');
    expect(yearly.end.toISOString()).toBe('2026-12-31T17:59:59.999Z');
  });
});
