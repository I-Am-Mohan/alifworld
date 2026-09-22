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
import { AuthorizationError, NotFoundError } from '@/shared/errors/app-error';
import { ActorContext } from '@/shared/authz/authz.types';
import { SystemRoleCode } from '@/features/identity/types';
import { PaginatedResponse } from '@/shared/database/base-repository';
import {
  AuditLogEntry,
  AuditAction,
  AuditLogQueryParams,
  SanitizedAuditMetadata,
} from './audit.interface';
import { redactSensitiveData } from './redactor';
import { computeAuditDiff } from './audit-diff';
import { AuditRepository, AuditLogRecord } from './audit.repository';

export class AuditService {
  private prismaClient?: any;
  private readonly repository: AuditRepository;

  constructor(prisma?: any, repository?: AuditRepository) {
    this.prismaClient = prisma;
    this.repository = repository || new AuditRepository();
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
   * High-level helper for logging security perimeter and identity events.
   * Automatically extracts request telemetry, applies redaction, and logs without throwing.
   */
  async logSecurityEvent(params: {
    action: AuditAction;
    resource: string;
    resourceId?: string | null;
    actorId?: string | null;
    actorRole?: string | null;
    req?: NextRequest;
    metadata?: Record<string, unknown>;
    ipAddress?: string | null;
    userAgent?: string | null;
    requestId?: string | null;
  }): Promise<void> {
    const meta = params.req ? AuditService.extractRequestMeta(params.req) : null;

    await this.log({
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId ?? null,
      actorId: params.actorId ?? null,
      actorRole: params.actorRole ?? 'ANONYMOUS',
      ipAddress: params.ipAddress || meta?.ipAddress || null,
      userAgent: params.userAgent || meta?.userAgent || null,
      requestId: params.requestId || meta?.requestId || null,
      metadata: params.metadata,
    });
  }

  /**
   * High-level helper for logging state-modifying business transactions.
   * Computes a redaction-safe before/after diff and captures request telemetry.
   */
  async logBusinessEvent(
    params: {
      action: AuditAction;
      resource: string;
      resourceId?: string | null;
      actorId?: string | null;
      actorRole?: string | null;
      before?: Record<string, any> | null;
      after?: Record<string, any> | null;
      req?: NextRequest;
      metadata?: Record<string, unknown>;
      ipAddress?: string | null;
      userAgent?: string | null;
      requestId?: string | null;
    },
    txClient?: any
  ): Promise<void> {
    const meta = params.req ? AuditService.extractRequestMeta(params.req) : null;

    await this.log(
      {
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId ?? null,
        actorId: params.actorId ?? null,
        actorRole: params.actorRole ?? 'UNKNOWN',
        ipAddress: params.ipAddress || meta?.ipAddress || null,
        userAgent: params.userAgent || meta?.userAgent || null,
        requestId: params.requestId || meta?.requestId || null,
        before: params.before,
        after: params.after,
        metadata: params.metadata,
      },
      txClient
    );
  }

  /**
   * Asserts administrative authorization and retrieves paginated historical audit logs.
   */
  async queryAuditLogs(
    actor: ActorContext,
    params: AuditLogQueryParams = {}
  ): Promise<PaginatedResponse<AuditLogRecord>> {
    this.assertAuditReadAccess(actor);
    return await this.repository.findLogs(params);
  }

  /**
   * Asserts administrative authorization and retrieves a single audit record by ID.
   */
  async getAuditLogById(actor: ActorContext, id: string): Promise<AuditLogRecord> {
    this.assertAuditReadAccess(actor);
    const record = await this.repository.findById(id);
    if (!record) {
      throw new NotFoundError(`Audit log entry '${id}' not found`);
    }
    return record;
  }

  /**
   * Enforces role and permission check for inspecting audit logs.
   */
  private assertAuditReadAccess(actor: ActorContext): void {
    const isSuperAdmin = actor.roles?.includes(SystemRoleCode.SUPER_ADMIN);
    if (isSuperAdmin) {
      return;
    }

    const hasPermission =
      actor.permissions?.includes('system:audit_read') ||
      actor.permissions?.includes('audit:read') ||
      actor.permissions?.includes('system:read');

    if (!hasPermission) {
      throw new AuthorizationError(
        'Lacks system:audit_read administrative permission to inspect audit trails.',
        {
          code: 'FORBIDDEN',
          requiredPermission: 'system:audit_read',
          actorId: actor.userId,
        }
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
