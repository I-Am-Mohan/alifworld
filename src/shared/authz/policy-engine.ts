/**
 * AlifWorld Server-Side Authorization Policy Engine
 * 
 * Orchestrates declarative policy evaluation, tenant isolation enforcement,
 * object ownership verification, security audit trail emission, and standardized
 * exception dispatch.
 * 
 * Invariants: ADR-0003, ADR-0006, ADR-0022, ADR-0023, Milestone 042
 */

import {
  ActorContext,
  ResourceContext,
  PolicyDecision,
  IPolicy,
  ResourceType,
} from './authz.types';
import { UserPolicy } from './policies/user.policy';
import { SellerPolicy } from './policies/seller.policy';
import { CatalogPolicy } from './policies/catalog.policy';
import { OrderPolicy } from './policies/order.policy';
import { WalletPolicy } from './policies/wallet.policy';
import { RolePolicy } from './policies/role.policy';
import { AuditService } from '@/shared/audit/audit.service';
import { AUDIT_ACTIONS } from '@/shared/audit/audit.interface';
import { AuthorizationError, ComplianceGateError } from '@/shared/errors/app-error';
import { SystemRoleCode } from '@/features/identity/types';

export class PolicyEngine {
  private readonly policies = new Map<string, IPolicy>();

  constructor(private readonly auditService: AuditService = new AuditService()) {
    this.registerDefaults();
  }

  /**
   * Registers default canonical domain policies.
   */
  private registerDefaults(): void {
    const userPolicy = new UserPolicy();
    const sellerPolicy = new SellerPolicy();
    const catalogPolicy = new CatalogPolicy();
    const orderPolicy = new OrderPolicy();
    const walletPolicy = new WalletPolicy();
    const rolePolicy = new RolePolicy();

    this.register(userPolicy);
    this.register(sellerPolicy);
    this.register(catalogPolicy);
    this.register(orderPolicy);
    this.register(walletPolicy);
    this.register(rolePolicy);

    // Register common aliases
    this.policies.set('PRODUCT', catalogPolicy);
    this.policies.set('CATEGORY', catalogPolicy);
    this.policies.set('BRAND', catalogPolicy);
    this.policies.set('FINANCE', walletPolicy);
    this.policies.set('PAYMENT', walletPolicy);
    this.policies.set('SETTLEMENT', walletPolicy);
  }

  /**
   * Registers a custom or domain policy for a specific resource type.
   */
  public register(policy: IPolicy): void {
    this.policies.set(policy.resourceType.toUpperCase(), policy);
  }

  /**
   * Evaluates an authorization request against registered policies without throwing.
   */
  public async evaluate(
    actor: ActorContext,
    action: string,
    resource: ResourceContext
  ): Promise<PolicyDecision> {
    // 1. Account Lifecycle Check: Suspended accounts are immediately blocked from all actions
    if (actor.status === 'SUSPENDED') {
      return {
        granted: false,
        code: 'ACCOUNT_SUSPENDED',
        reason: 'Account is currently suspended. Operational access is blocked.',
        policyName: 'AccountLifecyclePolicy',
        diagnostics: { userId: actor.userId, status: actor.status },
      };
    }

    if (actor.status === 'DELETED') {
      return {
        granted: false,
        code: 'ACCOUNT_SUSPENDED',
        reason: 'Account has been deactivated or soft-deleted.',
        policyName: 'AccountLifecyclePolicy',
        diagnostics: { userId: actor.userId, status: actor.status },
      };
    }

    // 2. Resolve Policy by Resource Type
    const policy = this.policies.get(resource.type.toUpperCase());
    if (policy) {
      return await policy.evaluate(actor, action, resource);
    }

    // 3. Fallback: Direct Canonical Permission Match
    const isSuperAdmin = actor.roles.includes(SystemRoleCode.SUPER_ADMIN);
    if (isSuperAdmin) {
      return {
        granted: true,
        code: 'GRANTED',
        reason: 'Super Administrator holds global administrative bypass.',
        policyName: 'DefaultFallbackPolicy',
      };
    }

    if (actor.permissions.includes(action.toLowerCase())) {
      return {
        granted: true,
        code: 'GRANTED',
        reason: `Actor holds explicit canonical permission '${action}'.`,
        policyName: 'DefaultFallbackPolicy',
      };
    }

    return {
      granted: false,
      code: 'MISSING_PERMISSION',
      reason: `No policy or permission granted for resource '${resource.type}' and action '${action}'.`,
      policyName: 'DefaultFallbackPolicy',
      diagnostics: { resourceType: resource.type, action },
    };
  }

  /**
   * Asserts that an actor is authorized. Throws AuthorizationError or ComplianceGateError if not.
   * Emits audit logs for denied requests and sensitive operations.
   */
  public async assert(
    actor: ActorContext,
    action: string,
    resource: ResourceContext
  ): Promise<PolicyDecision> {
    const decision = await this.evaluate(actor, action, resource);

    if (!decision.granted) {
      // Determine audit action
      let auditAction: string = AUDIT_ACTIONS.AUTHZ_DENIED;
      if (decision.code === 'TENANT_VIOLATION') {
        auditAction = AUDIT_ACTIONS.AUTHZ_TENANT_VIOLATION;
      } else if (decision.code === 'MAKER_CHECKER_REQUIRED') {
        auditAction = AUDIT_ACTIONS.AUTHZ_MAKER_CHECKER_REQUIRED;
      }

      // Log security audit event (non-blocking)
      await this.auditService.log({
        actorId: actor.userId,
        actorRole: actor.roles[0] || 'ANONYMOUS',
        action: auditAction,
        resource: resource.type,
        resourceId: resource.id || null,
        ipAddress: actor.ipAddress || null,
        userAgent: actor.userAgent || null,
        requestId: actor.requestId || null,
        metadata: {
          action,
          code: decision.code,
          reason: decision.reason,
          policyName: decision.policyName,
          targetSellerId: resource.sellerId || null,
          targetOwnerId: resource.ownerId || null,
          diagnostics: decision.diagnostics,
        },
      });

      if (decision.code === 'MAKER_CHECKER_REQUIRED') {
        throw new ComplianceGateError('GATE-05', decision.reason);
      }

      throw new AuthorizationError(decision.reason, {
        code: decision.code,
        policy: decision.policyName,
        action,
        resource: resource.type,
        resourceId: resource.id,
        ...decision.diagnostics,
      });
    }

    // If sensitive mutating action was granted, log audit trail
    const isSensitive =
      action.includes('delete') ||
      action.includes('suspend') ||
      action.includes('assign') ||
      action.includes('adjust') ||
      action.includes('verify');

    if (isSensitive) {
      await this.auditService.log({
        actorId: actor.userId,
        actorRole: actor.roles[0] || 'UNKNOWN',
        action: AUDIT_ACTIONS.AUTHZ_GRANTED,
        resource: resource.type,
        resourceId: resource.id || null,
        ipAddress: actor.ipAddress || null,
        userAgent: actor.userAgent || null,
        requestId: actor.requestId || null,
        metadata: {
          action,
          policyName: decision.policyName,
        },
      });
    }

    return decision;
  }

  /**
   * Convenience boolean check.
   */
  public async can(actor: ActorContext, action: string, resource: ResourceContext): Promise<boolean> {
    const decision = await this.evaluate(actor, action, resource);
    return decision.granted;
  }
}

export const defaultPolicyEngine = new PolicyEngine();
