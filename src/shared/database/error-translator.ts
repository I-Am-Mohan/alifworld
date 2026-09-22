/**
 * AlifWorld Database Error Translator
 * 
 * Maps PostgreSQL and Prisma runtime exceptions to strongly-typed domain AppErrors.
 * Prevents sensitive schema identifiers, SQL statements, and internal server paths
 * from leaking to user-facing or client responses.
 * 
 * Reference: docs/architecture/postgresql-and-prisma-foundations.md
 * Invariants: docs/architecture/scope-boundaries-and-domain-map.md
 */

import {
  AppError,
  ConflictError,
  NotFoundError,
  ValidationError,
  InternalServerError,
} from '@/shared/errors/app-error';

/**
 * Interface representing standard Prisma error properties.
 */
export interface PrismaErrorLike {
  code?: string;
  meta?: Record<string, unknown>;
  message?: string;
  name?: string;
}

/**
 * Translates PostgreSQL/Prisma exceptions into standardized AlifWorld AppError domain exceptions.
 */
export function translateDatabaseError(error: unknown, context?: string): AppError {
  if (error instanceof AppError) {
    return error;
  }

  const err = error as PrismaErrorLike;
  const code = err?.code;
  const meta = err?.meta;

  switch (code) {
    // Unique constraint violation (e.g. duplicate key)
    case 'P2002': {
      const target = meta?.target;
      const fields = Array.isArray(target)
        ? target.join(', ')
        : typeof target === 'string'
        ? target
        : 'unique fields';
      return new ConflictError(
        `A record with the specified ${fields} already exists`,
        { code, target, context }
      );
    }

    // Record required but not found for update/delete
    case 'P2025': {
      const cause = (meta?.cause as string) || 'Requested record was not found';
      return new NotFoundError(cause, { code, context });
    }

    // Foreign key constraint failed
    case 'P2003': {
      const fieldName = (meta?.field_name as string) || 'foreign key';
      return new ValidationError(
        `Referenced entity does not exist or relation constraint failed on ${fieldName}`,
        { code, fieldName, context }
      );
    }

    // Connection pool timeout
    case 'P2024': {
      return new InternalServerError(
        'Database connection timed out while waiting for an available pool slot',
        { code, timeout: meta?.timeout, context }
      );
    }

    // Value too long for column
    case 'P2000': {
      const column = (meta?.column_name as string) || 'column';
      return new ValidationError(
        `Supplied value exceeds maximum allowed length for database ${column}`,
        { code, column, context }
      );
    }

    // Required relation missing / violation
    case 'P2014': {
      return new ValidationError(
        'Required relationship constraint violated for this mutation',
        { code, context }
      );
    }

    default: {
      const message = err?.message || (error instanceof Error ? error.message : 'Unknown database error');
      return new InternalServerError(
        `Database operation failure${context ? ` in ${context}` : ''}: ${message}`,
        { code, context }
      );
    }
  }
}
