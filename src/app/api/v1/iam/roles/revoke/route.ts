/**
 * POST /api/v1/iam/roles/revoke
 *
 * Revokes a role assignment from a user.
 * Requires: roles:assign permission or SELLER_OWNER for own store
 *
 * Reference: docs/architecture/scope-boundaries-and-domain-map.md
 * Invariant: ADR-0023
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractBearerToken, verifyJwt } from '@/shared/auth/jwt';
import { TOKEN_POLICIES } from '@/shared/auth/token-policy';
import { AppError, AuthenticationError } from '@/shared/errors/app-error';
import { RbacService } from '@/features/identity/services/rbac-service';
import { RevokeRoleInputSchema } from '@/features/identity/validators';
import type { AccessTokenClaims } from '@/shared/auth/token-policy';

export const dynamic = 'force-dynamic';

const rbacService = new RbacService();

export async function POST(req: NextRequest) {
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
    const actorId = claims.sub;

    // 2. Parse and validate input
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON' } },
        { status: 400 }
      );
    }

    const parsed = RevokeRoleInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 422 }
      );
    }

    // 3. Delegate to RBAC service (authorization checked inside)
    await rbacService.revokeRole(actorId, parsed.data);

    return NextResponse.json(
      {
        success: true,
        data: { message: 'Role revoked successfully' },
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
