/**
 * AlifWorld Server-Side Authorization Policy Engine Types & Contracts
 * 
 * Defines Actor context, Resource context, Actions, Decision codes,
 * and declarative Policy contracts for multi-tenant ABAC/RBAC evaluation.
 * 
 * Invariants: ADR-0003, ADR-0022, ADR-0023, Phase 05 Milestone 042
 */

export type AccountStatus = 'ACTIVE' | 'PENDING_VERIFICATION' | 'SUSPENDED' | 'DELETED' | string;

/**
 * Contextual attributes of the authenticated actor making the request.
 */
export interface ActorContext {
  userId: string;
  roles: string[];
  permissions: string[];
  sellerId?: string | null;
  status?: AccountStatus;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  tokenVersion?: number;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

/**
 * Resource type discriminator for authorization targets.
 */
export type ResourceType =
  | 'USER'
  | 'SELLER'
  | 'CATALOG'
  | 'PRODUCT'
  | 'ORDER'
  | 'WALLET'
  | 'INVENTORY'
  | 'ROLE'
  | 'FINANCE'
  | 'SYSTEM'
  | 'CUSTOMER'
  | 'CUSTOMER_PROFILE'
  | 'RIDER'
  | 'DELIVERY'
  | 'SHIPMENT'
  | 'SUPPORT'
  | 'TICKET'
  | 'INQUIRY'
  | 'SYSTEM_SERVICE'
  | 'WORKER'
  | 'SERVICE'
  | string;

/**
 * Target resource being accessed or modified.
 */
export interface ResourceContext<TData = any> {
  type: ResourceType;
  id?: string;
  ownerId?: string | null;
  sellerId?: string | null;
  status?: string;
  data?: TData;
}

/**
 * Standardized authorization decision codes.
 */
export type PolicyDecisionCode =
  | 'GRANTED'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'ACCOUNT_SUSPENDED'
  | 'MISSING_ROLE'
  | 'MISSING_PERMISSION'
  | 'TENANT_VIOLATION'
  | 'OWNERSHIP_VIOLATION'
  | 'PRIVILEGE_ESCALATION'
  | 'MAKER_CHECKER_REQUIRED';

/**
 * Immutable decision result emitted by the policy engine.
 */
export interface PolicyDecision {
  granted: boolean;
  code: PolicyDecisionCode;
  reason: string;
  policyName: string;
  diagnostics?: Record<string, unknown>;
}

/**
 * Declarative policy contract governing access to a specific resource type.
 */
export interface IPolicy<TResource = any> {
  readonly name: string;
  readonly resourceType: ResourceType;

  evaluate(
    actor: ActorContext,
    action: string,
    resource: ResourceContext<TResource>
  ): Promise<PolicyDecision> | PolicyDecision;
}
