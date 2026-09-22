/**
 * Canonical Currency & Poisha Utilities for AlifWorld
 * Locked Invariant: 1 BDT = 100 Poisha. Zero floating point currency storage.
 * Reference: docs/architecture/domain-glossary-and-ubiquitous-language.md
 */

import { Poisha, toPoisha, ProductPoint } from '../types/domain-terms';
import { toBengaliNumerals } from './phone';

function asPoisha(value: Poisha | bigint | number): bigint {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) {
      throw new Error('Poisha number inputs must be safe integers. Use bigint for large amounts.');
    }
    return BigInt(value);
  }
  return BigInt(value);
}

function formatMinorUnits(minorUnits: bigint, fractionDigits: number, locale: 'bn-BD' | 'en-BD'): string {
  const negative = minorUnits < 0n;
  const absolute = negative ? -minorUnits : minorUnits;
  const divisor = 10n ** BigInt(fractionDigits);
  const whole = absolute / divisor;
  const fraction = fractionDigits === 0 ? '' : `.${(absolute % divisor).toString().padStart(fractionDigits, '0')}`;
  const formattedWhole = new Intl.NumberFormat(locale === 'bn-BD' ? 'en-US' : 'en-US').format(whole);
  const result = `${negative ? '-' : ''}${formattedWhole}${fraction}`;
  return locale === 'bn-BD' ? toBengaliNumerals(result) : result;
}

/** Formats integer Poisha without converting through a floating-point number. */
export function formatPoishaToBdt(
  poisha: Poisha | bigint | number,
  locale: 'bn-BD' | 'en-BD' = 'bn-BD'
): string {
  const formatted = formatMinorUnits(asPoisha(poisha), 2, locale);
  return locale === 'bn-BD' ? `৳${formatted}` : `BDT ${formatted}`;
}

/** Parses a BDT amount exactly; excess fractional precision and malformed input are rejected. */
export function parseBdtToPoisha(bdtInput: string | number | bigint): Poisha {
  return toPoisha(bdtInput);
}

/**
 * Formats Product Points with localized numerals.
 */
export function formatProductPoints(
  points: ProductPoint | number,
  locale: 'bn-BD' | 'en-BD' = 'bn-BD'
): string {
  const num = points as number;
  if (locale === 'bn-BD') {
    return `${new Intl.NumberFormat('bn-BD').format(num)} পয়েন্ট`;
  }
  return `${new Intl.NumberFormat('en-US').format(num)} PP`;
}

/**
 * Safely converts object properties containing BigInt values into strings
 * so the object can be serialized cleanly by JSON.stringify / NextResponse.json.
 */
export function serializeBigInt<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );
}
