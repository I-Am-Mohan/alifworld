import { describe, expect, it } from 'bun:test';
import {
  formatLocalizedCurrency,
  formatLocalizedDate,
  formatLocalizedDateTime,
  formatLocalizedNumber,
  formatLocalizedText,
  formatLocalizedTime,
} from '@/shared/utils/localization';

describe('Milestone 057 locale-aware formatting contract', () => {
  it('formats numbers with locale-specific digits and grouping', () => {
    expect(formatLocalizedNumber(1250.5, 'en-BD')).toContain('1,250.5');
    expect(formatLocalizedNumber(1250.5, 'bn-BD')).toContain('১,২৫০.৫');
    expect(formatLocalizedNumber(0, 'bn-BD')).toContain('০');
  });

  it('formats exact BDT poisha without Number conversion', () => {
    expect(formatLocalizedCurrency(0n, 'en-BD')).toBe('BDT 0.00');
    expect(formatLocalizedCurrency(99n, 'en-BD')).toBe('BDT 0.99');
    expect(formatLocalizedCurrency(-125050n, 'en-BD')).toBe('BDT -1,250.50');
    expect(formatLocalizedCurrency(900719925474099199n, 'en-BD')).toBe('BDT 9,007,199,254,740,991.99');
    expect(formatLocalizedCurrency(125050n, 'bn-BD')).toContain('৳');
  });

  it('uses Asia/Dhaka for date, time, and datetime output', () => {
    const instant = new Date('2026-09-22T18:30:00.000Z');
    expect(formatLocalizedDate(instant, 'en-BD')).toContain('23');
    expect(formatLocalizedTime(instant, 'en-BD')).toMatch(/12:30/);
    expect(formatLocalizedDateTime(instant, 'bn-BD')).toContain('2026');
    expect(() => formatLocalizedDate(new Date('invalid'), 'en-BD')).toThrow('Invalid date value');
  });

  it('interpolates text as literal values and preserves missing placeholders', () => {
    expect(formatLocalizedText('Order {orderNumber}: {count}', { orderNumber: 'ORD-1', count: 2 })).toBe('Order ORD-1: 2');
    expect(formatLocalizedText('Hello {name}', {})).toBe('Hello {name}');
    expect(formatLocalizedText('<b>{value}</b>', { value: '<script>' })).toBe('<b><script></b>');
  });
});
