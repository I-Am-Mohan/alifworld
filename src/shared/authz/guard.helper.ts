/**
 * AlifWorld Server-Side Route Guard & Authorization Helper
 * 
 * Provides HTTP Route Handler decorators and extraction utilities for
 * executing policy engine assertions with request context.
 * 
 * Invariants: ADR-0003, ADR-0022, ADR-0023, Milestone 042
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractBearerToken, verifyJwt } from '@/shared/auth/jwt';
import { TOKEN_POLICIES, AccessTokenClaims } from '@/shared/auth/token-policy';
import { AuthenticationError, AppError } from '@/shared/errors/app-error';
import { ActorContext, ResourceContext, PolicyDecision } from './authz.types';
import { defaultPolicyEngine, PolicyEngine } from './policy-engine';

/**
 * Creates an ActorContext from verified AccessTokenClaims and request headers.
 */
export function createActorFromClaims(claims: AccessTokenClaims, req?: NextRequest): ActorContext {
  const ipAddress = req ? req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') : null;
  const userAgent = req ? req.headers.get('user-agent') : null;
  const requestId = req ? req.headers.get('x-request-id') : null;

  return {
    userId: claims.sub,
    roles: claims.roles || [],
    permissions: claims.permissions || [],
    sellerId: claims.sellerId ?? null,
    status: 'ACTIVE', // Active by virtue of valid non-expired access token
    tokenVersion: claims.tokenVersion,
    ipAddress,
    userAgent,
    requestId,
  };
}

/**
 * Authenticates request and asserts authorization against the policy engine.
 */
export async function authorizeRequest(
  req: NextRequest,
  action: string,
  resource: ResourceContext,
  engine: PolicyEngine = defaultPolicyEngine
): Promise<{ actor: ActorContext; decision: PolicyDecision }> {
  // 1. Extract token from Authorization header or HttpOnly cookie
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
    throw new Error('JWT_SECRET is not configured');
  }

  // 2. Verify claims
  const claims = verifyJwt<AccessTokenClaims>(token, jwtSecret);
  const actor = createActorFromClaims(claims, req);

  // 3. Assert policy decision
  const decision = await engine.assert(actor, action, resource);

  return { actor, decision };
}

/**
 * Higher-order Route Handler wrapper enforcing server-side authorization policies.
 */
export function withAuthorization<TResponse = any>(
  action: string,
  resourceOrFactory: ResourceContext | ((req: NextRequest) => ResourceContext | Promise<ResourceContext>),
  handler: (req: NextRequest, ctx: { actor: ActorContext; decision: PolicyDecision }) => Promise<NextResponse<TResponse>>,
  engine: PolicyEngine = defaultPolicyEngine
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const resource =
        typeof resourceOrFactory === 'function'
          ? await resourceOrFactory(req)
          : resourceOrFactory;

      const { actor, decision } = await authorizeRequest(req, action, resource, engine);
      return await handler(req, { actor, decision });
    } catch (error: any) {
      if (error instanceof AppError) {
        return NextResponse.json(error.toJSON(), { status: error.statusCode });
      }

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message || 'An unexpected internal error occurred.',
          },
        },
        { status: 500 }
      );
    }
  };
}
