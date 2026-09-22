/**
 * Unit Tests for AlifWorld Deletion Policy & BaseRepository Lifecycle Methods
 * 
 * Verifies strict immutability enforcement on financial, audit, and ledger models,
 * soft-delete allowances on domain models, and BaseRepository lifecycle hooks.
 * 
 * Reference: docs/architecture/identifiers-lifecycle-and-deletion-policy.md
 * Invariant: ADR-0022
 */

import { describe, it, expect } from 'bun:test';
import {
  isModelImmutable,
  assertModelDeletable,
  MODEL_DELETION_POLICIES,
} from '@/shared/database/lifecycle';
import { BaseRepository } from '@/shared/database/base-repository';
import { ValidationError, ConflictError } from '@/shared/errors/app-error';

// Test repository subclass to verify protected BaseRepository methods
class MockDomainRepository extends BaseRepository {
  public testWhereNotDeleted<T extends object>(where?: T) {
    return this.whereNotDeleted(where);
  }

  public testAssertCanDelete(modelName: string) {
    return this.assertCanDelete(modelName);
  }

  public testAssertVersion(currentVersion: number, expectedVersion: number, id?: string) {
    return this.assertVersion(currentVersion, expectedVersion, id);
  }

  public testSoftDeletePatch(actorId?: string) {
    return this.createSoftDeletePatch(actorId);
  }

  public testRestorePatch() {
    return this.createRestorePatch();
  }
}

describe('Deletion Policy Classification Unit Tests', () => {
  it('classifies all financial, transaction, and audit models as IMMUTABLE', () => {
    const immutableModels = [
      'AuditLog',
      'OutboxEvent',
      'WalletLedger',
      'CommissionLedger',
      'ProductPointLedger',
      'Transaction',
      'Payment',
      'Refund',
      'OrderSnapshot',
      'OrderItemSnapshot',
    ];

    for (const model of immutableModels) {
      expect(isModelImmutable(model)).toBe(true);
      expect(MODEL_DELETION_POLICIES[model]).toBe('IMMUTABLE');
    }
  });

  it('classifies core domain entities as SOFT_DELETE', () => {
    const softDeletableModels = [
      'SystemConfig',
      'User',
      'Seller',
      'Category',
      'Product',
      'ProductVariant',
      'Warehouse',
    ];

    for (const model of softDeletableModels) {
      expect(isModelImmutable(model)).toBe(false);
      expect(MODEL_DELETION_POLICIES[model]).toBe('SOFT_DELETE');
    }
  });

  it('classifies operational telemetry and auth tokens as EPHEMERAL', () => {
    expect(MODEL_DELETION_POLICIES['HealthProbe']).toBe('EPHEMERAL');
    expect(MODEL_DELETION_POLICIES['OtpToken']).toBe('EPHEMERAL');
  });

  it('assertModelDeletable throws ValidationError when attempting to delete immutable models', () => {
    expect(() => {
      assertModelDeletable('WalletLedger');
    }).toThrow(ValidationError);

    expect(() => {
      assertModelDeletable('AuditLog');
    }).toThrow(ValidationError);

    expect(() => {
      assertModelDeletable('Payment');
    }).toThrow(ValidationError);
  });

  it('assertModelDeletable permits deletion logic on soft-deletable and ephemeral models', () => {
    expect(() => {
      assertModelDeletable('Product');
    }).not.toThrow();

    expect(() => {
      assertModelDeletable('SystemConfig');
    }).not.toThrow();

    expect(() => {
      assertModelDeletable('HealthProbe');
    }).not.toThrow();
  });
});

describe('BaseRepository Lifecycle Methods Unit Tests', () => {
  const repo = new MockDomainRepository();

  it('applies whereNotDeleted filter correctly', () => {
    const query = repo.testWhereNotDeleted({ categoryId: 'cat_01' });
    expect(query).toEqual({
      categoryId: 'cat_01',
      deletedAt: null,
    });
  });

  it('assertCanDelete prevents deletion of immutable models through repository', () => {
    expect(() => {
      repo.testAssertCanDelete('CommissionLedger');
    }).toThrow(ValidationError);
  });

  it('assertCanDelete allows deletion operations for soft-deletable models', () => {
    expect(() => {
      repo.testAssertCanDelete('Seller');
    }).not.toThrow();
  });

  it('assertVersion validates optimistic concurrency versions', () => {
    expect(() => {
      repo.testAssertVersion(2, 2, 'cfg_platform');
    }).not.toThrow();

    expect(() => {
      repo.testAssertVersion(3, 2, 'cfg_platform');
    }).toThrow(ConflictError);
  });

  it('generates correct soft-delete and restore patches via repository', () => {
    const softDeletePatch = repo.testSoftDeletePatch('usr_admin_01');
    expect(softDeletePatch.deletedAt).toBeInstanceOf(Date);
    expect(softDeletePatch.deletedBy).toBe('usr_admin_01');

    const restorePatch = repo.testRestorePatch();
    expect(restorePatch.deletedAt).toBe(null);
    expect(restorePatch.deletedBy).toBe(null);
  });
});
