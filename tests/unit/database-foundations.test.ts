/**
 * Unit Tests for PostgreSQL & Prisma Database Foundations
 * 
 * Verifies Prisma singleton creation, error translation, pagination parsing,
 * tenant isolation assertion, and health probe logic.
 * 
 * Reference: docs/architecture/postgresql-and-prisma-foundations.md
 */

import { describe, it, expect } from 'bun:test';
import {
  prisma,
  createPrismaClient,
  checkDatabaseHealth,
  translateDatabaseError,
  parseOffsetPagination,
  formatPaginatedResult,
  assertSellerScope,
} from '@/shared/database';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
  InternalServerError,
  AuthorizationError,
} from '@/shared/errors/app-error';

describe('PostgreSQL & Prisma Foundations Unit Tests', () => {
  describe('Prisma Client Singleton & Factory', () => {
    it('exports a valid singleton PrismaClient instance', () => {
      expect(prisma).toBeDefined();
      expect(typeof prisma).toBe('object');
    });

    it('creates client instances via createPrismaClient factory', () => {
      const client = createPrismaClient();
      expect(client).toBeDefined();
    });
  });

  describe('Database Error Translation', () => {
    it('translates P2002 unique constraint violation to ConflictError', () => {
      const p2002Error = {
        code: 'P2002',
        meta: { target: ['email'] },
        message: 'Unique constraint failed on the fields: (`email`)',
      };

      const result = translateDatabaseError(p2002Error, 'UserRegistration');
      expect(result).toBeInstanceOf(ConflictError);
      expect(result.statusCode).toBe(409);
      expect(result.errorCode).toBe('CONFLICT');
      expect(result.message).toContain('email');
      expect(result.details).toMatchObject({ code: 'P2002', context: 'UserRegistration' });
    });

    it('translates P2025 record not found to NotFoundError', () => {
      const p2025Error = {
        code: 'P2025',
        meta: { cause: 'Record to update not found.' },
        message: 'An operation failed because it depends on one or more records that were required but not found.',
      };

      const result = translateDatabaseError(p2025Error, 'UpdateProduct');
      expect(result).toBeInstanceOf(NotFoundError);
      expect(result.statusCode).toBe(404);
      expect(result.errorCode).toBe('NOT_FOUND');
      expect(result.message).toBe('Record to update not found.');
    });

    it('translates P2003 foreign key violation to ValidationError', () => {
      const p2003Error = {
        code: 'P2003',
        meta: { field_name: 'category_id' },
        message: 'Foreign key constraint failed',
      };

      const result = translateDatabaseError(p2003Error, 'CreateProduct');
      expect(result).toBeInstanceOf(ValidationError);
      expect(result.statusCode).toBe(422);
      expect(result.errorCode).toBe('VALIDATION_FAILED');
      expect(result.message).toContain('category_id');
    });

    it('translates P2024 connection pool timeout to InternalServerError', () => {
      const p2024Error = {
        code: 'P2024',
        meta: { timeout: 5000 },
        message: 'Timed out fetching a connection from the pool',
      };

      const result = translateDatabaseError(p2024Error, 'CheckoutTransaction');
      expect(result).toBeInstanceOf(InternalServerError);
      expect(result.statusCode).toBe(500);
      expect(result.errorCode).toBe('INTERNAL_SERVER_ERROR');
      expect(result.message).toContain('pool');
    });

    it('translates P2000 column value too long to ValidationError', () => {
      const p2000Error = {
        code: 'P2000',
        meta: { column_name: 'title' },
        message: 'The provided value for the column is too long',
      };

      const result = translateDatabaseError(p2000Error);
      expect(result).toBeInstanceOf(ValidationError);
      expect(result.statusCode).toBe(422);
      expect(result.message).toContain('title');
    });

    it('preserves existing AppError instances without wrapping', () => {
      const existingError = new AuthorizationError('Forbidden resource');
      const result = translateDatabaseError(existingError);
      expect(result).toBe(existingError);
      expect(result.statusCode).toBe(403);
    });

    it('wraps generic unhandled errors in InternalServerError', () => {
      const genericError = new Error('Unexpected socket drop');
      const result = translateDatabaseError(genericError, 'QueryContext');
      expect(result).toBeInstanceOf(InternalServerError);
      expect(result.statusCode).toBe(500);
      expect(result.message).toContain('Unexpected socket drop');
    });
  });

  describe('Pagination Helpers', () => {
    it('applies standard default pagination parameters', () => {
      const result = parseOffsetPagination();
      expect(result).toEqual({
        page: 1,
        limit: 20,
        skip: 0,
        take: 20,
      });
    });

    it('computes offset and take for custom page and limit', () => {
      const result = parseOffsetPagination({ page: 4, limit: 15 });
      expect(result).toEqual({
        page: 4,
        limit: 15,
        skip: 45,
        take: 15,
      });
    });

    it('clamps negative or zero page and limit to minimum 1', () => {
      const result = parseOffsetPagination({ page: -3, limit: 0 });
      expect(result.page).toBe(1);
      expect(result.limit).toBe(1);
      expect(result.skip).toBe(0);
      expect(result.take).toBe(1);
    });

    it('respects maximum page size limit ceiling', () => {
      const result = parseOffsetPagination({ page: 1, limit: 500, maxLimit: 50 });
      expect(result.limit).toBe(50);
      expect(result.take).toBe(50);
    });

    it('formats standardized paginated result metadata correctly', () => {
      const items = ['item1', 'item2', 'item3'];
      const formatted = formatPaginatedResult(items, 25, 1, 10);

      expect(formatted.items).toEqual(items);
      expect(formatted.pagination).toEqual({
        total: 25,
        page: 1,
        limit: 10,
        totalPages: 3,
        hasNext: true,
        hasPrev: false,
      });
    });

    it('calculates hasNext=false and hasPrev=true on the final page', () => {
      const items = ['item21', 'item22'];
      const formatted = formatPaginatedResult(items, 22, 3, 10);

      expect(formatted.pagination.totalPages).toBe(3);
      expect(formatted.pagination.hasNext).toBe(false);
      expect(formatted.pagination.hasPrev).toBe(true);
    });
  });

  describe('Tenant Isolation Boundaries', () => {
    it('allows access when entity sellerId matches authenticated sellerId', () => {
      expect(() => {
        assertSellerScope('seller_dhaka_01', 'seller_dhaka_01');
      }).not.toThrow();
    });

    it('throws AuthorizationError when entity sellerId differs from authorized sellerId', () => {
      expect(() => {
        assertSellerScope('seller_chittagong_02', 'seller_dhaka_01');
      }).toThrow(AuthorizationError);
    });

    it('throws AuthorizationError when entity sellerId is missing or null', () => {
      expect(() => {
        assertSellerScope(null, 'seller_dhaka_01');
      }).toThrow(AuthorizationError);
    });
  });

  describe('Database Health Check Telemetry', () => {
    it('returns a structured health result with status and latencyMs', async () => {
      const result = await checkDatabaseHealth(500);
      expect(result).toBeDefined();
      expect(['healthy', 'unhealthy']).toContain(result.status);
      expect(typeof result.latencyMs).toBe('number');
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });
  });
});
