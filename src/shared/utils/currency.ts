/**
 * Canonical Currency & Poisha Utilities for AlifWorld
 * Locked Invariant: 1 BDT = 100 Poisha. Zero floating point currency storage.
 * Reference: docs/architecture/domain-glossary-and-ubiquitous-language.md
 */

import { Poisha, toPoisha, ProductPoint } from '../types/domain-terms';

/**
 * Formats integer Poisha into standard BDT currency representation (e.g., ৳1,250.50 or ১,২৫০.৫০ ৳)
 */
export function formatPoishaToBdt(
  poisha: Poisha | number,
  locale: 'bn-BD' | 'en-BD' = 'bn-BD'
): string {
  const bdtValue = (poisha as number) / 100;

  if (locale === 'bn-BD') {
    const formatted = new Intl.NumberFormat('bn-BD', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(bdtValue);
    return `৳${formatted}`;
  }

  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(bdtValue);
  return `BDT ${formatted}`;
}

/**
 * Parses user input (string or float number) into exact integer Poisha without precision loss.
 */
export function parseBdtToPoisha(bdtInput: string | number): Poisha {
  const num = typeof bdtInput === 'string' ? parseFloat(bdtInput) : bdtInput;
  if (isNaN(num)) {
    throw new Error(`Invalid BDT currency input: ${bdtInput}`);
  }
  return toPoisha(num);
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
