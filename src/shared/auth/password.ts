/**
 * AlifWorld Cryptographic Password Hashing & Complexity Validation
 * 
 * Implements PBKDF2-HMAC-SHA512 key derivation with 100,000 iterations and 32-byte salt.
 * Utilizes constant-time verification to prevent timing side-channel attacks.
 * 
 * Invariants: ADR-0031, NIST SP 800-63B Guidelines
 */

import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'crypto';
import { PASSWORD_POLICY } from './token-policy';

const PBKDF2_ITERATIONS = 100000;
const PBKDF2_KEY_LEN = 64;
const PBKDF2_DIGEST = 'sha512';
const HASH_IDENTIFIER = '$pbkdf2-sha512$';

/**
 * High-frequency breached password blacklist (NIST SP 800-63B breach-safe control)
 */
const COMMONLY_BREACHED_PASSWORDS = new Set([
  'password1!',
  'password123!',
  'password@123',
  'password@1234',
  'password#1',
  'qwerty@123',
  'qwerty123!',
  'qwertyuiop1!',
  'admin@123',
  'admin123!',
  'welcome@123',
  'welcome123!',
  'alifworld@2026',
  'dhaka@1234',
  'bangladesh@1',
  'qwerty1234!',
  'abc12345!',
  'abcd1234!',
  'monkey123!',
  'dragon123!',
  'football1!',
  'princess1!',
  'sunshine1!',
  'trustno1!',
  'master123!',
  '12345678@aa',
  'letmein@123',
  'iloveyou@123',
  'pass@word1',
]);

export function isCommonPassword(password: string): boolean {
  return COMMONLY_BREACHED_PASSWORDS.has(password.toLowerCase().trim());
}

/**
 * Validates raw password complexity against platform security rules and breach lists.
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!password || typeof password !== 'string') {
    return { isValid: false, errors: ['Password is required'] };
  }

  if (password.length < PASSWORD_POLICY.MIN_LENGTH) {
    errors.push(`Password must contain at least ${PASSWORD_POLICY.MIN_LENGTH} characters`);
  }

  if (password.length > PASSWORD_POLICY.MAX_LENGTH) {
    errors.push(`Password must not exceed ${PASSWORD_POLICY.MAX_LENGTH} characters`);
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase English letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase English letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one numeric digit');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*...)');
  }

  if (isCommonPassword(password)) {
    errors.push('This password appears in known data breaches or is too common. Please choose a more unique password.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Hashes a plaintext password using salted PBKDF2-HMAC-SHA512.
 */
export function hashPassword(plainText: string): string {
  const salt = randomBytes(32);
  const derivedKey = pbkdf2Sync(
    plainText,
    salt,
    PBKDF2_ITERATIONS,
    PBKDF2_KEY_LEN,
    PBKDF2_DIGEST
  );

  return `${HASH_IDENTIFIER}i=${PBKDF2_ITERATIONS}$${salt.toString('hex')}$${derivedKey.toString('hex')}`;
}

/**
 * Verifies a plaintext password against a stored PBKDF2 hash using constant-time comparison.
 */
export function verifyPassword(plainText: string, storedHash: string): boolean {
  if (!plainText || !storedHash || !storedHash.startsWith(HASH_IDENTIFIER)) {
    return false;
  }

  try {
    const parts = storedHash.slice(HASH_IDENTIFIER.length).split('$');
    if (parts.length !== 3) {
      return false;
    }

    const [iterPart, saltHex, originalHashHex] = parts;
    const iterations = parseInt(iterPart.replace('i=', ''), 10);
    const salt = Buffer.from(saltHex, 'hex');
    const originalHash = Buffer.from(originalHashHex, 'hex');

    const derivedKey = pbkdf2Sync(
      plainText,
      salt,
      iterations,
      originalHash.length,
      PBKDF2_DIGEST
    );

    if (derivedKey.length !== originalHash.length) {
      return false;
    }

    return timingSafeEqual(derivedKey, originalHash);
  } catch {
    return false;
  }
}
