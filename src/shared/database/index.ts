/**
 * AlifWorld Database Foundations Module
 * 
 * Re-exports the Prisma client singleton, health check probes, error translator,
 * and base repository abstractions.
 * 
 * Reference: docs/architecture/postgresql-and-prisma-foundations.md
 */

export * from './prisma';
export * from './error-translator';
export * from './base-repository';
