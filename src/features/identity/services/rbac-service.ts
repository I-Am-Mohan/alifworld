/**
 * AlifWorld RBAC (Role-Based Access Control) Domain Service
 * 
 * Enforces server-side authorization checks, permission evaluation,
 * seller-tenant scoping, and role delegation rules.
 * 
 * Reference: docs/architecture/scope-boundaries-and-domain-map.md
 * Invariant: ADR-0003, ADR-0006, ADR-0022, ADR-0023
 */

import { RoleRepository } from '../repositories/role-repository';
import { PermissionRepository } from '../repositories/permission-repository';
import { UserRoleAssignmentRepository } from '../repositories/user-role-assignment-repository';
import { AuthorizationError, NotFoundError, ValidationError } from '@/shared/errors/app-error';
import { prisma } from '@/shared/database/prisma';
import { SystemRoleCode, RoleModel, PermissionModel } from '../types';
import { CreateRoleInput, AssignRoleInput, RevokeRoleInput } from '../validators';

export class RbacService {
  constructor(
    private readonly roleRepo: RoleRepository = new RoleRepository(),
    private readonly permissionRepo: PermissionRepository = new PermissionRepository(),
    private readonly roleAssignmentRepo: UserRoleAssignmentRepository = new UserRoleAssignmentRepository()
  ) {}

  /**
   * Asserts that a user has a specific permission. Throws AuthorizationError if not.
   * If targetSellerId is provided, evaluates tenant-scoped permissions.
   */
  public async assertPermission(userId: string, permissionCode: string, targetSellerId?: string): Promise<void> {
    const hasPerm = await this.roleAssignmentRepo.hasPermission(userId, permissionCode, targetSellerId);
    if (!hasPerm) {
      throw new AuthorizationError(
        `Authorization Denied: User lacks required permission '${permissionCode}'.`,
        { userId, permissionCode, targetSellerId }
      );
    }
  }

  /**
   * Asserts that a user has a specific role. Throws AuthorizationError if not.
   */
  public async assertRole(userId: string, roleCode: string, targetSellerId?: string): Promise<void> {
    const hasRole = await this.roleAssignmentRepo.hasRole(userId, roleCode, targetSellerId);
    if (!hasRole) {
      throw new AuthorizationError(
        `Authorization Denied: User does not hold role '${roleCode}'.`,
        { userId, roleCode, targetSellerId }
      );
    }
  }

  /**
   * Enforces multi-tenant isolation: verifies that a user has valid staff/owner access
   * to a specific seller tenant.
   * 
   * Super Admins automatically bypass tenant restrictions.
   */
  public async assertSellerTenantAccess(userId: string, sellerId: string): Promise<void> {
    // 1. Super Admins hold global access
    const isSuperAdmin = await this.roleAssignmentRepo.hasRole(userId, SystemRoleCode.SUPER_ADMIN);
    if (isSuperAdmin) {
      return;
    }

    // 2. Check if user holds an active role scoped to this sellerId
    const assignments = await this.roleAssignmentRepo.getUserRoleAssignments(userId);
    const hasTenantRole = assignments.some(
      (a) => a.sellerId === sellerId && (a.role.code === SystemRoleCode.SELLER_OWNER || a.role.code === SystemRoleCode.SELLER_STAFF)
    );

    if (!hasTenantRole) {
      throw new AuthorizationError(
        `Tenant isolation violation: User is not authorized to access resources for seller '${sellerId}'.`,
        { userId, sellerId }
      );
    }
  }

  /**
   * Assigns a role to a user.
   * Enforces actor authorization:
   * - Only SUPER_ADMIN can assign SUPER_ADMIN.
   * - Only SUPER_ADMIN or ADMIN can assign platform roles.
   * - SELLER_OWNER can only assign SELLER_STAFF for their own sellerId.
   */
  public async assignRole(actorUserId: string, input: AssignRoleInput): Promise<void> {
    const targetRole = await this.roleRepo.findById(input.roleId);
    if (!targetRole) {
      throw new NotFoundError(`Role with id '${input.roleId}' not found.`);
    }

    // Check if target role requires sellerId scoping
    const isSellerRole = targetRole.code === SystemRoleCode.SELLER_OWNER || targetRole.code === SystemRoleCode.SELLER_STAFF;
    if (isSellerRole && !input.sellerId) {
      throw new ValidationError(
        `Role '${targetRole.code}' requires a valid 'sellerId' tenant scope.`,
        { roleCode: targetRole.code }
      );
    }

    // Actor privilege verification
    const actorIsSuperAdmin = await this.roleAssignmentRepo.hasRole(actorUserId, SystemRoleCode.SUPER_ADMIN);
    const actorIsAdmin = await this.roleAssignmentRepo.hasRole(actorUserId, SystemRoleCode.ADMIN);

    if (targetRole.code === SystemRoleCode.SUPER_ADMIN && !actorIsSuperAdmin) {
      throw new AuthorizationError('Only a Super Administrator can assign the SUPER_ADMIN role.');
    }

    if (!actorIsSuperAdmin && !actorIsAdmin) {
      // If actor is not platform admin, check if they are SELLER_OWNER for the target seller
      if (input.sellerId && targetRole.code === SystemRoleCode.SELLER_STAFF) {
        const isOwner = await this.roleAssignmentRepo.hasRole(actorUserId, SystemRoleCode.SELLER_OWNER, input.sellerId);
        if (!isOwner) {
          throw new AuthorizationError('Only the store owner or an administrator can assign staff roles for this seller.');
        }
      } else {
        throw new AuthorizationError('Insufficient privileges to assign this role.');
      }
    }

    await this.roleAssignmentRepo.assignRole({
      userId: input.userId,
      roleId: input.roleId,
      sellerId: input.sellerId || null,
      assignedBy: actorUserId,
    });

    await (prisma as any).auditLog.create({
      data: {
        actorId: actorUserId,
        action: 'ROLE_ASSIGN',
        resource: 'UserRoleAssignment',
        resourceId: `${input.userId}:${input.roleId}`,
        metadata: {
          targetUserId: input.userId,
          roleCode: targetRole.code,
          sellerId: input.sellerId || null,
        },
      },
    });
  }

  /**
   * Revokes a role assignment.
   */
  public async revokeRole(actorUserId: string, input: RevokeRoleInput): Promise<void> {
    const actorIsSuperAdmin = await this.roleAssignmentRepo.hasRole(actorUserId, SystemRoleCode.SUPER_ADMIN);
    const actorIsAdmin = await this.roleAssignmentRepo.hasRole(actorUserId, SystemRoleCode.ADMIN);

    if (!actorIsSuperAdmin && !actorIsAdmin && !input.sellerId) {
      throw new AuthorizationError('Insufficient privileges to revoke platform roles.');
    }

    await this.roleAssignmentRepo.revokeRole({
      assignmentId: input.assignmentId,
      userId: input.userId,
      roleId: input.roleId,
      sellerId: input.sellerId || null,
      actorId: actorUserId,
    });

    await (prisma as any).auditLog.create({
      data: {
        actorId: actorUserId,
        action: 'ROLE_REVOKE',
        resource: 'UserRoleAssignment',
        resourceId: input.assignmentId || `${input.userId}:${input.roleId}`,
        metadata: input,
      },
    });
  }

  /**
   * Creates a custom role and maps permissions to it.
   */
  public async createRole(actorUserId: string, input: CreateRoleInput): Promise<RoleModel> {
    await this.assertPermission(actorUserId, 'roles:manage');

    const role = await this.roleRepo.create({
      code: input.code,
      name: input.name,
      description: input.description,
      isSystem: false,
    });

    for (const permCode of input.permissionCodes) {
      const perm = await this.permissionRepo.findByCode(permCode);
      if (perm) {
        await this.roleRepo.assignPermission(role.id, perm.id);
      }
    }

    await (prisma as any).auditLog.create({
      data: {
        actorId: actorUserId,
        action: 'ROLE_CREATE',
        resource: 'Role',
        resourceId: role.id,
        metadata: {
          code: role.code,
          permissionCount: input.permissionCodes.length,
        },
      },
    });

    return role;
  }
}
