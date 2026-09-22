/**
 * Unit Tests for Standardized Identifiers, Timestamps & Lifecycle Fields
 * 
 * Verifies ID generation, prefix extraction, format validation,
 * optimistic concurrency control, and soft-delete payloads.
 * 
 * Reference: docs/architecture/identifiers-lifecycle-and-deletion-policy.md
 */

import { describe, it, expect } from 'bun:test';
import {
  generateId,
  isValidId,
  extractPrefix,
  parseId,
  ID_PREFIXES,
} from '@/shared/utils/id';
import {
  whereActive,
  createSoftDeletePayload,
  createRestorePayload,
  assertOptimisticVersion,
  nextVersion,
  assertNotDeleted,
} from '@/shared/database/lifecycle';
import { ConflictError, NotFoundError } from '@/shared/errors/app-error';

describe('Standardized Identifiers Unit Tests', () => {
  it('generates IDs with the specified domain prefix and correct format', () => {
    const userId = generateId(ID_PREFIXES.USER);
    expect(userId.startsWith('usr_')).toBe(true);
    expect(userId.length).toBeGreaterThanOrEqual(24);

    const orderId = generateId(ID_PREFIXES.ORDER);
    expect(orderId.startsWith('ord_')).toBe(true);

    const paymentId = generateId(ID_PREFIXES.PAYMENT);
    expect(paymentId.startsWith('pay_')).toBe(true);
  });

  it('generates distinct collision-resistant IDs on successive calls', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateId(ID_PREFIXES.PRODUCT));
    }
    expect(ids.size).toBe(100);
  });

  it('validates IDs correctly with isValidId', () => {
    const validUserId = generateId(ID_PREFIXES.USER);
    expect(isValidId(validUserId)).toBe(true);
    expect(isValidId(validUserId, ID_PREFIXES.USER)).toBe(true);
    expect(isValidId(validUserId, ID_PREFIXES.SELLER)).toBe(false);

    // Invalid formats
    expect(isValidId('invalid_id')).toBe(false);
    expect(isValidId('usr_short')).toBe(false);
    expect(isValidId('xyz_1j7x4b9e8m02k3f8d7c6b5a4')).toBe(false); // unapproved prefix
    expect(isValidId('')).toBe(false);
    expect(isValidId(null)).toBe(false);
    expect(isValidId(undefined)).toBe(false);
    expect(isValidId(12345)).toBe(false);
  });

  it('extracts valid domain prefixes accurately', () => {
    const sellerId = generateId(ID_PREFIXES.SELLER);
    expect(extractPrefix(sellerId)).toBe('sel');

    const walletId = generateId(ID_PREFIXES.WALLET);
    expect(extractPrefix(walletId)).toBe('wal');

    expect(extractPrefix('invalid')).toBe(null);
    expect(extractPrefix('abc_1234567890123456')).toBe(null);
  });

  it('parses standardized IDs into prefix and raw entropy components', () => {
    const configId = generateId(ID_PREFIXES.CONFIG);
    const parsed = parseId(configId);

    expect(parsed.isValid).toBe(true);
    expect(parsed.prefix).toBe('cfg');
    expect(parsed.rawPayload.length).toBeGreaterThan(16);
    expect(configId).toBe(`cfg_${parsed.rawPayload}`);
  });
});

describe('Lifecycle & Concurrency Control Unit Tests', () => {
  it('creates valid soft-delete payload with timestamp and optional actor', () => {
    const payload = createSoftDeletePayload('usr_actor_admin_01');
    expect(payload.deletedAt).toBeInstanceOf(Date);
    expect(payload.deletedBy).toBe('usr_actor_admin_01');

    const anonymousPayload = createSoftDeletePayload();
    expect(anonymousPayload.deletedAt).toBeInstanceOf(Date);
    expect(anonymousPayload.deletedBy).toBe(null);
  });

  it('creates restore payload clearing deletion fields', () => {
    const payload = createRestorePayload();
    expect(payload.deletedAt).toBe(null);
    expect(payload.deletedBy).toBe(null);
  });

  it('augments where clauses with deletedAt: null using whereActive', () => {
    const where = { status: 'PUBLISHED', sellerId: 'sel_dhaka_01' };
    const filtered = whereActive(where);

    expect(filtered).toEqual({
      status: 'PUBLISHED',
      sellerId: 'sel_dhaka_01',
      deletedAt: null,
    });
    // Verifies original where object is not mutated
    expect(where).not.toHaveProperty('deletedAt');
  });

  it('passes optimistic version check when versions match', () => {
    expect(() => {
      assertOptimisticVersion(3, 3, 'prod_test_01');
    }).not.toThrow();
  });

  it('throws ConflictError when optimistic versions diverge', () => {
    expect(() => {
      assertOptimisticVersion(4, 3, 'prod_test_01');
    }).toThrow(ConflictError);
  });

  it('increments version numbers sequentially', () => {
    expect(nextVersion(1)).toBe(2);
    expect(nextVersion(5)).toBe(6);
  });

  it('assertNotDeleted passes for active entity and throws for deleted entity', () => {
    expect(() => {
      assertNotDeleted({ deletedAt: null }, 'Product');
    }).not.toThrow();

    expect(() => {
      assertNotDeleted({ deletedAt: new Date() }, 'Product');
    }).toThrow(NotFoundError);

    expect(() => {
      assertNotDeleted(null, 'Product');
    }).toThrow(NotFoundError);
  });
});
