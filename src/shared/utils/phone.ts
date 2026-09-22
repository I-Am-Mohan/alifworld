/**
 * Bangladesh Phone Number Normalization & Validation Utility
 * 
 * Enforces strict E.164 compliance for all Bangladesh mobile numbers:
 * +8801[3-9]XXXXXXXX (14 characters total)
 * 
 * Reference: docs/architecture/scope-boundaries-and-domain-map.md
 * Invariant: ADR-0005, ADR-0023
 */

import { ValidationError } from '@/shared/errors/app-error';

// Regex for strict Bangladesh mobile numbers in E.164 format:
// +880 (country code) + 1 (mobile prefix) + [3-9] (operator) + 8 digits
export const BD_PHONE_E164_REGEX = /^\+8801[3-9]\d{8}$/;

/**
 * Validates whether a phone number matches the strict Bangladesh E.164 standard.
 */
export function isValidBangladeshPhone(phone: unknown): phone is string {
  if (typeof phone !== 'string') {
    return false;
  }
  return BD_PHONE_E164_REGEX.test(phone.trim());
}

/**
 * Normalizes an arbitrary Bangladesh phone input string to E.164 format.
 * Strips whitespace, dashes, brackets, and leading trunk zeros.
 * 
 * Handles formats:
 * - 017XXXXXXXX -> +88017XXXXXXXX
 * - 88017XXXXXXXX -> +88017XXXXXXXX
 * - +88017XXXXXXXX -> +88017XXXXXXXX
 * - +880 17XX-XXXXXX -> +88017XXXXXXXX
 * 
 * Throws ValidationError if input cannot be normalized to a valid BD mobile number.
 */
export function normalizeBangladeshPhone(rawPhone: string): string {
  if (!rawPhone || typeof rawPhone !== 'string') {
    throw new ValidationError('Phone number must be a non-empty string', { rawPhone });
  }

  // Remove spaces, hyphens, parentheses, and dots
  let cleaned = rawPhone.trim().replace(/[\s\-().]/g, '');

  // Strip leading international prefix double zeros (00880...)
  if (cleaned.startsWith('00880')) {
    cleaned = '+' + cleaned.slice(2);
  }

  // Handle formats:
  if (cleaned.startsWith('+880')) {
    // Already has +880
  } else if (cleaned.startsWith('880')) {
    cleaned = '+' + cleaned;
  } else if (cleaned.startsWith('01') && cleaned.length === 11) {
    // Standard national 11-digit format starting with 01...
    cleaned = '+880' + cleaned.slice(1);
  } else if (cleaned.startsWith('1') && cleaned.length === 10) {
    // 10-digit without leading zero: 17XXXXXXXX
    cleaned = '+880' + cleaned;
  }

  if (!BD_PHONE_E164_REGEX.test(cleaned)) {
    throw new ValidationError(
      `Invalid Bangladesh phone number format: '${rawPhone}'. Must be a valid 11-digit BD mobile number (e.g. +8801712345678 or 01712345678).`,
      { rawPhone, normalizedAttempt: cleaned }
    );
  }

  return cleaned;
}

/**
 * Formats a normalized E.164 BD phone number for human-readable national display.
 * Example: +8801712345678 -> 01712-345678
 */
export function formatBangladeshPhoneNational(phone: string): string {
  const normalized = normalizeBangladeshPhone(phone);
  // +880 1712 345678 -> 01712-345678
  const nationalDigits = '0' + normalized.slice(4); // 01712345678
  return `${nationalDigits.slice(0, 5)}-${nationalDigits.slice(5)}`;
}
