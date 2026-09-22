import { describe, it, expect } from 'bun:test';
import {
  parseCurrencies,
  formatCurrencyAmount,
  DEFAULT_CURRENCIES,
  CurrencyConfig,
} from '@/shared/types/currency';

describe('3-Option Currency Management & Formatter', () => {
  it('should load default currencies with name, symbol, and position when input is empty', () => {
    const list = parseCurrencies(null);
    expect(list.length).toBeGreaterThanOrEqual(2);
    expect(list[0]).toEqual({ name: 'BDT', symbol: '৳', position: 'left' });
    expect(list[1]).toEqual({ name: 'USD', symbol: '$', position: 'left' });
  });

  it('should correctly parse JSON string with custom positions', () => {
    const input = JSON.stringify([
      { name: 'BDT', symbol: '৳', position: 'left' },
      { name: 'INR', symbol: '₹', position: 'left' },
      { name: 'EUR', symbol: '€', position: 'right' },
    ]);
    const parsed = parseCurrencies(input);
    expect(parsed).toHaveLength(3);
    expect(parsed[0]).toEqual({ name: 'BDT', symbol: '৳', position: 'left' });
    expect(parsed[1]).toEqual({ name: 'INR', symbol: '₹', position: 'left' });
    expect(parsed[2]).toEqual({ name: 'EUR', symbol: '€', position: 'right' });
  });

  it('should parse legacy comma-separated string and apply default position and symbols', () => {
    const parsed = parseCurrencies('BDT,USD,INR');
    expect(parsed).toHaveLength(3);
    expect(parsed[0]).toEqual({ name: 'BDT', symbol: '৳', position: 'left' });
    expect(parsed[1]).toEqual({ name: 'USD', symbol: '$', position: 'left' });
    expect(parsed[2]).toEqual({ name: 'INR', symbol: '₹', position: 'left' });
  });

  it('should format money on the left when position is left', () => {
    const bdtConfig: CurrencyConfig = { name: 'BDT', symbol: '৳', position: 'left' };
    const formatted = formatCurrencyAmount(1500, bdtConfig);
    expect(formatted).toBe('৳ 1,500.00');
  });

  it('should format money on the right when position is right', () => {
    const eurConfig: CurrencyConfig = { name: 'EUR', symbol: '€', position: 'right' };
    const formatted = formatCurrencyAmount(1500, eurConfig);
    expect(formatted).toBe('1,500.00 €');
  });

  it('should support BigInt poisha conversion to fractional currency', () => {
    const inrConfig: CurrencyConfig = { name: 'INR', symbol: '₹', position: 'left' };
    // 250000 paise = 2500.00
    const formatted = formatCurrencyAmount(BigInt(250000), inrConfig);
    expect(formatted).toBe('₹ 2,500.00');
  });

  it('should correctly toggle position between left and right', () => {
    const curr: CurrencyConfig = { name: 'USD', symbol: '$', position: 'left' };
    const toggled: CurrencyConfig = {
      ...curr,
      position: curr.position === 'left' ? 'right' : 'left',
    };
    expect(toggled.position).toBe('right');
    expect(formatCurrencyAmount(100, toggled)).toBe('100.00 $');
  });
});
