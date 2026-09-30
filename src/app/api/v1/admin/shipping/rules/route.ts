import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/shared/authz';
import { shippingRateService } from '@/features/shipping';
import { CreateShippingRateRuleSchema } from '@/features/shipping/validators/shipping-rate.validators';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { SystemRoleCode } from '@/features/identity/types';
import { AuthorizationError, ValidationError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

function assertAdmin(actor: any) {
  const isAdmin =
    actor.roles.includes(SystemRoleCode.ADMIN) || actor.roles.includes(SystemRoleCode.SUPER_ADMIN);

  if (!isAdmin) {
    throw new AuthorizationError('Admin or Super Admin authority required.', {
      code: 'ADMIN_ACCESS_REQUIRED',
    });
  }
}

/**
 * GET /api/v1/admin/shipping/rules
 * Admin lists versioned shipping rate rules with pagination and filters.
 */
export async function GET(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    assertAdmin(actor);

    const searchParams = req.nextUrl.searchParams;
    const sellerId = searchParams.get('sellerId') || undefined;
    const status = searchParams.get('status') || undefined;
    const shippingMethod = searchParams.get('shippingMethod') || undefined;
    const page = Number(searchParams.get('page') || '1');
    const limit = Number(searchParams.get('limit') || '20');

    const result = await shippingRateService.listRules({
      sellerId,
      status,
      shippingMethod,
      page,
      limit,
    });

    return NextResponse.json({
      success: true,
      data: result.rules,
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
 * POST /api/v1/admin/shipping/rules
 * Admin creates a new versioned shipping rate rule.
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

    const validatedInput = CreateShippingRateRuleSchema.parse(payload);
    const rule = await shippingRateService.createRule(validatedInput, actor.userId);

    return NextResponse.json(
      {
        success: true,
        data: rule,
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
