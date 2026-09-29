import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/shared/authz';
import { codFraudRiskService } from '@/features/checkout';
import { ManageCodBlacklistSchema } from '@/features/checkout/validators/cod-risk.validators';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { SystemRoleCode } from '@/features/identity/types';
import { AuthorizationError, ValidationError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

function assertAdmin(actor: any) {
  const isAdmin =
    actor.roles?.includes(SystemRoleCode.ADMIN) ||
    actor.roles?.includes(SystemRoleCode.SUPER_ADMIN);

  if (!isAdmin) {
    throw new AuthorizationError('Admin authority required to manage COD blacklist.', {
      code: 'ADMIN_ACCESS_REQUIRED',
    });
  }
}

/**
 * GET /api/v1/admin/checkout/cod/blacklist
 * Admin lists blacklisted identifiers with pagination.
 */
export async function GET(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    assertAdmin(actor);

    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get('type') || undefined;
    const page = Number(searchParams.get('page') || '1');
    const limit = Number(searchParams.get('limit') || '20');

    const result = await codFraudRiskService.listBlacklist({ type, page, limit });

    return NextResponse.json({
      success: true,
      data: result.items,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
      },
    });
  } catch (error) {
    return errorResponse(req, error);
  }
}

/**
 * POST /api/v1/admin/checkout/cod/blacklist
 * Admin adds or updates an identifier on the fraud blacklist.
 */
export async function POST(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    assertAdmin(actor);

    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    const validatedInput = ManageCodBlacklistSchema.parse(payload);

    const entry = await codFraudRiskService.addBlacklistEntry({
      type: validatedInput.type,
      identifier: validatedInput.identifier,
      reason: validatedInput.reason,
      severity: validatedInput.severity,
      addedBy: actor.userId,
      expiresAt: validatedInput.expiresAt ? new Date(validatedInput.expiresAt) : null,
    });

    return NextResponse.json(
      {
        success: true,
        data: entry,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationErrorResponse(req, error);
    }
    return errorResponse(req, error);
  }
}

/**
 * DELETE /api/v1/admin/checkout/cod/blacklist
 * Admin removes an identifier from the fraud blacklist.
 */
export async function DELETE(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    assertAdmin(actor);

    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get('type') as any;
    const identifier = searchParams.get('identifier');

    if (!type || !identifier) {
      throw new ValidationError("Query parameters 'type' and 'identifier' are required.");
    }

    const removed = await codFraudRiskService.removeBlacklistEntry(type, identifier);

    return NextResponse.json({
      success: true,
      data: { removed, identifier },
    });
  } catch (error) {
    return errorResponse(req, error);
  }
}
