/**
 * AlifWorld Central Audit Logging Service
 * 
 * Manages append-only security logs, redaction-safe metadata, request tracing,
 * before/after state diffs, and non-blocking failure tolerance.
 * 
 * Invariants: ADR-0022, ADR-0031, Milestone 040, NIST SP 800-63B
 */

import { NextRequest } from 'next/server';
import { getPrismaClient } from '@/shared/database/prisma';
import { generateId, ID_PREFIXES } from '@/shared/utils/id';
import { AuditLogEntry, SanitizedAuditMetadata } from './audit.interface';
import { redactSensitiveData } from './redactor';
import { computeAuditDiff } from './audit-diff';

export class AuditService {
  private prismaClient?: any;

  constructor(prisma?: any) {
    this.prismaClient = prisma;
  }

  private get prisma() {
    return this.prismaClient || (getPrismaClient() as any);
  }

  /**
   * Appends an immutable, sanitized audit record.
   * Safe for concurrent and retried calls; never throws to avoid aborting primary business logic.
   */
  async log(entry: AuditLogEntry, txClient?: any): Promise<void> {
    try {
      const client = txClient || this.prisma;

      // 1. Calculate sanitized diff if before and after states are present
      const diff = computeAuditDiff(entry.before, entry.after);

      // 2. Redact metadata to prevent secret leakage
      const sanitizedMeta: SanitizedAuditMetadata = entry.metadata
        ? redactSensitiveData(entry.metadata)
        : {};

      if (entry.requestId) {
        sanitizedMeta.requestId = entry.requestId;
      }
      if (diff) {
        sanitizedMeta.diff = diff;
      }

      const id = generateId(ID_PREFIXES.AUDIT);

      await client.auditLog.create({
        data: {
          id,
          actorId: entry.actorId ?? null,
          actorRole: entry.actorRole ?? null,
          action: entry.action,
          resource: entry.resource,
          resourceId: entry.resourceId ?? null,
          ipAddress: entry.ipAddress ?? null,
          userAgent: entry.userAgent ?? null,
          metadata: Object.keys(sanitizedMeta).length > 0 ? sanitizedMeta : undefined,
          createdAt: entry.createdAt || new Date(),
        },
      });
    } catch (err: any) {
      // Non-blocking fallback to structured stderr in case of database connectivity issues
      console.error(
        `[AUDIT_LOG_PERSIST_ERROR] Failed to persist audit entry for action=${entry.action}:`,
        err?.message || err
      );
    }
  }

  /**
   * Helper extracting standard client telemetry and tracing metadata from NextRequest.
   */
  static extractRequestMeta(req: NextRequest): {
    requestId: string;
    ipAddress: string | null;
    userAgent: string | null;
  } {
    const requestId =
      req.headers.get('x-request-id') ||
      req.headers.get('cf-ray') ||
      `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const ipAddress =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      null;

    const userAgent = req.headers.get('user-agent') || null;

    return { requestId, ipAddress, userAgent };
  }
}

// Global singleton instance for shared usage
export const auditService = new AuditService();
