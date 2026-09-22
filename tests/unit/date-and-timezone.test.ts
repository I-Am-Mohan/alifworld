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
});
