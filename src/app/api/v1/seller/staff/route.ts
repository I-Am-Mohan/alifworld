/**
 * REST API Route Handler: /api/v1/seller/staff
 * 
 * Manages store staff delegation, member invitations, and scoped access
 * controls under strict multi-tenant boundaries.
 * 
 * Invariants: ADR-0003, ADR-0006, ADR-0021, ADR-0022, ADR-0024, Milestone 045
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, defaultPolicyEngine } from '@/shared/authz';
import { SellerStaffService } from '@/features/seller/services/seller-staff-service';
import { AddSellerStaffInputSchema, RemoveSellerStaffInputSchema } from '@/features/seller/validators';
import { AppError, AuthorizationError } from '@/shared/errors/app-error';

const staffService = new SellerStaffService();

export async function GET(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);
    const url = new URL(req.url);
    const requestedSellerId = url.searchParams.get('sellerId');

    const targetSellerId = requestedSellerId || actor.sellerId;

    if (!targetSellerId) {
      throw new AuthorizationError('Seller tenant context is required.');
    }

    await defaultPolicyEngine.assert(actor, 'staff:read', {
      type: 'SELLER',
      id: targetSellerId,
      sellerId: targetSellerId,
    });

    if (!actor.roles.includes('SUPER_ADMIN') && actor.sellerId !== targetSellerId) {
      throw new AuthorizationError('Cross-tenant access denied: You cannot view staff of another store.');
    }

    const staffList = await staffService.listStaff(targetSellerId);

    return NextResponse.json({
      success: true,
      data: staffList,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toJSON(), { status: error.statusCode });
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_JSON', message: 'Valid JSON payload is required.' } },
        { status: 400 }
      );
    }

    const parseResult = AddSellerStaffInputSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: parseResult.error.errors[0]?.message || 'Input validation failed',
            details: parseResult.error.format(),
          },
        },
        { status: 422 }
      );
    }

    const input = parseResult.data;

    await defaultPolicyEngine.assert(actor, 'staff:manage', {
      type: 'SELLER',
      id: input.sellerId,
      sellerId: input.sellerId,
    });

    if (!actor.roles.includes('SUPER_ADMIN') && actor.sellerId !== input.sellerId) {
      throw new AuthorizationError('Cross-tenant access denied: You cannot add staff to another store.');
    }

    const staff = await staffService.addOrInviteStaff(actor.userId, input);

    return NextResponse.json(
      {
        success: true,
        data: staff,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toJSON(), { status: error.statusCode });
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);

    let payload: any = {};
    const url = new URL(req.url);
    const querySellerId = url.searchParams.get('sellerId');
    const queryUserId = url.searchParams.get('userId');

    if (querySellerId && queryUserId) {
      payload = { sellerId: querySellerId, userId: queryUserId };
    } else {
      const body = await req.json().catch(() => null);
      if (body && typeof body === 'object') {
        payload = body;
      }
    }

    const parseResult = RemoveSellerStaffInputSchema.safeParse(payload);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: parseResult.error.errors[0]?.message || 'Input validation failed',
            details: parseResult.error.format(),
          },
        },
        { status: 422 }
      );
    }

    const input = parseResult.data;

    await defaultPolicyEngine.assert(actor, 'staff:manage', {
      type: 'SELLER',
      id: input.sellerId,
      sellerId: input.sellerId,
    });

    if (!actor.roles.includes('SUPER_ADMIN') && actor.sellerId !== input.sellerId) {
      throw new AuthorizationError('Cross-tenant access denied: You cannot remove staff from another store.');
    }

    await staffService.removeStaff(actor.userId, input.sellerId, input.userId);

    return NextResponse.json({
      success: true,
      message: 'Staff member removed successfully.',
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toJSON(), { status: error.statusCode });
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
