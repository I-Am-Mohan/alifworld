/**
 * AlifWorld Base Repository & Data Access Utilities
 * 
 * Implements the four-tier dependency discipline: Repositories encapsulate
 * Prisma queries, enforce tenant isolation boundaries, and normalize pagination.
 * 
 * Reference: docs/architecture/postgresql-and-prisma-foundations.md
 * Invariants: ADR-0003, ADR-0006
 */

import { prisma } from './prisma';
import { translateDatabaseError } from './error-translator';
import { AuthorizationError } from '@/shared/errors/app-error';
import {
  whereActive,
  assertModelDeletable,
  assertOptimisticVersion,
  createSoftDeletePayload,
  createRestorePayload,
} from './lifecycle';

export interface OffsetPaginationParams {
  page?: number;
  limit?: number;
  maxLimit?: number;
}

export interface OffsetPaginationResult {
  skip: number;
  take: number;
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Standardized offset pagination parameter parser.
 * Enforces positive integers and maximum page size limits.
 */
export function parseOffsetPagination(params: OffsetPaginationParams = {}): OffsetPaginationResult {
  const page = Math.max(1, Math.floor(Number(params.page) || 1));
  const maxLimit = params.maxLimit && params.maxLimit > 0 ? params.maxLimit : 100;
  const rawLimit = Math.floor(Number(params.limit) || 20);
  const limit = Math.max(1, Math.min(rawLimit, maxLimit));
  const skip = (page - 1) * limit;

  return { skip, take: limit, page, limit };
}

/**
 * Builds a standardized paginated response envelope.
 */
export function formatPaginatedResult<T>(
  items: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / limit) || 1;
  return {
    items,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

/**
 * Enforces strict multi-tenant isolation by verifying that an entity's sellerId
 * matches the authenticated seller context.
 *
 * Invariant: Cross-tenant data leaks are strictly prevented at repository boundaries.
 */
export function assertSellerScope(entitySellerId: string | null | undefined, authorizedSellerId: string): void {
  if (!entitySellerId || entitySellerId !== authorizedSellerId) {
    throw new AuthorizationError('Tenant isolation violation: Access to entity outside seller scope is forbidden');
  }
}

/**
 * Base Repository providing transactional execution, lifecycle management, and unified error mapping.
 */
export abstract class BaseRepository {
  protected get db() {
    return prisma;
  }

  /**
   * Applies the soft-delete filter (deletedAt: null) to a query where clause.
   */
  protected whereNotDeleted<T extends object>(whereClause: T = {} as T): T & { deletedAt: null } {
    return whereActive(whereClause);
  }

  /**
   * Asserts that a model is permitted to be deleted under project deletion policy.
   * Throws ValidationError if model is classified as IMMUTABLE.
   */
  protected assertCanDelete(modelName: string): void {
    assertModelDeletable(modelName);
  }

  /**
   * Asserts that an optimistic concurrency version matches expected version.
   * Throws ConflictError upon version discrepancy.
   */
  protected assertVersion(currentVersion: number, expectedVersion: number, entityId?: string): void {
    assertOptimisticVersion(currentVersion, expectedVersion, entityId);
  }

  /**
   * Generates database patch payload for soft-deleting an entity.
   */
  protected createSoftDeletePatch(actorId?: string) {
    return createSoftDeletePayload(actorId);
  }

  /**
   * Generates database patch payload for restoring a soft-deleted entity.
   */
  protected createRestorePatch() {
    return createRestorePayload();
  }

  /**
   * Executes a database operation safely, translating any Prisma/PostgreSQL
   * errors into strongly-typed AlifWorld AppErrors.
   */
  protected async executeSafe<T>(operation: () => Promise<T>, context?: string): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      throw translateDatabaseError(error, context ?? this.constructor.name);
    }
  }

  /**
   * Executes an interactive transaction using Prisma's $transaction.
   */
  public async withTransaction<T>(
    fn: (tx: typeof prisma) => Promise<T>,
    options?: { maxWait?: number; timeout?: number }
  ): Promise<T> {
    return this.executeSafe(async () => {
      return await (prisma as any).$transaction(fn, options);
    }, `${this.constructor.name}.withTransaction`);
  }
}
