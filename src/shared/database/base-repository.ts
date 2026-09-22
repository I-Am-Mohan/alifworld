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
import { ActorContext } from '@/shared/authz/authz.types';
import { SystemRoleCode } from '@/features/identity/types';
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
  const rawLimit = params.limit !== undefined && !isNaN(Number(params.limit)) ? Math.floor(Number(params.limit)) : 20;
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
    throw new AuthorizationError('Tenant isolation violation: Access to entity outside seller scope is forbidden', {
      code: 'TENANT_VIOLATION',
      entitySellerId: entitySellerId || null,
      authorizedSellerId,
    });
  }
}

/**
 * Builds a query where clause strictly scoped to a sellerId and active records (deletedAt: null).
 * Ensures tenant isolation is enforced inside database queries, not after data retrieval.
 *
 * Invariant: Milestone 043 - Apply sellerId scope inside repository/service queries, not after data retrieval.
 */
export function buildSellerWhere<T extends object>(
  sellerId: string,
  criteria: T = {} as T
): T & { sellerId: string; deletedAt: null } {
  return {
    ...whereActive(criteria),
    sellerId,
  };
}

/**
 * Enforces strict object-level ownership by verifying that an entity's ownerId
 * matches the authenticated user context.
 *
 * Invariant: Milestone 047 - Object-level ownership checks prevent cross-user data access.
 */
export function assertOwnership(
  entityOwnerId: string | null | undefined,
  authorizedUserId: string,
  message: string = 'Ownership violation: Access to entity outside user ownership is forbidden'
): void {
  if (!entityOwnerId || entityOwnerId !== authorizedUserId) {
    throw new AuthorizationError(message, {
      code: 'OWNERSHIP_VIOLATION',
      entityOwnerId: entityOwnerId || null,
      authorizedUserId,
    });
  }
}

/**
 * Builds a query where clause strictly scoped to an ownerId (default: userId) and active records (deletedAt: null).
 * Ensures ownership scoping is enforced inside database queries, not after data retrieval.
 *
 * Invariant: Milestone 047 - Scoped database queries enforce object-level ownership.
 */
export function buildOwnerWhere<T extends object>(
  ownerId: string,
  criteria: T = {} as T,
  ownerField: string = 'userId'
): T & { deletedAt: null; [key: string]: any } {
  return {
    ...whereActive(criteria),
    [ownerField]: ownerId,
  };
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
   * Applies both soft-delete (deletedAt: null) and seller tenant scope (sellerId) directly to a query where clause.
   * Ensures sellerId scoping is enforced at the database query level, not after data retrieval.
   *
   * Invariant: Milestone 043 - Apply sellerId scope inside repository/service queries, not after data retrieval.
   */
  protected whereSellerScope<T extends object>(
    sellerId: string,
    whereClause: T = {} as T
  ): T & { sellerId: string; deletedAt: null } {
    return buildSellerWhere(sellerId, whereClause);
  }

  /**
   * Applies both soft-delete (deletedAt: null) and owner scope directly to a query where clause.
   * Ensures ownership scoping is enforced at the database query level.
   *
   * Invariant: Milestone 047 - Apply ownerId scope inside repository queries.
   */
  protected whereOwnerScope<T extends object>(
    ownerId: string,
    whereClause: T = {} as T,
    ownerField: string = 'userId'
  ): T & { deletedAt: null; [key: string]: any } {
    return buildOwnerWhere(ownerId, whereClause, ownerField);
  }

  /**
   * Asserts that an entity's ownerId matches the authenticated actor, or actor is Super Admin.
   * Throws AuthorizationError with code OWNERSHIP_VIOLATION if not matching.
   */
  public assertEntityOwnership<T extends Record<string, any>>(
    entity: T | null | undefined,
    actor: ActorContext,
    options: {
      ownerField?: string;
      allowAdmin?: boolean;
      message?: string;
    } = {}
  ): void {
    if (!entity) return;

    const isSuperAdmin = actor.roles?.includes(SystemRoleCode.SUPER_ADMIN);
    if (isSuperAdmin) return;

    if (options.allowAdmin && actor.roles?.includes(SystemRoleCode.ADMIN)) {
      return;
    }

    const field = options.ownerField || (entity.customerId !== undefined ? 'customerId' : entity.ownerId !== undefined ? 'ownerId' : 'userId');
    const ownerId = entity[field];

    assertOwnership(
      ownerId,
      actor.userId,
      options.message ?? `Ownership violation: Actor '${actor.userId}' does not own entity '${entity.id || 'unidentified'}'`
    );
  }

  /**
   * Asserts that an entity belongs to the actor's merchant tenant, or actor is Super Admin.
   * Throws AuthorizationError with code TENANT_VIOLATION if not matching.
   */
  public assertEntityTenant<T extends Record<string, any>>(
    entity: T | null | undefined,
    actor: ActorContext,
    options: {
      sellerField?: string;
      allowAdmin?: boolean;
      message?: string;
    } = {}
  ): void {
    if (!entity) return;

    const isSuperAdmin = actor.roles?.includes(SystemRoleCode.SUPER_ADMIN);
    if (isSuperAdmin) return;

    if (options.allowAdmin && actor.roles?.includes(SystemRoleCode.ADMIN)) {
      return;
    }

    const field = options.sellerField || 'sellerId';
    const sellerId = entity[field];

    if (!sellerId || !actor.sellerId || sellerId !== actor.sellerId) {
      throw new AuthorizationError(
        options.message ?? `Tenant isolation violation: Actor seller '${actor.sellerId || 'none'}' cannot access tenant '${sellerId}'`,
        {
          code: 'TENANT_VIOLATION',
          actorSellerId: actor.sellerId || null,
          entitySellerId: sellerId || null,
          entityId: entity.id || null,
        }
      );
    }
  }

  /**
   * Builds an automatically scoped query where clause based on the actor's role.
   * - SuperAdmin / Admin (with bypass): unscoped
   * - Seller (with sellerId): scoped to sellerField
   * - Customer/User: scoped to ownerField
   */
  public buildActorScopedWhere<T extends object>(
    actor: ActorContext,
    options: {
      ownerField?: string;
      sellerField?: string;
      allowAdminBypass?: boolean;
    } = {},
    criteria: T = {} as T
  ): T & { deletedAt: null; [key: string]: any } {
    const isSuperAdmin = actor.roles?.includes(SystemRoleCode.SUPER_ADMIN);
    if (isSuperAdmin) {
      return whereActive(criteria);
    }

    if (options.allowAdminBypass && actor.roles?.includes(SystemRoleCode.ADMIN)) {
      return whereActive(criteria);
    }

    const isSeller =
      actor.roles?.includes(SystemRoleCode.SELLER_OWNER) ||
      actor.roles?.includes(SystemRoleCode.SELLER_STAFF);

    if (isSeller && actor.sellerId) {
      const sellerField = options.sellerField || 'sellerId';
      return {
        ...whereActive(criteria),
        [sellerField]: actor.sellerId,
      };
    }

    const ownerField = options.ownerField || 'userId';
    return {
      ...whereActive(criteria),
      [ownerField]: actor.userId,
    };
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
