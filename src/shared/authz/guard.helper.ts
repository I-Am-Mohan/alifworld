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
import { AuthenticationError, AuthorizationError, AppError } from '@/shared/errors/app-error';
import { ActorContext, ResourceContext, PolicyDecision, ResourceType } from './authz.types';
import {
  ObjectResourceDescriptor,
  ObjectAccessIntent,
  ObjectAuthorizationDecision,
} from './object-authz.types';
import { defaultPolicyEngine, PolicyEngine } from './policy-engine';
import { defaultObjectAuthzService, ObjectAuthorizationService } from './object-authorization.service';
import { SystemRoleCode } from '@/features/identity/types';

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
 * Authenticates request by extracting and verifying the JWT token.
 * Throws AuthenticationError (401) if credentials are missing or invalid.
 */
export function authenticateRequest(req: NextRequest): ActorContext {
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

  const claims = verifyJwt<AccessTokenClaims>(token, jwtSecret);
  return createActorFromClaims(claims, req);
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
  const actor = authenticateRequest(req);
  const decision = await engine.assert(actor, action, resource);
  return { actor, decision };
}

/**
 * Asserts customer self-service ownership against target user identifier.
 * Throws AuthorizationError (403) with code OWNERSHIP_VIOLATION if not self or admin.
 */
export function assertCustomerOwnership(
  actor: ActorContext,
  targetUserId: string,
  message: string = 'Cannot access resource belonging to another customer'
): void {
  const isSuperAdmin = actor.roles?.includes(SystemRoleCode.SUPER_ADMIN);
  if (isSuperAdmin) return;

  const isPlatformAdmin = actor.roles?.includes(SystemRoleCode.ADMIN);
  if (isPlatformAdmin) return;

  if (actor.userId !== targetUserId) {
    throw new AuthorizationError(message, {
      code: 'OWNERSHIP_VIOLATION',
      actorId: actor.userId,
      targetUserId,
    });
  }
}

/**
 * Asserts seller tenant containment against target merchant identifier.
 * Throws AuthorizationError (403) with code TENANT_VIOLATION if not matching or super admin.
 */
export function assertSellerTenant(
  actor: ActorContext,
  targetSellerId: string,
  message: string = 'Cannot access resource belonging to another merchant store'
): void {
  const isSuperAdmin = actor.roles?.includes(SystemRoleCode.SUPER_ADMIN);
  if (isSuperAdmin) return;

  if (!actor.sellerId || actor.sellerId !== targetSellerId) {
    throw new AuthorizationError(message, {
      code: 'TENANT_VIOLATION',
      actorSellerId: actor.sellerId || null,
      targetSellerId,
    });
  }
}

/**
 * Authenticates request and evaluates object-level authorization with optional database resolution.
 */
export async function authorizeObjectRequest(
  req: NextRequest,
  action: string,
  objectOrDescriptor:
    | ObjectResourceDescriptor
    | { resourceType: ResourceType; objectId: string; data?: any; reason?: string },
  service: ObjectAuthorizationService = defaultObjectAuthzService
): Promise<{
  actor: ActorContext;
  decision: ObjectAuthorizationDecision;
  descriptor: ObjectResourceDescriptor;
}> {
  const actor = authenticateRequest(req);

  // If descriptor has no ownerId or sellerId and is a type/id pair, resolve from database
  if ('resourceType' in objectOrDescriptor) {
    const { decision, descriptor } = await service.resolveAndAssert(
      actor,
      action,
      objectOrDescriptor.resourceType,
      objectOrDescriptor.objectId,
      { data: objectOrDescriptor.data, reason: objectOrDescriptor.reason }
    );
    return { actor, decision, descriptor };
  }

  // Otherwise descriptor is already provided
  const decision = await service.assert({
    actor,
    action,
    object: objectOrDescriptor,
  });

  return { actor, decision, descriptor: objectOrDescriptor };
}

/**
 * Higher-order Route Handler wrapper enforcing object-level authorization policies.
 */
export function withObjectAuthorization<TResponse = any>(
  action: string,
  descriptorOrResolver:
    | ObjectResourceDescriptor
    | ((req: NextRequest, params?: any) => Promise<ObjectResourceDescriptor | { resourceType: ResourceType; objectId: string; data?: any; reason?: string }> | ObjectResourceDescriptor | { resourceType: ResourceType; objectId: string; data?: any; reason?: string }),
  handler: (
    req: NextRequest,
    ctx: {
      actor: ActorContext;
      decision: ObjectAuthorizationDecision;
      descriptor: ObjectResourceDescriptor;
      params?: any;
    }
  ) => Promise<NextResponse<TResponse>>,
  service: ObjectAuthorizationService = defaultObjectAuthzService
) {
  return async (req: NextRequest, routeParams?: any): Promise<NextResponse> => {
    try {
      const target =
        typeof descriptorOrResolver === 'function'
          ? await descriptorOrResolver(req, routeParams)
          : descriptorOrResolver;

      const { actor, decision, descriptor } = await authorizeObjectRequest(req, action, target, service);

      return await handler(req, {
        actor,
        decision,
        descriptor,
        params: routeParams?.params,
      });
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
