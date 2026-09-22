/**
 * Admin Audit Trail Single Entry Inspection API Route
 * 
 * Retrieves individual audit record by ID and rejects mutation attempts (immutable).
 * 
 * Invariants: ADR-0022, ADR-0031, Milestone 049
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/shared/authz';
import { auditService } from '@/shared/audit';
import { AppError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/admin/audit/[id]
 * Retrieves a single audit log entry.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const actor = authenticateRequest(req);
    const record = await auditService.getAuditLogById(actor, params.id);

    return NextResponse.json(
      {
        success: true,
        data: record,
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
          message: error.message || 'An unexpected error occurred while retrieving audit record',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/admin/audit/[id]
 * Enforces immutable deletion policy: audit logs can never be deleted.
 */
export async function DELETE() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'IMMUTABLE_RECORD',
        message: 'Audit logs are classified as IMMUTABLE append-only records under ADR-0022. Deletion is strictly prohibited.',
      },
    },
    { status: 405 }
  );
}

/**
 * PUT /api/v1/admin/audit/[id]
 * Enforces immutable update policy: audit logs can never be modified.
 */
export async function PUT() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'IMMUTABLE_RECORD',
        message: 'Audit logs are classified as IMMUTABLE append-only records under ADR-0022. Modifications are strictly prohibited.',
      },
    },
    { status: 405 }
  );
}

/**
 * PATCH /api/v1/admin/audit/[id]
 * Enforces immutable update policy: audit logs can never be modified.
 */
export async function PATCH() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'IMMUTABLE_RECORD',
        message: 'Audit logs are classified as IMMUTABLE append-only records under ADR-0022. Modifications are strictly prohibited.',
      },
    },
    { status: 405 }
  );
}
