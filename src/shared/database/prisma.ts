/**
 * AlifWorld Prisma Client Singleton & Connection Management
 * 
 * Provides a resilient singleton connection pool for Next.js App Router
 * with hot-reloading protection, structured logging, and health probing.
 * 
 * Reference: docs/architecture/postgresql-and-prisma-foundations.md
 * Invariant: docs/architecture/single-application-modular-monolith.md
 */

import { PrismaClient } from '@prisma/client';
import { getAppConfig } from '@/shared/config/environment';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Factory function creating a configured PrismaClient instance.
 */
export function createPrismaClient(): PrismaClient {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return new PrismaClient({
    log: isDevelopment
      ? ['query', 'error', 'warn']
      : ['error', 'warn'],
    errorFormat: 'colorless',
  });
}

/**
 * Authoritative global singleton PrismaClient.
 */
export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

// Preserve connection across hot reloads in development
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export interface DatabaseHealthResult {
  status: 'healthy' | 'unhealthy';
  latencyMs: number;
  error?: string;
}

/**
 * Verifies live connectivity to the PostgreSQL database with timeout protection.
 * Used by /api/health/ready readiness probe.
 */
export async function checkDatabaseHealth(timeoutMs = 3000): Promise<DatabaseHealthResult> {
  const startTime = Date.now();

  try {
    const config = getAppConfig();
    if (!config.databaseUrl) {
      return {
        status: 'unhealthy',
        latencyMs: 0,
        error: 'DATABASE_URL is not configured',
      };
    }

    // Execute a lightweight ping query with timeout protection
    const pingPromise = (prisma as any).$queryRawUnsafe('SELECT 1 as ping');
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Database health check timed out after ${timeoutMs}ms`)), timeoutMs)
    );

    await Promise.race([pingPromise, timeoutPromise]);
    const latencyMs = Date.now() - startTime;

    return {
      status: 'healthy',
      latencyMs,
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const message = error instanceof Error ? error.message : 'Unknown database error';

    return {
      status: 'unhealthy',
      latencyMs,
      error: message,
    };
  }
}

/**
 * Disconnects the Prisma client on process termination.
 */
export async function disconnectPrisma(): Promise<void> {
  if (globalForPrisma.prisma) {
    try {
      await (globalForPrisma.prisma as any).$disconnect();
    } catch {
      // Ignore disconnect errors during process exit
    }
    globalForPrisma.prisma = undefined;
  }
}
