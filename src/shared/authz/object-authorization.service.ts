/**
 * AlifWorld Server-Side Object-Level Authorization & Ownership Verification Service
 * 
 * Provides centralized, authoritative enforcement of object-level authorization,
 * direct user ownership, merchant tenant scoping, delegated operational actors,
 * and immutable security audit trails.
 * 
 * Invariants: ADR-0003, ADR-0006, ADR-0022, ADR-0023, Milestone 047
 */

import { prisma } from '@/shared/database/prisma';
import { SystemRoleCode } from '@/features/identity/types';
import { AuditService } from '@/shared/audit/audit.service';
import { AUDIT_ACTIONS } from '@/shared/audit/audit.interface';
import { AuthorizationError, NotFoundError, ComplianceGateError } from '@/shared/errors/app-error';
import { ActorContext, PolicyDecision, PolicyDecisionCode, ResourceType } from './authz.types';
import {
  ObjectResourceDescriptor,
  ObjectAccessIntent,
  OwnershipRelation,
  ObjectAuthorizationDecision,
  ObjectMetadataResolver,
} from './object-authz.types';
import { defaultPolicyEngine, PolicyEngine } from './policy-engine';

export class ObjectAuthorizationService {
  private readonly resolvers = new Map<string, ObjectMetadataResolver>();

  constructor(
    private readonly policyEngine: PolicyEngine = defaultPolicyEngine,
    private readonly auditService: AuditService = new AuditService()
  ) {
    this.registerDefaultResolvers();
  }

  /**
   * Registers custom or domain-specific asynchronous metadata resolvers.
   */
  public registerResolver(resourceType: ResourceType, resolver: ObjectMetadataResolver): void {
    this.resolvers.set(resourceType.toUpperCase(), resolver);
  }

  /**
   * Classifies the relationship of the actor relative to the targeted object instance.
   */
  public classifyRelation(actor: ActorContext, object: ObjectResourceDescriptor): OwnershipRelation {
    const isSuperAdmin = actor.roles.includes(SystemRoleCode.SUPER_ADMIN);
    if (isSuperAdmin) {
      return 'PLATFORM_SUPER_ADMIN';
    }

    // Direct Customer / User Self-Ownership
    const isDirectOwner =
      (object.ownerId && object.ownerId === actor.userId) ||
      ((object.type === 'USER' || object.type === 'CUSTOMER' || object.type === 'CUSTOMER_PROFILE') &&
        object.id === actor.userId);

    if (isDirectOwner) {
      return 'DIRECT_OWNER';
    }

    // Merchant Store Owner
    const isSellerOwner =
      actor.roles.includes(SystemRoleCode.SELLER_OWNER) &&
      Boolean(actor.sellerId) &&
      Boolean(object.sellerId) &&
      actor.sellerId === object.sellerId;

    if (isSellerOwner) {
      return 'TENANT_OWNER';
    }

    // Merchant Store Staff
    const isSellerStaff =
      actor.roles.includes(SystemRoleCode.SELLER_STAFF) &&
      Boolean(actor.sellerId) &&
      Boolean(object.sellerId) &&
      actor.sellerId === object.sellerId;

    if (isSellerStaff) {
      return 'TENANT_STAFF';
    }

    // Delegated / Assigned Operational Actor (e.g. delivery rider, support agent)
    if (object.assignedActorId && object.assignedActorId === actor.userId) {
      return 'ASSIGNED_ACTOR';
    }

    // Platform Administrator
    const isPlatformAdmin = actor.roles.includes(SystemRoleCode.ADMIN);
    if (isPlatformAdmin) {
      return 'PLATFORM_ADMIN';
    }

    // Public Resource
    if (object.isPublic) {
      return 'PUBLIC';
    }

    return 'NONE';
  }

  /**
   * Evaluates object-level access request against domain policies and returns a structured decision.
   */
  public async evaluate<TData = any>(
    intent: ObjectAccessIntent<TData>
  ): Promise<ObjectAuthorizationDecision> {
    const { actor, action, object, reason } = intent;
    const relation = this.classifyRelation(actor, object);

    // 1. Account Lifecycle Check: Suspended and deleted accounts are immediately blocked
    if (actor.status === 'SUSPENDED') {
      return {
        granted: false,
        code: 'ACCOUNT_SUSPENDED',
        reason: 'Account is currently suspended. Operational access is blocked.',
        policyName: 'ObjectAuthorizationService',
        relation,
        objectId: object.id,
        resourceType: object.type,
        diagnostics: { userId: actor.userId, status: actor.status },
      };
    }

    if (actor.status === 'DELETED') {
      return {
        granted: false,
        code: 'ACCOUNT_SUSPENDED',
        reason: 'Account has been deactivated or soft-deleted.',
        policyName: 'ObjectAuthorizationService',
        relation,
        objectId: object.id,
        resourceType: object.type,
        diagnostics: { userId: actor.userId, status: actor.status },
      };
    }

    // 2. Super Administrator Global Bypass
    if (relation === 'PLATFORM_SUPER_ADMIN') {
      return {
        granted: true,
        code: 'GRANTED',
        reason: 'Super Administrator holds global object-level operational access.',
        policyName: 'ObjectAuthorizationService',
        relation,
        objectId: object.id,
        resourceType: object.type,
      };
    }

    // 3. Delegate to Domain Policy Engine with normalized resource context
    const policyDecision = await this.policyEngine.evaluate(actor, action, {
      type: object.type,
      id: object.id,
      ownerId: object.ownerId,
      sellerId: object.sellerId,
      status: object.status || undefined,
      data: {
        ...object.data,
        assignedActorId: object.assignedActorId,
        relation,
        reason,
      },
    });

    return {
      ...policyDecision,
      relation,
      objectId: object.id,
      resourceType: object.type,
    };
  }

  /**
   * Asserts that an actor has permission to access the target object.
   * Throws AuthorizationError, ComplianceGateError on failure, and emits an immutable security audit event.
   */
  public async assert<TData = any>(
    intent: ObjectAccessIntent<TData>
  ): Promise<ObjectAuthorizationDecision> {
    const decision = await this.evaluate(intent);

    if (!decision.granted) {
      let auditAction: string = AUDIT_ACTIONS.AUTHZ_DENIED;
      if (decision.code === 'TENANT_VIOLATION') {
        auditAction = AUDIT_ACTIONS.AUTHZ_TENANT_VIOLATION;
      } else if (decision.code === 'OWNERSHIP_VIOLATION') {
        auditAction = AUDIT_ACTIONS.AUTHZ_OWNERSHIP_VIOLATION;
      } else if (decision.code === 'MAKER_CHECKER_REQUIRED') {
        auditAction = AUDIT_ACTIONS.AUTHZ_MAKER_CHECKER_REQUIRED;
      }

      await this.auditService.log({
        actorId: intent.actor.userId,
        actorRole: intent.actor.roles[0] || 'ANONYMOUS',
        action: auditAction,
        resource: intent.object.type,
        resourceId: intent.object.id,
        ipAddress: intent.actor.ipAddress || null,
        userAgent: intent.actor.userAgent || null,
        requestId: intent.actor.requestId || null,
        metadata: {
          action: intent.action,
          code: decision.code,
          reason: decision.reason,
          relation: decision.relation,
          policyName: decision.policyName,
          targetSellerId: intent.object.sellerId || null,
          targetOwnerId: intent.object.ownerId || null,
          diagnostics: decision.diagnostics,
        },
      });

      if (decision.code === 'MAKER_CHECKER_REQUIRED') {
        throw new ComplianceGateError('GATE-05', decision.reason);
      }

      throw new AuthorizationError(decision.reason, {
        code: decision.code,
        policy: decision.policyName,
        action: intent.action,
        resource: intent.object.type,
        resourceId: intent.object.id,
        relation: decision.relation,
        ...decision.diagnostics,
      });
    }

    // Log audit trail for sensitive object mutations
    const isSensitive =
      intent.action.includes('delete') ||
      intent.action.includes('cancel') ||
      intent.action.includes('refund') ||
      intent.action.includes('suspend') ||
      intent.action.includes('adjust') ||
      intent.action.includes('payout');

    if (isSensitive) {
      await this.auditService.log({
        actorId: intent.actor.userId,
        actorRole: intent.actor.roles[0] || 'UNKNOWN',
        action: AUDIT_ACTIONS.AUTHZ_GRANTED,
        resource: intent.object.type,
        resourceId: intent.object.id,
        ipAddress: intent.actor.ipAddress || null,
        userAgent: intent.actor.userAgent || null,
        requestId: intent.actor.requestId || null,
        metadata: {
          action: intent.action,
          relation: decision.relation,
          policyName: decision.policyName,
        },
      });
    }

    return decision;
  }

  /**
   * Resolves object metadata from persistent storage via registered or built-in resolvers.
   */
  public async resolve(
    resourceType: ResourceType,
    objectId: string,
    context?: Record<string, unknown>
  ): Promise<ObjectResourceDescriptor | null> {
    const resolver = this.resolvers.get(resourceType.toUpperCase());
    if (!resolver) {
      return null;
    }
    return await resolver(objectId, context);
  }

  /**
   * Resolves an object from persistent storage by ID and asserts authorization against it.
   * Throws NotFoundError if the entity cannot be located.
   */
  public async resolveAndAssert<TData = any>(
    actor: ActorContext,
    action: string,
    resourceType: ResourceType,
    objectId: string,
    options?: { data?: TData; reason?: string }
  ): Promise<{ decision: ObjectAuthorizationDecision; descriptor: ObjectResourceDescriptor<TData> }> {
    const descriptor = (await this.resolve(resourceType, objectId)) as ObjectResourceDescriptor<TData> | null;

    if (!descriptor) {
      throw new NotFoundError(`${resourceType} '${objectId}' not found`);
    }

    if (options?.data) {
      descriptor.data = { ...descriptor.data, ...options.data };
    }

    const decision = await this.assert({
      actor,
      action,
      object: descriptor,
      reason: options?.reason,
    });

    return { decision, descriptor };
  }

  /**
   * Built-in canonical entity resolvers for Prisma-backed models.
   */
  private registerDefaultResolvers(): void {
    // 1. ORDER Resolver
    this.registerResolver('ORDER', async (id: string) => {
      try {
        const order = await (prisma as any).order.findFirst({
          where: { id, deletedAt: null },
          select: {
            id: true,
            customerId: true,
            status: true,
            fulfillmentGroups: {
              where: { deletedAt: null },
              select: {
                id: true,
                sellerId: true,
                status: true,
              },
            },
          },
        });

        if (!order) return null;

        return {
          type: 'ORDER',
          id: order.id,
          ownerId: order.customerId,
          sellerId: order.fulfillmentGroups[0]?.sellerId || null,
          status: order.status,
          data: {
            fulfillmentGroupIds: order.fulfillmentGroups.map((g: any) => g.id),
            sellerIds: order.fulfillmentGroups.map((g: any) => g.sellerId),
          },
        };
      } catch {
        return null;
      }
    });

    // 2. CART Resolver
    this.registerResolver('CART', async (id: string) => {
      try {
        const cart = await (prisma as any).cart.findFirst({
          where: { id, deletedAt: null },
          select: {
            id: true,
            userId: true,
            status: true,
          },
        });

        if (!cart) return null;

        return {
          type: 'CART',
          id: cart.id,
          ownerId: cart.userId,
          status: cart.status,
        };
      } catch {
        return null;
      }
    });

    // 3. PRODUCT Resolver
    this.registerResolver('PRODUCT', async (id: string) => {
      try {
        const product = await (prisma as any).product.findFirst({
          where: { id, deletedAt: null },
          select: {
            id: true,
            sellerId: true,
            status: true,
          },
        });

        if (!product) return null;

        return {
          type: 'PRODUCT',
          id: product.id,
          sellerId: product.sellerId,
          status: product.status,
          isPublic: product.status === 'PUBLISHED' || product.status === 'ACTIVE',
        };
      } catch {
        return null;
      }
    });

    // 4. USER / CUSTOMER Resolver
    const userResolver: ObjectMetadataResolver = async (id: string) => {
      try {
        const user = await (prisma as any).user.findFirst({
          where: { id, deletedAt: null },
          select: {
            id: true,
            status: true,
            seller: { select: { id: true } },
            roles: {
              where: { deletedAt: null },
              include: { role: { select: { code: true } } },
            },
          },
        });

        if (!user) return null;

        const roleCodes = user.roles.map((r: any) => r.role.code);

        return {
          type: 'USER',
          id: user.id,
          ownerId: user.id,
          sellerId: user.seller?.id || null,
          status: user.status,
          data: { roles: roleCodes },
        };
      } catch {
        return null;
      }
    };

    this.registerResolver('USER', userResolver);
    this.registerResolver('CUSTOMER', userResolver);
    this.registerResolver('CUSTOMER_PROFILE', userResolver);

    // 5. SELLER Resolver
    this.registerResolver('SELLER', async (id: string) => {
      try {
        const seller = await (prisma as any).seller.findFirst({
          where: { id, deletedAt: null },
          select: {
            id: true,
            userId: true,
            status: true,
          },
        });

        if (!seller) return null;

        return {
          type: 'SELLER',
          id: seller.id,
          ownerId: seller.userId,
          sellerId: seller.id,
          status: seller.status,
          isPublic: seller.status === 'ACTIVE' || seller.status === 'VERIFIED',
        };
      } catch {
        return null;
      }
    });

    // 6. SELLER KYC DOCUMENT Resolver
    this.registerResolver('KYC_DOCUMENT', async (id: string) => {
      try {
        const doc = await (prisma as any).sellerKycDocument.findFirst({
          where: { id, deletedAt: null },
          select: {
            id: true,
            sellerId: true,
            status: true,
          },
        });

        if (!doc) return null;

        return {
          type: 'KYC_DOCUMENT',
          id: doc.id,
          sellerId: doc.sellerId,
          status: doc.status,
        };
      } catch {
        return null;
      }
    });

    // 7. WALLET Resolver
    this.registerResolver('WALLET', async (id: string) => {
      try {
        const wallet = await (prisma as any).wallet.findFirst({
          where: { id, deletedAt: null },
          select: {
            id: true,
            userId: true,
            sellerId: true,
            status: true,
          },
        });

        if (!wallet) return null;

        return {
          type: 'WALLET',
          id: wallet.id,
          ownerId: wallet.userId,
          sellerId: wallet.sellerId,
          status: wallet.status,
        };
      } catch {
        return null;
      }
    });

    // 8. SHIPMENT Resolver
    this.registerResolver('SHIPMENT', async (id: string) => {
      try {
        const shipment = await (prisma as any).shipment.findFirst({
          where: { id, deletedAt: null },
          select: {
            id: true,
            sellerId: true,
            status: true,
            fulfillmentGroup: {
              select: {
                order: { select: { customerId: true } },
              },
            },
          },
        });

        if (!shipment) return null;

        return {
          type: 'SHIPMENT',
          id: shipment.id,
          ownerId: shipment.fulfillmentGroup?.order?.customerId || null,
          sellerId: shipment.sellerId,
          status: shipment.status,
        };
      } catch {
        return null;
      }
    });
  }
}

/**
 * Singleton instance of ObjectAuthorizationService.
 */
export const defaultObjectAuthzService = new ObjectAuthorizationService();
