/**
 * AlifWorld Immutable Audit Log Repository
 * 
 * Provides append-only persistence, multi-parameter historical querying,
 * pagination, and strict immutability invariant enforcement.
 * 
 * Invariants: ADR-0003, ADR-0022, ADR-0031, Milestone 040, Milestone 049
 */

import {
  BaseRepository,
  parseOffsetPagination,
  formatPaginatedResult,
  PaginatedResponse,
} from '@/shared/database/base-repository';
import { generateId, ID_PREFIXES } from '@/shared/utils/id';
import { ValidationError, NotFoundError } from '@/shared/errors/app-error';
import { AuditLogEntry, AuditLogQueryParams } from './audit.interface';

export interface AuditLogRecord {
  id: string;
  actorId: string | null;
  actorRole: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: any;
  createdAt: Date;
}

export class AuditRepository extends BaseRepository {
  /**
   * Appends an immutable audit log entry into the database.
   * Supports interactive transactions via txClient.
   */
  async appendEntry(entry: AuditLogEntry, txClient?: any): Promise<AuditLogRecord> {
    return this.executeSafe(async () => {
      const client = txClient || this.db;
      const id = generateId(ID_PREFIXES.AUDIT);

      const created = await (client as any).auditLog.create({
        data: {
          id,
          actorId: entry.actorId ?? null,
          actorRole: entry.actorRole ?? null,
          action: entry.action,
          resource: entry.resource,
          resourceId: entry.resourceId ?? null,
          ipAddress: entry.ipAddress ?? null,
          userAgent: entry.userAgent ?? null,
          metadata: entry.metadata ?? undefined,
          createdAt: entry.createdAt || new Date(),
        },
      });

      return created as AuditLogRecord;
    }, 'AuditRepository.appendEntry');
  }

  /**
   * Retrieves paginated audit logs with multi-parameter filtering.
   */
  async findLogs(params: AuditLogQueryParams = {}): Promise<PaginatedResponse<AuditLogRecord>> {
    const { skip, take, page, limit } = parseOffsetPagination({
      page: params.page,
      limit: params.limit,
      maxLimit: 100,
    });

    return this.executeSafe(async () => {
      const where: Record<string, any> = {};

      if (params.actorId) {
        where.actorId = params.actorId;
      }
      if (params.actorRole) {
        where.actorRole = params.actorRole;
      }
      if (params.action) {
        where.action = params.action;
      }
      if (params.resource) {
        where.resource = params.resource;
      }
      if (params.resourceId) {
        where.resourceId = params.resourceId;
      }

      // Date range filtering
      if (params.startDate || params.endDate) {
        where.createdAt = {};
        if (params.startDate) {
          where.createdAt.gte = new Date(params.startDate);
        }
        if (params.endDate) {
          where.createdAt.lte = new Date(params.endDate);
        }
      }

      const [items, total] = await Promise.all([
        (this.db as any).auditLog.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: 'desc' },
        }),
        (this.db as any).auditLog.count({ where }),
      ]);

      return formatPaginatedResult(items as AuditLogRecord[], total, page, limit);
    }, 'AuditRepository.findLogs');
  }

  /**
   * Retrieves a single audit log entry by primary ID.
   */
  async findById(id: string): Promise<AuditLogRecord | null> {
    return this.executeSafe(async () => {
      const log = await (this.db as any).auditLog.findUnique({
        where: { id },
      });
      return log as AuditLogRecord | null;
    }, 'AuditRepository.findById');
  }

  /**
   * Asserts the immutable deletion and update policy for AuditLog.
   * Throws ValidationError: Deletions and updates on audit records are strictly prohibited.
   */
  assertImmutable(): void {
    throw new ValidationError(
      'Audit logs are classified as IMMUTABLE append-only records under ADR-0022. Modifications and deletions are strictly prohibited.'
    );
  }
}
