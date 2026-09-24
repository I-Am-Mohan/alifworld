/**
 * Unit Tests for Typed Environment Validation and Secret Boundaries
 * Reference: Milestone 016
 */

import { describe, it, expect } from 'bun:test';
import {
  validateClientEnv,
  validateServerEnv,
  clientEnvSchema,
  serverEnvSchema,
  redactSecret,
  isSensitiveKey,
} from '@/shared/config/environment';

describe('Environment Validation & Secret Boundaries', () => {
  describe('Client Environment Validation', () => {
    it('validates valid client environment with defaults', () => {
      const parsed = validateClientEnv({});
      expect(parsed.NEXT_PUBLIC_APP_URL).toBe('http://localhost:3000');
      expect(parsed.NEXT_PUBLIC_CDN_URL).toBe('');
    });

    it('rejects invalid URL in NEXT_PUBLIC_APP_URL', () => {
      expect(() => {
        validateClientEnv({
          NEXT_PUBLIC_APP_URL: 'not-a-valid-url',
        });
      }).toThrow(/Invalid Client Environment Variables/);
    });
  });

  describe('Server Environment Validation', () => {
    it('validates server environment with baseline defaults', () => {
      const parsed = validateServerEnv({
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        REDIS_URL: 'redis://localhost:6379/0',
        JWT_SECRET: 'change_me_to_a_secure_random_string_in_production_min_32_chars',
        SESSION_SECRET: 'change_me_to_another_secure_random_string_32_chars',
      });
      expect(parsed.DATABASE_URL).toContain('postgresql://');
      expect(parsed.REDIS_URL).toBe('redis://localhost:6379/0');
      expect(parsed.APP_ENV).toBe('local');
      expect(parsed.NODE_ENV).toBe('development');
    });

    it('rejects JWT_SECRET shorter than 32 characters', () => {
      expect(() => {
        validateServerEnv({
          JWT_SECRET: 'short_insecure_secret',
        });
      }).toThrow(/JWT_SECRET must be at least 32 characters/);
    });
  });

  describe('Secret Boundary & Redaction Hygiene', () => {
    it('identifies sensitive key patterns accurately', () => {
      expect(isSensitiveKey('DATABASE_URL')).toBe(true);
      expect(isSensitiveKey('REDIS_URL')).toBe(true);
      expect(isSensitiveKey('JWT_SECRET')).toBe(true);
      expect(isSensitiveKey('NAGAD_PRIVATE_KEY')).toBe(true);
      expect(isSensitiveKey('BKASH_PASSWORD')).toBe(true);
      expect(isSensitiveKey('PATHAO_CLIENT_SECRET')).toBe(true);
      expect(isSensitiveKey('GREENWEB_API_TOKEN')).toBe(true);
      expect(isSensitiveKey('APP_URL')).toBe(false);
      expect(isSensitiveKey('DEFAULT_LOCALE')).toBe(false);
      expect(isSensitiveKey('PORT')).toBe(false);
    });

    it('redacts sensitive values properly', () => {
      expect(redactSecret('JWT_SECRET', 'super_secret_jwt_token_1234567890')).toBe(
        '***[REDACTED]***'
      );
      expect(redactSecret('DATABASE_URL', 'postgresql://user:pass@host:5432/db')).toBe(
        '***[REDACTED]***'
      );
      expect(redactSecret('PORT', 3000)).toBe('3000');
      expect(redactSecret('DEFAULT_LOCALE', 'bn-BD')).toBe('bn-BD');
      expect(redactSecret('UNKNOWN_KEY', undefined)).toBe('[UNSET]');
    });
  });
});
