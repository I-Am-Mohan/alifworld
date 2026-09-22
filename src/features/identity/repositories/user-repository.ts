/**
 * AlifWorld User Repository
 * 
 * Encapsulates database queries for the User model, enforces OCC versioning,
 * pagination, search filters, and soft-delete lifecycle rules.
 * 
 * Reference: docs/architecture/postgresql-and-prisma-foundations.md
 * Invariant: ADR-0003, ADR-0021, ADR-0022, ADR-0023
 */

import { BaseRepository, parseOffsetPagination, formatPaginatedResult, PaginatedResponse } from '@/shared/database/base-repository';
import { generateId, ID_PREFIXES } from '@/shared/utils/id';
import { nextVersion } from '@/shared/database/lifecycle';
import { NotFoundError, ConflictError } from '@/shared/errors/app-error';
import { UserModel, UserFilterOptions } from '../types';

export interface CreateUserData {
  id?: string;
  email?: string | null;
  phone?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
  status?: string;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
}

export interface UpdateUserData {
  name?: string | null;
  avatarUrl?: string | null;
  status?: string;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  lastLoginAt?: Date | null;
}

export class UserRepository extends BaseRepository {
  /**
   * Finds an active (not soft-deleted) user by unique identifier.
   */
  public async findById(id: string): Promise<UserModel | null> {
    return this.executeSafe(async () => {
      const user = await (this.db as any).user.findFirst({
        where: this.whereNotDeleted({ id }),
      });
      return user as UserModel | null;
    }, 'UserRepository.findById');
  }

  /**
   * Finds a user by unique identifier, including soft-deleted records if specified.
   */
  public async findByIdWithDeleted(id: string): Promise<UserModel | null> {
    return this.executeSafe(async () => {
      const user = await (this.db as any).user.findUnique({
        where: { id },
      });
      return user as UserModel | null;
    }, 'UserRepository.findByIdWithDeleted');
  }

  /**
   * Finds an active user by normalized email address.
   */
  public async findByEmail(email: string): Promise<UserModel | null> {
    return this.executeSafe(async () => {
      const user = await (this.db as any).user.findFirst({
        where: this.whereNotDeleted({ email: email.trim().toLowerCase() }),
      });
      return user as UserModel | null;
    }, 'UserRepository.findByEmail');
  }

  /**
   * Finds an active user by normalized Bangladesh E.164 phone number.
   */
  public async findByPhone(phone: string): Promise<UserModel | null> {
    return this.executeSafe(async () => {
      const user = await (this.db as any).user.findFirst({
        where: this.whereNotDeleted({ phone: phone.trim() }),
      });
      return user as UserModel | null;
    }, 'UserRepository.findByPhone');
  }

  /**
   * Creates a new user record with a standardized k-sortable ID (`usr_...`).
   */
  public async create(data: CreateUserData): Promise<UserModel> {
    return this.executeSafe(async () => {
      const id = data.id || generateId(ID_PREFIXES.USER);

      const created = await (this.db as any).user.create({
        data: {
          id,
          email: data.email ? data.email.trim().toLowerCase() : null,
          phone: data.phone ? data.phone.trim() : null,
          name: data.name ? data.name.trim() : null,
          avatarUrl: data.avatarUrl || null,
          status: data.status || 'ACTIVE',
          isEmailVerified: data.isEmailVerified ?? false,
          isPhoneVerified: data.isPhoneVerified ?? false,
          version: 1,
        },
      });

      return created as UserModel;
    }, 'UserRepository.create');
  }

  /**
   * Updates a user record with Optimistic Concurrency Control (OCC) version verification.
   */
  public async update(id: string, expectedVersion: number, data: UpdateUserData): Promise<UserModel> {
    return this.executeSafe(async () => {
      const existing = await this.findById(id);
      if (!existing) {
        throw new NotFoundError(`User with id '${id}' not found`, { id });
      }

      this.assertVersion(existing.version, expectedVersion, id);

      const updated = await (this.db as any).user.update({
        where: { id },
        data: {
          ...data,
          version: nextVersion(existing.version),
        },
      });

      return updated as UserModel;
    }, 'UserRepository.update');
  }

  /**
   * Soft-deletes a user entity, recording deletion timestamp and actor.
   */
  public async softDelete(id: string, expectedVersion: number, actorId?: string): Promise<UserModel> {
    return this.executeSafe(async () => {
      this.assertCanDelete('User');

      const existing = await this.findById(id);
      if (!existing) {
        throw new NotFoundError(`User with id '${id}' not found`, { id });
      }

      this.assertVersion(existing.version, expectedVersion, id);

      const patch = this.createSoftDeletePatch(actorId);
      const updated = await (this.db as any).user.update({
        where: { id },
        data: {
          ...patch,
          status: 'DELETED',
          version: nextVersion(existing.version),
        },
      });

      return updated as UserModel;
    }, 'UserRepository.softDelete');
  }

  /**
   * Restores a previously soft-deleted user.
   */
  public async restore(id: string, expectedVersion: number): Promise<UserModel> {
    return this.executeSafe(async () => {
      const existing = await this.findByIdWithDeleted(id);
      if (!existing) {
        throw new NotFoundError(`User with id '${id}' not found`, { id });
      }

      this.assertVersion(existing.version, expectedVersion, id);

      const patch = this.createRestorePatch();
      const updated = await (this.db as any).user.update({
        where: { id },
        data: {
          ...patch,
          status: 'ACTIVE',
          version: nextVersion(existing.version),
        },
      });

      return updated as UserModel;
    }, 'UserRepository.restore');
  }

  /**
   * Lists users with pagination, search, status filters, and role filters.
   */
  public async listPaginated(
    options: UserFilterOptions & { page?: number; limit?: number } = {}
  ): Promise<PaginatedResponse<UserModel>> {
    return this.executeSafe(async () => {
      const { skip, take, page, limit } = parseOffsetPagination({
        page: options.page,
        limit: options.limit,
      });

      const where: any = options.includeDeleted ? {} : { deletedAt: null };

      if (options.status) {
        where.status = options.status;
      }

      if (options.search) {
        const query = options.search.trim();
        where.OR = [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query } },
        ];
      }

      if (options.roleCode || options.sellerId) {
        where.roleAssignments = {
          some: {
            deletedAt: null,
            ...(options.roleCode ? { role: { code: options.roleCode } } : {}),
            ...(options.sellerId ? { sellerId: options.sellerId } : {}),
          },
        };
      }

      const [items, total] = await Promise.all([
        (this.db as any).user.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: 'desc' },
        }),
        (this.db as any).user.count({ where }),
      ]);

      return formatPaginatedResult(items as UserModel[], total, page, limit);
    }, 'UserRepository.listPaginated');
  }
}
