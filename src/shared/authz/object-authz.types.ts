/**
 * AlifWorld Object-Level Authorization & Ownership Verification Types
 * 
 * Formalizes granular object ownership, merchant tenant containment,
 * lifecycle state boundaries, and actor assignment contracts.
 * 
 * Invariants: ADR-0003, ADR-0006, ADR-0022, ADR-0023, Milestone 047
 */

import { ActorContext, ResourceType, PolicyDecision, PolicyDecisionCode } from './authz.types';

/**
 * Normalized metadata describing an individual target entity instance.
 */
export interface ObjectResourceDescriptor<TData = any> {
  /** Resource type discriminator (e.g. ORDER, CART, PRODUCT, SELLER, CUSTOMER) */
  type: ResourceType;
  /** Primary identifier of the object instance */
  id: string;
  /** Direct individual owner user identifier (e.g. customerId, userId) */
  ownerId?: string | null;
  /** Multi-tenant merchant seller identifier owning or fulfilling the object */
  sellerId?: string | null;
  /** Identifier of an explicitly assigned operational actor (e.g. rider, support agent) */
  assignedActorId?: string | null;
  /** Current lifecycle status of the entity (e.g. PENDING, SHIPPED, ACTIVE, ARCHIVED) */
  status?: string | null;
  /** Whether the object is flagged for public/unauthenticated access (e.g. published product) */
  isPublic?: boolean;
  /** Optional parent resource identifier for nested sub-resources (e.g. orderId for orderItem) */
  parentResourceId?: string | null;
  /** Additional domain payload attributes used for policy decisions (e.g. amountPoisha, checkerId) */
  data?: TData;
}

/**
 * Access request intent targeted at a specific object instance.
 */
export interface ObjectAccessIntent<TData = any> {
  /** The action being attempted (e.g. 'read', 'update', 'delete', 'cancel', 'manage') */
  action: string;
  /** Authenticated actor context executing the action */
  actor: ActorContext;
  /** Target object descriptor */
  object: ObjectResourceDescriptor<TData>;
  /** Optional operational justification (mandatory for certain sensitive administrative overrides) */
  reason?: string;
}

/**
 * Specific ownership classification of an actor relative to an object.
 */
export type OwnershipRelation =
  | 'DIRECT_OWNER'       // Actor is the direct customer/user owner
  | 'TENANT_OWNER'       // Actor is the merchant store owner of the object
  | 'TENANT_STAFF'       // Actor is authorized staff within the object's merchant tenant
  | 'ASSIGNED_ACTOR'     // Actor is assigned (e.g. delivery rider or support agent)
  | 'PLATFORM_SUPER_ADMIN' // Super administrator with global privileges
  | 'PLATFORM_ADMIN'     // Platform administrator with role/permission access
  | 'PUBLIC'             // Publicly accessible object
  | 'NONE';              // Actor holds no relationship or authority over the object

/**
 * Enriched authorization decision for object-level evaluations.
 */
export interface ObjectAuthorizationDecision extends PolicyDecision {
  /** Identified relationship of the actor to the target object */
  relation: OwnershipRelation;
  /** Object identifier */
  objectId: string;
  /** Target resource type */
  resourceType: ResourceType;
}

/**
 * Asynchronous resolver function that retrieves object metadata by ID.
 */
export type ObjectMetadataResolver<T = any> = (
  id: string,
  context?: Record<string, unknown>
) => Promise<ObjectResourceDescriptor<T> | null>;
