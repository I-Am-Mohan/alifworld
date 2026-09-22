/**
 * Unit Tests for Bangladesh Phone Normalization and Validation
 * 
 * Verifies E.164 compliance (+8801[3-9]XXXXXXXX), format stripping,
 * operator code validation, and error handling.
 * 
 * Reference: docs/architecture/scope-boundaries-and-domain-map.md
 * Invariant: ADR-0005, ADR-0023
 */

import { describe, it, expect } from 'bun:test';
import {
  normalizeBangladeshPhone,
  isValidBangladeshPhone,
  formatBangladeshPhoneNational,
  BD_PHONE_E164_REGEX,
} from '@/shared/utils/phone';
import { ValidationError } from '@/shared/errors/app-error';

describe('Bangladesh Phone Number Normalization & Validation', () => {
  it('validates strictly formatted E.164 BD numbers with isValidBangladeshPhone', () => {
    expect(isValidBangladeshPhone('+8801712345678')).toBe(true);
    expect(isValidBangladeshPhone('+8801312345678')).toBe(true);
    expect(isValidBangladeshPhone('+8801412345678')).toBe(true);
    expect(isValidBangladeshPhone('+8801512345678')).toBe(true);
    expect(isValidBangladeshPhone('+8801612345678')).toBe(true);
    expect(isValidBangladeshPhone('+8801812345678')).toBe(true);
    expect(isValidBangladeshPhone('+8801912345678')).toBe(true);

    // Invalid format or non-string
    expect(isValidBangladeshPhone('01712345678')).toBe(false); // not yet normalized to E.164
    expect(isValidBangladeshPhone('+8801212345678')).toBe(false); // invalid operator 12
    expect(isValidBangladeshPhone('+8801112345678')).toBe(false); // invalid operator 11
    expect(isValidBangladeshPhone('+88017123456')).toBe(false); // too short
    expect(isValidBangladeshPhone('+88017123456789')).toBe(false); // too long
    expect(isValidBangladeshPhone(null)).toBe(false);
    expect(isValidBangladeshPhone(undefined)).toBe(false);
  });

  it('normalizes standard 11-digit national format (01XXXXXXXXX) to E.164', () => {
    expect(normalizeBangladeshPhone('01712345678')).toBe('+8801712345678');
    expect(normalizeBangladeshPhone('01300000000')).toBe('+8801300000000');
    expect(normalizeBangladeshPhone('01811223344')).toBe('+8801811223344');
    expect(normalizeBangladeshPhone('01999887766')).toBe('+8801999887766');
  });

  it('normalizes numbers without leading + (8801XXXXXXXXX)', () => {
    expect(normalizeBangladeshPhone('8801712345678')).toBe('+8801712345678');
    expect(normalizeBangladeshPhone('8801812345678')).toBe('+8801812345678');
  });

  it('preserves already valid E.164 numbers (+8801XXXXXXXXX)', () => {
    expect(normalizeBangladeshPhone('+8801712345678')).toBe('+8801712345678');
  });

  it('strips whitespaces, hyphens, and brackets cleanly', () => {
    expect(normalizeBangladeshPhone('01712-345678')).toBe('+8801712345678');
    expect(normalizeBangladeshPhone('+880 1712 345 678')).toBe('+8801712345678');
    expect(normalizeBangladeshPhone('(017) 12-345678')).toBe('+8801712345678');
    expect(normalizeBangladeshPhone('008801712345678')).toBe('+8801712345678');
  });

  it('throws ValidationError when phone number format is invalid', () => {
    expect(() => normalizeBangladeshPhone('12345')).toThrow(ValidationError);
    expect(() => normalizeBangladeshPhone('01112345678')).toThrow(ValidationError); // Invalid operator 011
    expect(() => normalizeBangladeshPhone('01212345678')).toThrow(ValidationError); // Invalid operator 012
    expect(() => normalizeBangladeshPhone('+12025550143')).toThrow(ValidationError); // Non-BD country code
    expect(() => normalizeBangladeshPhone('')).toThrow(ValidationError);
  });

  it('formats normalized phone into national display format', () => {
    expect(formatBangladeshPhoneNational('+8801712345678')).toBe('01712-345678');
    expect(formatBangladeshPhoneNational('01819556677')).toBe('01819-556677');
  });
});
