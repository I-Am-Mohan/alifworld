/**
 * AlifWorld Permission Repository
 * 
 * Manages atomic authorization permissions across all platform modules.
 * 
 * Reference: docs/architecture/postgresql-and-prisma-foundations.md
 * Invariant: ADR-0003, ADR-0022, ADR-0023
 */

import { BaseRepository } from '@/shared/database/base-repository';
import { generateId, ID_PREFIXES } from '@/shared/utils/id';
import { PermissionModel } from '../types';

export interface CreatePermissionData {
  id?: string;
  code: string;
  name: string;
  module: string;
  description?: string | null;
}

export class PermissionRepository extends BaseRepository {
  /**
   * Finds an active permission by primary identifier.
   */
  public async findById(id: string): Promise<PermissionModel | null> {
    return this.executeSafe(async () => {
      const permission = await (this.db as any).permission.findFirst({
        where: this.whereNotDeleted({ id }),
      });
      return permission as PermissionModel | null;
    }, 'PermissionRepository.findById');
  }

  /**
   * Finds an active permission by its unique slug code (e.g. 'users:read').
   */
  public async findByCode(code: string): Promise<PermissionModel | null> {
    return this.executeSafe(async () => {
      const permission = await (this.db as any).permission.findFirst({
        where: this.whereNotDeleted({ code: code.toLowerCase() }),
      });
      return permission as PermissionModel | null;
    }, 'PermissionRepository.findByCode');
  }

  /**
   * Creates a new permission record with a standardized `prm_...` ID.
   */
  public async create(data: CreatePermissionData): Promise<PermissionModel> {
    return this.executeSafe(async () => {
      const id = data.id || generateId(ID_PREFIXES.PERMISSION);

      const created = await (this.db as any).permission.create({
        data: {
          id,
          code: data.code.toLowerCase(),
          name: data.name.trim(),
          module: data.module.toUpperCase(),
          description: data.description?.trim() || null,
          version: 1,
        },
      });

      return created as PermissionModel;
    }, 'PermissionRepository.create');
  }

  /**
   * Lists all active permissions ordered by module and code.
   */
  public async listAll(): Promise<PermissionModel[]> {
    return this.executeSafe(async () => {
      const permissions = await (this.db as any).permission.findMany({
        where: this.whereNotDeleted(),
        orderBy: [{ module: 'asc' }, { code: 'asc' }],
      });
      return permissions as PermissionModel[];
    }, 'PermissionRepository.listAll');
  }

  /**
   * Lists permissions grouped by functional module (e.g. 'IAM', 'FINANCE').
   */
  public async listByModule(module: string): Promise<PermissionModel[]> {
    return this.executeSafe(async () => {
      const permissions = await (this.db as any).permission.findMany({
        where: this.whereNotDeleted({ module: module.toUpperCase() }),
        orderBy: { code: 'asc' },
      });
      return permissions as PermissionModel[];
    }, 'PermissionRepository.listByModule');
  }
}
