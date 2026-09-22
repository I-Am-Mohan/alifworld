/**
 * Bangladesh Phone Number Normalization, Validation & Operator Identification Utility
 * 
 * Enforces strict E.164 compliance for all Bangladesh mobile numbers:
 * +8801[3-9]XXXXXXXX (14 characters total)
 * 
 * Capabilities:
 * 1. Normalization to standard E.164 (+8801XXXXXXXXX).
 * 2. Mobile Network Operator (MNO) detection (Grameenphone, Banglalink, Robi/Airtel, Teletalk).
 * 3. Bengali numeral normalization (০১২৩৪৫৬৭৮৯ -> 0123456789).
 * 4. Privacy-safe phone masking for logs, SMS notifications, and UI display.
 * 5. National and Bengali display formatting (01712-345678 / ০১৭১২-৩৪৫৬৭৮).
 * 
 * Reference: docs/architecture/scope-boundaries-and-domain-map.md
 * Milestone: 038 (Design Bangladesh phone normalization and OTP authentication)
 * Invariants: ADR-0005, ADR-0023, ADR-0031
 */

import { ValidationError } from '@/shared/errors/app-error';

// Regex for strict Bangladesh mobile numbers in E.164 format:
// +880 (country code) + 1 (mobile prefix) + [3-9] (operator code) + 8 digits
export const BD_PHONE_E164_REGEX = /^\+8801[3-9]\d{8}$/;

// Bengali Numerals Mapping
export const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'] as const;

export const BENGALI_TO_ASCII_MAP: Record<string, string> = {
  '০': '0',
  '১': '1',
  '২': '2',
  '৩': '3',
  '৪': '4',
  '৫': '5',
  '৬': '6',
  '৭': '7',
  '৮': '8',
  '৯': '9',
};

export const ASCII_TO_BENGALI_MAP: Record<string, string> = {
  '0': '০',
  '1': '১',
  '2': '২',
  '3': '৩',
  '4': '৪',
  '5': '৫',
  '6': '৬',
  '7': '৭',
  '8': '৮',
  '9': '৯',
};

/**
 * Converts Bengali numeric characters (০-৯) in an input string to ASCII digits (0-9).
 * Preserves all other non-Bengali characters unchanged.
 */
export function parseBengaliNumerals(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input.replace(/[০-৯]/g, (char) => BENGALI_TO_ASCII_MAP[char] || char);
}

/**
 * Converts ASCII digits (0-9) to Bengali numeric characters (০-৯).
 */
export function toBengaliNumerals(input: string | number): string {
  if (input === null || input === undefined) return '';
  return String(input).replace(/[0-9]/g, (char) => ASCII_TO_BENGALI_MAP[char] || char);
}

// ------------------------------------------------------------------------------
// Bangladesh Mobile Network Operators (MNO)
// ------------------------------------------------------------------------------
export type BangladeshMobileOperatorCode =
  | 'GRAMEENPHONE'
  | 'BANGLALINK'
  | 'ROBI'
  | 'TELETALK';

export interface BangladeshMobileOperator {
  code: BangladeshMobileOperatorCode;
  name: string;
  brand: string;
  prefixes: string[]; // 3-digit national prefixes (e.g. ['017', '013'])
  isGovernmentOwned: boolean;
}

export const BANGLADESH_OPERATORS: Record<
  BangladeshMobileOperatorCode,
  BangladeshMobileOperator
> = {
  GRAMEENPHONE: {
    code: 'GRAMEENPHONE',
    name: 'Grameenphone',
    brand: 'GP / Skitto',
    prefixes: ['017', '013'],
    isGovernmentOwned: false,
  },
  BANGLALINK: {
    code: 'BANGLALINK',
    name: 'Banglalink',
    brand: 'Banglalink Digital',
    prefixes: ['019', '014'],
    isGovernmentOwned: false,
  },
  ROBI: {
    code: 'ROBI',
    name: 'Robi Axiata',
    brand: 'Robi / Airtel',
    prefixes: ['018', '016'],
    isGovernmentOwned: false,
  },
  TELETALK: {
    code: 'TELETALK',
    name: 'Teletalk Bangladesh',
    brand: 'Teletalk',
    prefixes: ['015'],
    isGovernmentOwned: true,
  },
};

// Map of 3-digit prefix (e.g. '017', '013') to Operator
export const OPERATOR_PREFIX_MAP: Record<string, BangladeshMobileOperator> = {
  '013': BANGLADESH_OPERATORS.GRAMEENPHONE,
  '017': BANGLADESH_OPERATORS.GRAMEENPHONE,
  '014': BANGLADESH_OPERATORS.BANGLALINK,
  '019': BANGLADESH_OPERATORS.BANGLALINK,
  '016': BANGLADESH_OPERATORS.ROBI,
  '018': BANGLADESH_OPERATORS.ROBI,
  '015': BANGLADESH_OPERATORS.TELETALK,
};

/**
 * Detects the Bangladesh Mobile Network Operator (MNO) for a phone number.
 * Accepts any raw or normalized phone format.
 * Returns the operator object or null if not a recognized Bangladesh mobile number.
 */
export function getBangladeshMobileOperator(
  rawPhone: string
): BangladeshMobileOperator | null {
  try {
    const normalized = normalizeBangladeshPhone(rawPhone);
    // +880 17... -> national prefix is '0' + slice(4, 6)
    const nationalPrefix = '0' + normalized.slice(4, 6);
    return OPERATOR_PREFIX_MAP[nationalPrefix] || null;
  } catch {
    return null;
  }
}

/**
 * Validates whether a phone number matches the strict Bangladesh E.164 standard (+8801[3-9]\d{8})
 * and has an active licensed operator prefix.
 */
export function isValidBangladeshPhone(phone: unknown): phone is string {
  if (typeof phone !== 'string') {
    return false;
  }
  const clean = phone.trim();
  if (!BD_PHONE_E164_REGEX.test(clean)) {
    return false;
  }
  const nationalPrefix = '0' + clean.slice(4, 6);
  return Boolean(OPERATOR_PREFIX_MAP[nationalPrefix]);
}

/**
 * Normalizes an arbitrary Bangladesh phone input string to strict E.164 format.
 * Handles Bengali numerals, removes formatting characters, and maps valid national
 * prefixes to standard E.164 (+8801XXXXXXXXX).
 * 
 * Handles input formats:
 * - 017XXXXXXXX / ০১৭১XXXXXXX -> +88017XXXXXXXX
 * - 88017XXXXXXXX -> +88017XXXXXXXX
 * - +88017XXXXXXXX -> +88017XXXXXXXX
 * - +880 17XX-XXXXXX -> +88017XXXXXXXX
 * - 17XXXXXXXX (10 digits without leading 0) -> +88017XXXXXXXX
 * - 0088017XXXXXXXX -> +88017XXXXXXXX
 * 
 * Rejects defunct CDMA/invalid operators (e.g. 010, 011, 012).
 * Throws ValidationError if input cannot be normalized to a valid BD mobile number.
 */
export function normalizeBangladeshPhone(rawPhone: string): string {
  if (!rawPhone || typeof rawPhone !== 'string') {
    throw new ValidationError('Phone number must be a non-empty string', { rawPhone });
  }

  // 1. Translate Bengali numerals to ASCII (০-৯ -> 0-9)
  const converted = parseBengaliNumerals(rawPhone);

  // 2. Remove whitespace, dashes, parentheses, plus-signs, and dots for preprocessing
  let cleaned = converted.trim().replace(/[\s\-().]/g, '');

  // 3. Handle leading international prefix double zeros (00880...)
  if (cleaned.startsWith('00880')) {
    cleaned = '+' + cleaned.slice(2);
  }

  // 4. Canonicalize to +880 prefix
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

  // 5. Enforce strict E.164 regex pattern
  if (!BD_PHONE_E164_REGEX.test(cleaned)) {
    throw new ValidationError(
      `Invalid Bangladesh phone number format: '${rawPhone}'. Must be a valid 11-digit BD mobile number (e.g. +8801712345678 or 01712345678).`,
      { rawPhone, normalizedAttempt: cleaned }
    );
  }

  // 6. Validate operator prefix (rejects defunct 010, 011 Citycell, 012)
  const nationalPrefix = '0' + cleaned.slice(4, 6);
  if (!OPERATOR_PREFIX_MAP[nationalPrefix]) {
    throw new ValidationError(
      `Unsupported or invalid mobile operator prefix: '${nationalPrefix}' in '${rawPhone}'. Supported prefixes: 013, 014, 015, 016, 017, 018, 019.`,
      { rawPhone, prefix: nationalPrefix }
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

/**
 * Formats a normalized E.164 BD phone number with Bengali numerals.
 * Example: +8801712345678 -> ০১৭১২-৩৪৫৬৭৮
 */
export function formatBangladeshPhoneBengali(phone: string): string {
  const national = formatBangladeshPhoneNational(phone);
  return toBengaliNumerals(national);
}

/**
 * Formats a normalized BD phone number in international spaced format.
 * Example: +8801712345678 -> +880 1712-345678
 */
export function formatBangladeshPhoneInternational(phone: string): string {
  const normalized = normalizeBangladeshPhone(phone);
  const nationalDigits = '0' + normalized.slice(4); // 01712345678
  return `+880 ${nationalDigits.slice(1, 5)}-${nationalDigits.slice(5)}`;
}

/**
 * Masks a Bangladesh phone number to redact customer personal digits for privacy
 * in audit logs, SMS notification confirmations, and UI display.
 * 
 * Preserves operator prefix and final 3 digits while masking intermediate digits:
 * - standard (+880 17***-**678): Keeps operator prefix + last 3 digits
 * - minimal (+880 1712-***678): Keeps first 4 digits + last 3 digits
 * - national (017**-***678): National 11-digit format masked
 */
export function maskBangladeshPhone(
  phone: string,
  style: 'standard' | 'minimal' | 'national' = 'standard'
): string {
  try {
    const normalized = normalizeBangladeshPhone(phone);
    const nationalDigits = '0' + normalized.slice(4); // e.g. 01712345678
    const operator = nationalDigits.slice(0, 3); // '017'
    const last3 = nationalDigits.slice(-3); // '678'

    if (style === 'national') {
      // 017**-***678
      return `${operator}**-***${last3}`;
    }

    if (style === 'minimal') {
      // +880 1712-***678
      return `+880 ${nationalDigits.slice(1, 5)}-***${last3}`;
    }

    // Default 'standard': +880 17***-**678
    return `+880 ${operator.slice(1)}***-**${last3}`;
  } catch {
    // Fallback for non-BD phone strings: mask all but last 3 chars
    if (typeof phone === 'string' && phone.length > 4) {
      return '*'.repeat(phone.length - 3) + phone.slice(-3);
    }
    return '***';
  }
}
