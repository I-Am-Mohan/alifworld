/**
 * Customer Self-Service Profile API Route
 * 
 * Enforces strict object-level self-ownership, personal data minimization,
 * and anti-tampering privilege escalation barriers.
 * 
 * Invariants: ADR-0003, ADR-0022, ADR-0023, Milestone 046, Milestone 047
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, defaultObjectAuthzService } from '@/shared/authz';
import { errorResponse, validationErrorResponse } from '@/shared/api/error-response';
import { UserRepository } from '@/features/identity/repositories/user-repository';
import { UpdateCustomerProfileSchema } from '@/validators/customer.validator';
import { NotFoundError, ValidationError } from '@/shared/errors/app-error';

export const dynamic = 'force-dynamic';

const userRepo = new UserRepository();

/**
 * GET /api/v1/customer/profile
 * Retrieves the authenticated customer's own profile.
 */
export async function GET(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);

    // Object-level authorization check: Customer reading own profile
    await defaultObjectAuthzService.assert({
      action: 'read',
      actor,
      object: {
        type: 'CUSTOMER',
        id: actor.userId,
        ownerId: actor.userId,
      },
    });

    const user = await userRepo.findById(actor.userId);
    if (!user) {
      return errorResponse(req, new NotFoundError('Customer profile not found'));
    }

    // Redacted customer view (never expose password hashes, internal security tokens)
    return NextResponse.json(
      {
        success: true,
        data: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          name: user.name,
          avatarUrl: user.avatarUrl,
          locale: user.locale,
          status: user.status,
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    return errorResponse(req, error, 'Customer profile processing failed');
  }
}

/**
 * PUT /api/v1/customer/profile
 * Updates the authenticated customer's self-service profile attributes.
 * Rejects any attempts to modify protected security/financial fields.
 */
export async function PUT(req: NextRequest) {
  try {
    const actor = authenticateRequest(req);

    let rawBody: any;
    try {
      rawBody = await req.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    // Anti-tampering check: verify no protected security/financial fields are provided
    const protectedFields = ['status', 'roles', 'isEmailVerified', 'isPhoneVerified', 'walletBalance', 'points'];
    const attemptedProtectedFields = Object.keys(rawBody).filter((k) => protectedFields.includes(k));

    // Object-level authorization check with intent and payload inspection
    await defaultObjectAuthzService.assert({
      action: 'update',
      actor,
      object: {
        type: 'CUSTOMER',
        id: actor.userId,
        ownerId: actor.userId,
        data: rawBody,
      },
    });

    if (attemptedProtectedFields.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'PRIVILEGE_ESCALATION',
            message: `Customers cannot modify protected security fields: ${attemptedProtectedFields.join(', ')}.`,
          },
        },
        { status: 403 }
      );
    }

    const parseResult = UpdateCustomerProfileSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return validationErrorResponse(req, parseResult.error);
    }

    const input = parseResult.data;

    // Fetch existing user to get version
    const existing = await userRepo.findById(actor.userId);
    if (!existing) {
      return errorResponse(req, new NotFoundError('Customer profile not found'));
    }

    const updated = await userRepo.update(actor.userId, existing.version, {
      name: input.name ?? existing.name,
      avatarUrl: input.avatarUrl ?? existing.avatarUrl,
      locale: input.preferredLanguage ?? existing.locale,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: updated.id,
          email: updated.email,
          phone: updated.phone,
          name: updated.name,
          avatarUrl: updated.avatarUrl,
          locale: updated.locale,
          status: updated.status,
          updatedAt: updated.updatedAt,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    return errorResponse(req, error, 'Customer profile processing failed');
  }
}
