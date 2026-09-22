/**
 * AlifWorld Lifecycle Fields, Optimistic Concurrency & Deletion Policy Standards
 * 
 * Enforces strict classification of models into Immutable (append-only),
 * Soft-Deletable (domain entities), and Ephemeral (TTL retention).
 * 
 * Reference: docs/architecture/identifiers-lifecycle-and-deletion-policy.md
 * Invariant: ADR-0022
 */

import { ConflictError, ValidationError, NotFoundError } from '@/shared/errors/app-error';

/**
 * Three-tier entity deletion classification:
 * 1. IMMUTABLE: Financial ledgers, payments, audit logs, order snapshots.
 *    Deletion (hard or soft) is strictly prohibited. Corrections use reversals.
 * 2. SOFT_DELETE: Core domain entities (users, sellers, products, categories).
 *    Never hard-deleted; tracked via deletedAt and deletedBy timestamps.
 * 3. EPHEMERAL: Operational telemetry, OTP tokens, auth sessions, cache records.
 *    Subject to time-to-live retention and scheduled automated background purge.
 */
export type DeletionPolicy = 'IMMUTABLE' | 'SOFT_DELETE' | 'EPHEMERAL';

/**
 * Authoritative registry mapping domain models to their lifecycle deletion policy.
 */
export const MODEL_DELETION_POLICIES: Record<string, DeletionPolicy> = {
  // Category 1: Strictly Immutable Financial, Audit & Event Records
  AuditLog: 'IMMUTABLE',
  OutboxEvent: 'IMMUTABLE',
  WalletLedger: 'IMMUTABLE',
  CommissionLedger: 'IMMUTABLE',
  ProductPointLedger: 'IMMUTABLE',
  Transaction: 'IMMUTABLE',
  Payment: 'IMMUTABLE',
  Refund: 'IMMUTABLE',
  OrderSnapshot: 'IMMUTABLE',
  OrderItemSnapshot: 'IMMUTABLE',
  ProductSlugHistory: 'IMMUTABLE',

  // Category 2: Soft-Deletable Domain Entities
  SystemConfig: 'SOFT_DELETE',
  User: 'SOFT_DELETE',
  Role: 'SOFT_DELETE',
  Permission: 'SOFT_DELETE',
  UserRoleAssignment: 'SOFT_DELETE',
  RolePermission: 'SOFT_DELETE',
  Seller: 'SOFT_DELETE',
  SellerStaff: 'SOFT_DELETE',
  SellerKycDocument: 'SOFT_DELETE',
  SellerStoreSettings: 'SOFT_DELETE',
  Category: 'SOFT_DELETE',
  Brand: 'SOFT_DELETE',
  Product: 'SOFT_DELETE',
  ProductVariant: 'SOFT_DELETE',
  ProductMedia: 'SOFT_DELETE',
  Warehouse: 'SOFT_DELETE',

  // Category 3: Ephemeral Records with TTL Purge Policy
  HealthProbe: 'EPHEMERAL',
  OtpToken: 'EPHEMERAL',
  UserSession: 'EPHEMERAL',
};

/**
 * Checks whether an entity is strictly immutable and forbidden from deletion.
 */
export function isModelImmutable(modelName: string): boolean {
  return MODEL_DELETION_POLICIES[modelName] === 'IMMUTABLE';
}

/**
 * Asserts that a model is permitted to be deleted under project deletion policy.
 * Throws ValidationError if the model is classified as IMMUTABLE.
 */
export function assertModelDeletable(modelName: string): void {
  if (isModelImmutable(modelName)) {
    throw new ValidationError(
      `Deletion of immutable entity '${modelName}' is strictly prohibited by financial integrity policy. Use compensating reversal entries.`,
      { modelName, policy: 'IMMUTABLE' }
    );
  }
}

/**
 * Enhances a Prisma query WHERE clause with `deletedAt: null` to filter out soft-deleted records.
 */
export function whereActive<T extends object>(whereClause: T = {} as T): T & { deletedAt: null } {
  return {
    ...whereClause,
    deletedAt: null,
  };
}

/**
 * Creates the database payload to soft-delete an entity.
 */
export function createSoftDeletePayload(actorId?: string): {
  deletedAt: Date;
  deletedBy: string | null;
} {
  return {
    deletedAt: new Date(),
    deletedBy: actorId ?? null,
  };
}

/**
 * Creates the database payload to restore a soft-deleted entity.
 */
export function createRestorePayload(): {
  deletedAt: null;
  deletedBy: null;
} {
  return {
    deletedAt: null,
    deletedBy: null,
  };
}

/**
 * Enforces optimistic concurrency control (OCC).
 * Throws ConflictError if the record's current database version does not match expected version.
 */
export function assertOptimisticVersion(
  currentVersion: number,
  expectedVersion: number,
  entityId?: string
): void {
  if (currentVersion !== expectedVersion) {
    throw new ConflictError(
      'Concurrent modification detected: entity was modified by another concurrent transaction',
      { currentVersion, expectedVersion, entityId }
    );
  }
}

/**
 * Computes the next optimistic concurrency version number.
 */
export function nextVersion(currentVersion: number): number {
  return (currentVersion || 1) + 1;
}

/**
 * Asserts that an entity is not soft-deleted.
 * Throws NotFoundError if entity has a non-null deletedAt value.
 */
export function assertNotDeleted(
  entity: { deletedAt?: Date | null } | null | undefined,
  entityName = 'Entity'
): void {
  if (!entity || entity.deletedAt) {
    throw new NotFoundError(`${entityName} not found or has been deleted`, {
      entityName,
    });
  }
}
