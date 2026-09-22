/**
 * AlifWorld User Role Assignment Repository
 * 
 * Manages user-to-role mappings, tenant seller scoping, role revocations,
 * and permission resolution.
 * 
 * Reference: docs/architecture/postgresql-and-prisma-foundations.md
 * Invariant: ADR-0003, ADR-0022, ADR-0023
 */

import { BaseRepository, assertSellerScope } from '@/shared/database/base-repository';
import { generateId, ID_PREFIXES } from '@/shared/utils/id';
import { nextVersion } from '@/shared/database/lifecycle';
import { NotFoundError, ConflictError } from '@/shared/errors/app-error';
import { UserRoleAssignmentModel, RoleModel, PermissionModel } from '../types';

export interface AssignRoleParams {
  id?: string;
  userId: string;
  roleId: string;
  sellerId?: string | null;
  assignedBy?: string | null;
}

export interface RevokeRoleParams {
  assignmentId?: string;
  userId?: string;
  roleId?: string;
  sellerId?: string | null;
  actorId?: string;
}

export class UserRoleAssignmentRepository extends BaseRepository {
  /**
   * Assigns a role to a user, ensuring idempotency and respecting seller tenant scope.
   */
  public async assignRole(params: AssignRoleParams): Promise<UserRoleAssignmentModel> {
    return this.executeSafe(async () => {
      // Check if active assignment already exists
      const existing = await (this.db as any).userRoleAssignment.findFirst({
        where: {
          userId: params.userId,
          roleId: params.roleId,
          sellerId: params.sellerId || null,
          deletedAt: null,
        },
      });

      if (existing) {
        return existing as UserRoleAssignmentModel;
      }

      // Check if soft-deleted assignment exists to restore
      const deletedExisting = await (this.db as any).userRoleAssignment.findFirst({
        where: {
          userId: params.userId,
          roleId: params.roleId,
          sellerId: params.sellerId || null,
          deletedAt: { not: null },
        },
      });

      if (deletedExisting) {
        const patch = this.createRestorePatch();
        const restored = await (this.db as any).userRoleAssignment.update({
          where: { id: deletedExisting.id },
          data: {
            ...patch,
            assignedBy: params.assignedBy || null,
            version: nextVersion(deletedExisting.version),
          },
        });
        return restored as UserRoleAssignmentModel;
      }

      const id = params.id || generateId(ID_PREFIXES.ROLE_ASSIGNMENT);
      const created = await (this.db as any).userRoleAssignment.create({
        data: {
          id,
          userId: params.userId,
          roleId: params.roleId,
          sellerId: params.sellerId || null,
          assignedBy: params.assignedBy || null,
          version: 1,
        },
      });

      return created as UserRoleAssignmentModel;
    }, 'UserRoleAssignmentRepository.assignRole');
  }

  /**
   * Finds an active role assignment by ID with associated role metadata.
   */
  public async findById(id: string): Promise<any> {
    return this.executeSafe(async () => {
      return (this.db as any).userRoleAssignment.findFirst({
        where: this.whereNotDeleted({ id }),
        include: { role: true },
      });
    }, 'UserRoleAssignmentRepository.findById');
  }

  /**
   * Revokes a role assignment via soft-deletion.
   */
  public async revokeRole(params: RevokeRoleParams): Promise<void> {
    return this.executeSafe(async () => {
      this.assertCanDelete('UserRoleAssignment');

      let target: any;
      if (params.assignmentId) {
        target = await (this.db as any).userRoleAssignment.findFirst({
          where: this.whereNotDeleted({ id: params.assignmentId }),
        });
      } else if (params.userId && (params.roleId || params.sellerId)) {
        const where: any = { userId: params.userId };
        if (params.roleId) where.roleId = params.roleId;
        if (params.sellerId) where.sellerId = params.sellerId;
        target = await (this.db as any).userRoleAssignment.findFirst({
          where: this.whereNotDeleted(where),
        });
      }

      if (!target) {
        throw new NotFoundError('Active role assignment not found for revocation', { ...params });
      }

      const patch = this.createSoftDeletePatch(params.actorId);
      await (this.db as any).userRoleAssignment.update({
        where: { id: target.id },
        data: {
          ...patch,
          version: nextVersion(target.version),
        },
      });
    }, 'UserRoleAssignmentRepository.revokeRole');
  }

  /**
   * Retrieves all active role assignments for a given user, including role details and permissions.
   */
  public async getUserRoleAssignments(userId: string): Promise<
    Array<
      UserRoleAssignmentModel & {
        role: RoleModel & { permissions: PermissionModel[] };
      }
    >
  > {
    return this.executeSafe(async () => {
      const records = await (this.db as any).userRoleAssignment.findMany({
        where: this.whereNotDeleted({ userId }),
        include: {
          role: {
            include: {
              rolePermissions: {
                where: { deletedAt: null },
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      });

      return records.map((rec: any) => ({
        id: rec.id,
        userId: rec.userId,
        roleId: rec.roleId,
        sellerId: rec.sellerId,
        assignedBy: rec.assignedBy,
        version: rec.version,
        deletedAt: rec.deletedAt,
        deletedBy: rec.deletedBy,
        createdAt: rec.createdAt,
        updatedAt: rec.updatedAt,
        role: {
          id: rec.role.id,
          code: rec.role.code,
          name: rec.role.name,
          description: rec.role.description,
          isSystem: rec.role.isSystem,
          version: rec.role.version,
          deletedAt: rec.role.deletedAt,
          deletedBy: rec.role.deletedBy,
          createdAt: rec.role.createdAt,
          updatedAt: rec.role.updatedAt,
          permissions: (rec.role.rolePermissions || [])
            .map((rp: any) => rp.permission)
            .filter((p: any) => p && !p.deletedAt),
        },
      }));
    }, 'UserRoleAssignmentRepository.getUserRoleAssignments');
  }

  /**
   * Resolves a distinct list of permission codes for a user, optionally filtering by seller tenant.
   */
  public async getUserEffectivePermissions(userId: string, targetSellerId?: string): Promise<string[]> {
    const assignments = await this.getUserRoleAssignments(userId);
    const permissionSet = new Set<string>();

    for (const assignment of assignments) {
      // Global roles (sellerId == null) apply everywhere
      // Tenant roles (sellerId != null) only apply when targeting that exact seller
      if (!assignment.sellerId || (targetSellerId && assignment.sellerId === targetSellerId)) {
        for (const perm of assignment.role.permissions) {
          permissionSet.add(perm.code);
        }
      }
    }

    return Array.from(permissionSet);
  }

  /**
   * Checks whether a user possesses a specific permission code.
   */
  public async hasPermission(userId: string, permissionCode: string, targetSellerId?: string): Promise<boolean> {
    const permissions = await this.getUserEffectivePermissions(userId, targetSellerId);
    return permissions.includes(permissionCode.toLowerCase());
  }

  /**
   * Checks whether a user holds a specific role code.
   */
  public async hasRole(userId: string, roleCode: string, targetSellerId?: string): Promise<boolean> {
    const assignments = await this.getUserRoleAssignments(userId);
    return assignments.some((a) => {
      const matchesRole = a.role.code === roleCode.toUpperCase();
      if (!matchesRole) return false;
      if (!a.sellerId) return true; // Global assignment
      return targetSellerId ? a.sellerId === targetSellerId : true;
    });
  }

  /**
   * Retrieves all staff assignments associated with a specific seller tenant.
   */
  public async getSellerStaff(sellerId: string): Promise<UserRoleAssignmentModel[]> {
    return this.executeSafe(async () => {
      const records = await (this.db as any).userRoleAssignment.findMany({
        where: this.whereNotDeleted({ sellerId }),
        include: {
          user: true,
          role: true,
        },
      });
      return records as UserRoleAssignmentModel[];
    }, 'UserRoleAssignmentRepository.getSellerStaff');
  }
}
