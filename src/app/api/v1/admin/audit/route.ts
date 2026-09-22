/**
 * Admin Audit Trail Historical Exploration API Route
 * 
 * Provides paginated, multi-parameter querying of immutable security and
 * business audit records for authorized platform operators.
 * 
 * Invariants: ADR-0022, ADR-0031, Milestone 044, Milestone 049
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { auditService } from '@/shared/audit';
import { AuditLogQuerySchema } from '@/validators/audit.validator';
import { AppError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/admin/audit
 * Returns paginated, filtered audit log records.
 * Strictly requires Super Administrator authority or system:audit_read permission.
 */
export async function GET(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);

    // Extract query parameters
    const url = new URL(req.url);
    const rawQuery: Record<string, string> = {};
    for (const [key, value] of url.searchParams.entries()) {
      rawQuery[key] = value;
    }

    const parseResult = AuditLogQuerySchema.safeParse(rawQuery);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Invalid audit query parameters',
            details: parseResult.error.format(),
          },
        },
        { status: 422 }
      );
    }

    const result = await auditService.queryAuditLogs(actor, parseResult.data);

    return NextResponse.json(
      {
        success: true,
        ...result,
      },
      { status: 200 }
    );
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toJSON(), { status: error.statusCode });
    }
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'An unexpected error occurred while querying audit records',
        },
      },
      { status: 500 }
    );
  }
}
