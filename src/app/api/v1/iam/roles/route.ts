/**
 * GET /api/v1/iam/roles
 *
 * Lists all active system and custom RBAC roles.
 * Requires: roles:read permission
 *
 * Reference: docs/architecture/scope-boundaries-and-domain-map.md
 * Invariant: ADR-0023
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractBearerToken, verifyJwt } from '@/shared/auth/jwt';
import { TOKEN_POLICIES } from '@/shared/auth/token-policy';
import { AppError, AuthenticationError, AuthorizationError } from '@/shared/errors/app-error';
import { RoleRepository } from '@/features/identity/repositories/role-repository';
import { UserRoleAssignmentRepository } from '@/features/identity/repositories/user-role-assignment-repository';
import type { AccessTokenClaims } from '@/shared/auth/token-policy';

export const dynamic = 'force-dynamic';

const roleRepo = new RoleRepository();
const assignmentRepo = new UserRoleAssignmentRepository();

export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate
    const authHeader = req.headers.get('authorization');
    let token = extractBearerToken(authHeader);
    if (!token) {
      token = req.cookies.get(TOKEN_POLICIES.ACCESS_TOKEN_COOKIE_NAME)?.value || null;
    }
    if (!token) {
      throw new AuthenticationError('Authentication credentials required');
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    const claims = verifyJwt<AccessTokenClaims>(token, jwtSecret);
    const userId = claims.sub;

    // 2. Authorize: roles:read permission
    const hasPerm = await assignmentRepo.hasPermission(userId, 'roles:read');
    if (!hasPerm) {
      throw new AuthorizationError('Permission denied: roles:read required');
    }

    // 3. Fetch roles
    const roles = await roleRepo.listAll();

    return NextResponse.json(
      {
        success: true,
        data: roles,
        meta: { total: roles.length },
      },
      { status: 200 }
    );
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toJSON(), { status: error.statusCode });
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
