/**
 * Unit Tests for Currency, Poisha, and Product Points
 * Locked Invariants:
 * - 1 BDT = 100 Poisha.
 * - Zero floating-point monetary storage.
 * - Product Points are non-convertible discrete integer units.
 * Reference: docs/architecture/domain-glossary-and-ubiquitous-language.md
 */

import { describe, it, expect } from 'bun:test';
import {
  toPoisha,
  fromPoisha,
  toProductPoint,
  Poisha,
} from '@/shared/types/domain-terms';
import { formatPoishaToBdt, parseBdtToPoisha } from '@/shared/utils/currency';
import {
  assertCurrencyCode,
  formatMinorUnitAmount,
  isSupportedCurrencyCode,
} from '@/shared/types/currency';

describe('Domain Primitives: Currency & Product Points', () => {
  describe('Poisha Conversion & Precision', () => {
    it('converts BDT decimal to exact integer Poisha without floating drift', () => {
      expect(toPoisha(100)).toBe(10000n as Poisha);
      expect(toPoisha('12.50')).toBe(1250n as Poisha);
      expect(toPoisha('0.99')).toBe(99n as Poisha);
      expect(toPoisha('0.01')).toBe(1n as Poisha);
    });

    it('converts integer Poisha back to BDT standard value', () => {
      expect(fromPoisha(10000n as Poisha)).toBe('100.00');
      expect(fromPoisha(1250n as Poisha)).toBe('12.50');
      expect(fromPoisha(99n as Poisha)).toBe('0.99');
    });

    it('formats Poisha into localized Bengali and English BDT strings', () => {
      const amount = 125050n as Poisha; // 1,250.50 BDT
      const formattedBn = formatPoishaToBdt(amount, 'bn-BD');
      const formattedEn = formatPoishaToBdt(amount, 'en-BD');

      expect(formattedBn).toContain('৳');
      expect(formattedEn).toContain('BDT');
      expect(formattedEn).toContain('1,250.50');
    });

    it('parses valid user input strings into exact Poisha', () => {
      expect(parseBdtToPoisha('1250.50')).toBe(125050n as Poisha);
      expect(parseBdtToPoisha(500)).toBe(50000n as Poisha);
    });

    it('throws on invalid currency string inputs', () => {
      expect(() => parseBdtToPoisha('invalid-money')).toThrow(/Invalid BDT currency input/);
      expect(() => parseBdtToPoisha('1.001')).toThrow(/Invalid BDT currency input/);
    });

    it('preserves large poisha values without Number conversion', () => {
      expect(parseBdtToPoisha('9007199254740991.99')).toBe(900719925474099199n as Poisha);
    });
  });

  describe('Currency code and minor-unit safety', () => {
    it('accepts supported ISO-style launch currency codes only', () => {
      expect(isSupportedCurrencyCode('BDT')).toBe(true);
      expect(isSupportedCurrencyCode('usd')).toBe(true);
      expect(isSupportedCurrencyCode('XXX')).toBe(false);
      expect(() => assertCurrencyCode('XXX')).toThrow(/Unsupported currency code/);
    });

    it('formats minor units without floating-point conversion', () => {
      expect(formatMinorUnitAmount(900719925474099199n, 'BDT', 'en-BD')).toBe('৳ 9,007,199,254,740,991.99');
    });
  });

  describe('Product Points (PP) Non-Convertibility & Integrity', () => {
    it('instantiates valid non-negative integer Product Points', () => {
      const pp = toProductPoint(250);
      expect(pp).toBe(250 as any);
    });

    it('rejects negative Product Points', () => {
      expect(() => toProductPoint(-10)).toThrow(/Must be a non-negative integer/);
    });

    it('rejects floating-point Product Points', () => {
      expect(() => toProductPoint(15.75)).toThrow(/Must be a non-negative integer/);
    });
  });
});
