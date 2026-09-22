/**
 * AlifWorld Role Repository
 * 
 * Manages RBAC Role entities, system role protections, and RolePermission mappings.
 * 
 * Reference: docs/architecture/postgresql-and-prisma-foundations.md
 * Invariant: ADR-0003, ADR-0022, ADR-0023
 */

import { BaseRepository } from '@/shared/database/base-repository';
import { generateId, ID_PREFIXES } from '@/shared/utils/id';
import { nextVersion } from '@/shared/database/lifecycle';
import { NotFoundError, ValidationError, ConflictError } from '@/shared/errors/app-error';
import { RoleModel, PermissionModel } from '../types';

export interface CreateRoleData {
  id?: string;
  code: string;
  name: string;
  description?: string | null;
  isSystem?: boolean;
}

export interface UpdateRoleData {
  name?: string;
  description?: string | null;
}

export class RoleRepository extends BaseRepository {
  /**
   * Finds an active role by primary identifier.
   */
  public async findById(id: string): Promise<RoleModel | null> {
    return this.executeSafe(async () => {
      const role = await (this.db as any).role.findFirst({
        where: this.whereNotDeleted({ id }),
      });
      return role as RoleModel | null;
    }, 'RoleRepository.findById');
  }

  /**
   * Finds an active role by unique role code (e.g. 'ADMIN', 'SELLER_OWNER').
   */
  public async findByCode(code: string): Promise<RoleModel | null> {
    return this.executeSafe(async () => {
      const role = await (this.db as any).role.findFirst({
        where: this.whereNotDeleted({ code: code.toUpperCase() }),
      });
      return role as RoleModel | null;
    }, 'RoleRepository.findByCode');
  }

  /**
   * Creates a new role record with a standardized `rol_...` ID.
   */
  public async create(data: CreateRoleData): Promise<RoleModel> {
    return this.executeSafe(async () => {
      const id = data.id || generateId(ID_PREFIXES.ROLE);

      const created = await (this.db as any).role.create({
        data: {
          id,
          code: data.code.toUpperCase(),
          name: data.name.trim(),
          description: data.description?.trim() || null,
          isSystem: data.isSystem ?? false,
          version: 1,
        },
      });

      return created as RoleModel;
    }, 'RoleRepository.create');
  }

  /**
   * Updates a role with OCC version checking.
   */
  public async update(id: string, expectedVersion: number, data: UpdateRoleData): Promise<RoleModel> {
    return this.executeSafe(async () => {
      const existing = await this.findById(id);
      if (!existing) {
        throw new NotFoundError(`Role with id '${id}' not found`, { id });
      }

      this.assertVersion(existing.version, expectedVersion, id);

      const updated = await (this.db as any).role.update({
        where: { id },
        data: {
          ...data,
          version: nextVersion(existing.version),
        },
      });

      return updated as RoleModel;
    }, 'RoleRepository.update');
  }

  /**
   * Soft-deletes a role, barring deletion if it is a protected system role.
   */
  public async softDelete(id: string, expectedVersion: number, actorId?: string): Promise<RoleModel> {
    return this.executeSafe(async () => {
      this.assertCanDelete('Role');

      const existing = await this.findById(id);
      if (!existing) {
        throw new NotFoundError(`Role with id '${id}' not found`, { id });
      }

      if (existing.isSystem) {
        throw new ValidationError(
          `Protected system role '${existing.code}' cannot be deleted.`,
          { roleId: id, code: existing.code }
        );
      }

      this.assertVersion(existing.version, expectedVersion, id);

      const patch = this.createSoftDeletePatch(actorId);
      const updated = await (this.db as any).role.update({
        where: { id },
        data: {
          ...patch,
          version: nextVersion(existing.version),
        },
      });

      return updated as RoleModel;
    }, 'RoleRepository.softDelete');
  }

  /**
   * Lists all active roles ordered by system precedence and name.
   */
  public async listAll(): Promise<RoleModel[]> {
    return this.executeSafe(async () => {
      const roles = await (this.db as any).role.findMany({
        where: this.whereNotDeleted(),
        orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
      });
      return roles as RoleModel[];
    }, 'RoleRepository.listAll');
  }

  /**
   * Assigns a permission to a role via the junction table.
   */
  public async assignPermission(roleId: string, permissionId: string): Promise<void> {
    return this.executeSafe(async () => {
      const existing = await (this.db as any).rolePermission.findFirst({
        where: { roleId, permissionId, deletedAt: null },
      });

      if (!existing) {
        const id = generateId(ID_PREFIXES.ROLE_PERMISSION);
        await (this.db as any).rolePermission.upsert({
          where: { roleId_permissionId: { roleId, permissionId } },
          update: { deletedAt: null, deletedBy: null },
          create: { id, roleId, permissionId, version: 1 },
        });
      }
    }, 'RoleRepository.assignPermission');
  }

  /**
   * Revokes a permission from a role.
   */
  public async revokePermission(roleId: string, permissionId: string): Promise<void> {
    return this.executeSafe(async () => {
      await (this.db as any).rolePermission.deleteMany({
        where: { roleId, permissionId },
      });
    }, 'RoleRepository.revokePermission');
  }

  /**
   * Retrieves all permissions assigned to a given role.
   */
  public async getRolePermissions(roleId: string): Promise<PermissionModel[]> {
    return this.executeSafe(async () => {
      const records = await (this.db as any).rolePermission.findMany({
        where: { roleId, deletedAt: null },
        include: {
          permission: true,
        },
      });

      return records
        .map((r: any) => r.permission)
        .filter((p: any) => p && !p.deletedAt) as PermissionModel[];
    }, 'RoleRepository.getRolePermissions');
  }
}
