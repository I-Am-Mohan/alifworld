/**
 * Identity & Access Management (IAM) Domain Types & Ubiquitous Language
 * 
 * Defines User, Role, Permission, Role Assignment structures, status enums,
 * and session contracts.
 * 
 * Reference: docs/architecture/scope-boundaries-and-domain-map.md
 * Invariant: ADR-0003, ADR-0022, ADR-0023
 */

/**
 * Standard user account lifecycle states.
 */
export enum UserStatus {
  ACTIVE = 'ACTIVE',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  SUSPENDED = 'SUSPENDED',
  DELETED = 'DELETED',
}

/**
 * Standard system roles. System roles are pre-seeded and cannot be hard-deleted.
 */
export enum SystemRoleCode {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  OPERATIONS = 'OPERATIONS',
  SUPPORT = 'SUPPORT',
  FINANCE = 'FINANCE',
  SELLER_OWNER = 'SELLER_OWNER',
  SELLER_STAFF = 'SELLER_STAFF',
  CUSTOMER = 'CUSTOMER',
  RIDER = 'RIDER',
  SYSTEM_SERVICE = 'SYSTEM_SERVICE',
}

/**
 * Backwards-compatible UserRole enum matching historical sessions.
 */
export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  SELLER = 'SELLER',
  RIDER = 'RIDER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

/**
 * Functional modules grouping granular permissions.
 */
export enum PermissionModule {
  IAM = 'IAM',
  SELLER = 'SELLER',
  CATALOG = 'CATALOG',
  ORDER = 'ORDER',
  FINANCE = 'FINANCE',
  SYSTEM = 'SYSTEM',
  SUPPORT = 'SUPPORT',
  LOGISTICS = 'LOGISTICS',
}

/**
 * Authoritative Canonical System Permissions
 */
export const CANONICAL_PERMISSIONS = {
  // IAM & User Management
  USERS_READ: 'users:read',
  USERS_WRITE: 'users:write',
  USERS_DELETE: 'users:delete',
  USERS_SUSPEND: 'users:suspend',
  ROLES_READ: 'roles:read',
  ROLES_MANAGE: 'roles:manage',
  ROLES_ASSIGN: 'roles:assign',
  PERMISSIONS_READ: 'permissions:read',

  // Seller Management
  SELLERS_READ: 'sellers:read',
  SELLERS_VERIFY: 'sellers:verify',
  SELLERS_SUSPEND: 'sellers:suspend',
  SELLER_PROFILE_MANAGE: 'seller:profile:manage',
  SELLER_STAFF_MANAGE: 'seller:staff:manage',

  // Catalog Taxonomy & Products
  CATALOG_READ: 'catalog:read',
  CATALOG_WRITE: 'catalog:write',
  CATALOG_SUBMIT: 'catalog:submit',
  CATALOG_APPROVE: 'catalog:approve',
  CATALOG_PUBLISH: 'catalog:publish',
  CATALOG_ARCHIVE: 'catalog:archive',

  // Orders & Fulfillment
  ORDERS_READ: 'orders:read',
  ORDERS_MANAGE: 'orders:manage',
  ORDERS_CANCEL: 'orders:cancel',
  ORDERS_REFUND: 'orders:refund',

  // Support & Customer Care
  SUPPORT_READ: 'support:read',
  SUPPORT_MANAGE: 'support:manage',
  SUPPORT_ASSIGN: 'support:assign',

  // Logistics & Rider Delivery
  RIDER_DISPATCH: 'rider:dispatch',
  RIDER_STATUS_UPDATE: 'rider:status:update',
  RIDER_LOCATION_UPDATE: 'rider:location:update',

  // Finance & Ledger
  FINANCE_READ: 'finance:read',
  FINANCE_LEDGER: 'finance:ledger',
  FINANCE_ADJUST: 'finance:adjust',
  FINANCE_PAYOUT: 'finance:payout',

  // System & Operations
  SYSTEM_CONFIG: 'system:config',
  SYSTEM_AUDIT_READ: 'system:audit_read',
  SYSTEM_SERVICE_EXECUTE: 'system:service:execute',
  SYSTEM_OUTBOX_PROCESS: 'system:outbox:process',
  SYSTEM_RECONCILE: 'system:reconcile',
} as const;

export type PermissionCode = (typeof CANONICAL_PERMISSIONS)[keyof typeof CANONICAL_PERMISSIONS];

/**
 * Authenticated user session contract.
 */
export interface UserSession {
  readonly userId: string;
  readonly email?: string;
  readonly phone?: string;
  readonly role: UserRole | SystemRoleCode;
  readonly roles?: string[];
  readonly permissions?: string[];
  readonly sellerId?: string; // Set when user acts within a seller tenant context
  readonly createdAt: Date;
}

/**
 * Core User Model Interface
 */
export interface UserModel {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  avatarUrl: string | null;
  locale: string;
  status: UserStatus | string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  lastLoginAt: Date | null;
  version: number;
  deletedAt: Date | null;
  deletedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Role Model Interface
 */
export interface RoleModel {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  version: number;
  deletedAt: Date | null;
  deletedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Granular Permission Model Interface
 */
export interface PermissionModel {
  id: string;
  code: string;
  name: string;
  module: string;
  description: string | null;
  version: number;
  deletedAt: Date | null;
  deletedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User Role Assignment Model Interface
 */
export interface UserRoleAssignmentModel {
  id: string;
  userId: string;
  roleId: string;
  sellerId: string | null;
  assignedBy: string | null;
  version: number;
  deletedAt: Date | null;
  deletedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Role with mapped permissions.
 */
export interface RoleWithPermissions extends RoleModel {
  permissions: PermissionModel[];
}

/**
 * User with all assigned active roles.
 */
export interface UserWithRoleAssignments extends UserModel {
  roleAssignments: Array<
    UserRoleAssignmentModel & {
      role: RoleWithPermissions;
    }
  >;
}

/**
 * Filter options for listing users.
 */
export interface UserFilterOptions {
  search?: string;
  status?: UserStatus | string;
  roleCode?: string;
  sellerId?: string;
  includeDeleted?: boolean;
}
