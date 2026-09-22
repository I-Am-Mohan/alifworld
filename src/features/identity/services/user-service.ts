/**
 * AlifWorld User Domain Service
 * 
 * Orchestrates user creation, uniqueness validation, Bangladesh phone normalization,
 * status transitions, and audit trail emission.
 * 
 * Reference: docs/architecture/scope-boundaries-and-domain-map.md
 * Invariant: ADR-0003, ADR-0021, ADR-0022, ADR-0023
 */

import { UserRepository } from '../repositories/user-repository';
import { RoleRepository } from '../repositories/role-repository';
import { UserRoleAssignmentRepository } from '../repositories/user-role-assignment-repository';
import { normalizeBangladeshPhone } from '@/shared/utils/phone';
import { ConflictError, NotFoundError, ValidationError } from '@/shared/errors/app-error';
import { prisma } from '@/shared/database/prisma';
import { UserModel, UserStatus, SystemRoleCode, UserWithRoleAssignments } from '../types';
import { CreateUserInput, UpdateUserInput } from '../validators';

export class UserService {
  constructor(
    private readonly userRepo: UserRepository = new UserRepository(),
    private readonly roleRepo: RoleRepository = new RoleRepository(),
    private readonly roleAssignmentRepo: UserRoleAssignmentRepository = new UserRoleAssignmentRepository()
  ) {}

  /**
   * Registers a new user with normalized phone, validated email, and initial role.
   */
  public async createUser(input: CreateUserInput, actorId?: string): Promise<UserModel> {
    const normalizedEmail = input.email ? input.email.trim().toLowerCase() : null;
    const normalizedPhone = input.phone ? normalizeBangladeshPhone(input.phone) : null;

    if (!normalizedEmail && !normalizedPhone) {
      throw new ValidationError('At least one of email or Bangladesh phone must be provided.');
    }

    // Verify email uniqueness
    if (normalizedEmail) {
      const existingEmail = await this.userRepo.findByEmail(normalizedEmail);
      if (existingEmail) {
        throw new ConflictError(`User with email '${normalizedEmail}' already exists.`, {
          email: normalizedEmail,
        });
      }
    }

    // Verify phone uniqueness
    if (normalizedPhone) {
      const existingPhone = await this.userRepo.findByPhone(normalizedPhone);
      if (existingPhone) {
        throw new ConflictError(`User with phone '${normalizedPhone}' already exists.`, {
          phone: normalizedPhone,
        });
      }
    }

    // Resolve initial role
    const initialRoleCode = input.initialRoleCode || SystemRoleCode.CUSTOMER;
    const targetRole = await this.roleRepo.findByCode(initialRoleCode);
    if (!targetRole) {
      throw new NotFoundError(`Default role '${initialRoleCode}' not found in registry.`);
    }

    // Create user record
    const user = await this.userRepo.create({
      email: normalizedEmail,
      phone: normalizedPhone,
      name: input.name || null,
      avatarUrl: input.avatarUrl || null,
      status: UserStatus.ACTIVE,
      isEmailVerified: false,
      isPhoneVerified: Boolean(normalizedPhone),
    });

    // Assign initial role
    await this.roleAssignmentRepo.assignRole({
      userId: user.id,
      roleId: targetRole.id,
      sellerId: input.sellerId || null,
      assignedBy: actorId || 'SYSTEM',
    });

    // Emit transactional outbox event
    await (prisma as any).outboxEvent.create({
      data: {
        eventType: 'USER_REGISTERED',
        aggregateType: 'User',
        aggregateId: user.id,
        payload: {
          userId: user.id,
          email: user.email,
          phone: user.phone,
          initialRole: initialRoleCode,
          sellerId: input.sellerId || null,
        },
      },
    });

    // Record in Audit Log
    await (prisma as any).auditLog.create({
      data: {
        actorId: actorId || user.id,
        actorRole: initialRoleCode,
        action: 'USER_CREATE',
        resource: 'User',
        resourceId: user.id,
        metadata: {
          email: user.email,
          phone: user.phone,
          role: initialRoleCode,
        },
      },
    });

    return user;
  }

  /**
   * Updates an existing user record with optimistic concurrency validation.
   */
  public async updateUser(
    id: string,
    expectedVersion: number,
    data: UpdateUserInput,
    actorId?: string
  ): Promise<UserModel> {
    const updated = await this.userRepo.update(id, expectedVersion, {
      name: data.name,
      avatarUrl: data.avatarUrl,
      status: data.status,
    });

    await (prisma as any).auditLog.create({
      data: {
        actorId: actorId || id,
        action: 'USER_UPDATE',
        resource: 'User',
        resourceId: id,
        metadata: {
          updatedFields: Object.keys(data),
          version: updated.version,
        },
      },
    });

    return updated;
  }

  /**
   * Suspends a user account.
   */
  public async suspendUser(id: string, expectedVersion: number, reason: string, actorId: string): Promise<UserModel> {
    const updated = await this.userRepo.update(id, expectedVersion, {
      status: UserStatus.SUSPENDED,
    });

    await (prisma as any).auditLog.create({
      data: {
        actorId,
        action: 'USER_SUSPEND',
        resource: 'User',
        resourceId: id,
        metadata: { reason, previousStatus: 'ACTIVE' },
      },
    });

    return updated;
  }

  /**
   * Activates a suspended or pending user account.
   */
  public async activateUser(id: string, expectedVersion: number, actorId: string): Promise<UserModel> {
    const updated = await this.userRepo.update(id, expectedVersion, {
      status: UserStatus.ACTIVE,
    });

    await (prisma as any).auditLog.create({
      data: {
        actorId,
        action: 'USER_ACTIVATE',
        resource: 'User',
        resourceId: id,
      },
    });

    return updated;
  }

  /**
   * Soft-deletes a user.
   */
  public async softDeleteUser(id: string, expectedVersion: number, actorId: string): Promise<UserModel> {
    const deleted = await this.userRepo.softDelete(id, expectedVersion, actorId);

    await (prisma as any).auditLog.create({
      data: {
        actorId,
        action: 'USER_SOFT_DELETE',
        resource: 'User',
        resourceId: id,
      },
    });

    return deleted;
  }

  /**
   * Retrieves a full user profile with their active role assignments and permissions.
   */
  public async getUserWithRoles(id: string): Promise<UserWithRoleAssignments | null> {
    const user = await this.userRepo.findById(id);
    if (!user) {
      return null;
    }

    const assignments = await this.roleAssignmentRepo.getUserRoleAssignments(id);

    return {
      ...user,
      roleAssignments: assignments as any,
    };
  }
}
