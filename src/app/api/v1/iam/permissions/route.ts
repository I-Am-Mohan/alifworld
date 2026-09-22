/**
 * GET /api/v1/iam/permissions
 *
 * Lists all active platform permissions grouped by module.
 * Requires: permissions:read permission
 *
 * Reference: docs/architecture/scope-boundaries-and-domain-map.md
 * Invariant: ADR-0023
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractBearerToken, verifyJwt } from '@/shared/auth/jwt';
import { TOKEN_POLICIES } from '@/shared/auth/token-policy';
import { AppError, AuthenticationError, AuthorizationError } from '@/shared/errors/app-error';
import { PermissionRepository } from '@/features/identity/repositories/permission-repository';
import { UserRoleAssignmentRepository } from '@/features/identity/repositories/user-role-assignment-repository';
import type { AccessTokenClaims } from '@/shared/auth/token-policy';

export const dynamic = 'force-dynamic';

const permissionRepo = new PermissionRepository();
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

    // 2. Authorize: permissions:read
    const hasPerm = await assignmentRepo.hasPermission(userId, 'permissions:read');
    if (!hasPerm) {
      throw new AuthorizationError('Permission denied: permissions:read required');
    }

    // 3. Fetch and group permissions by module
    const permissions = await permissionRepo.listAll();

    const grouped: Record<string, typeof permissions> = {};
    for (const perm of permissions) {
      if (!grouped[perm.module]) {
        grouped[perm.module] = [];
      }
      grouped[perm.module].push(perm);
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          permissions,
          byModule: grouped,
        },
        meta: { total: permissions.length },
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
