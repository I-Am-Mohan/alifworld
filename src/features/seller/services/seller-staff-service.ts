/**
 * AlifWorld Seller Staff Domain Service
 * 
 * Manages store staff delegation, invitations, role assignments,
 * and scoped access controls within strict multi-tenant isolation boundaries.
 * 
 * Invariants: ADR-0003, ADR-0006, ADR-0021, ADR-0022, ADR-0024, Milestone 045
 */

import { SellerRepository } from '../repositories/seller-repository';
import { SellerStaffRepository } from '../repositories/seller-staff-repository';
import { UserRepository } from '@/features/identity/repositories/user-repository';
import { RoleRepository } from '@/features/identity/repositories/role-repository';
import { UserRoleAssignmentRepository } from '@/features/identity/repositories/user-role-assignment-repository';
import { ConflictError, NotFoundError, ValidationError, AuthorizationError } from '@/shared/errors/app-error';
import { prisma } from '@/shared/database/prisma';
import { SellerStaffModel } from '../types';
import { AddSellerStaffInput, InviteSellerStaffInput } from '../validators';
import { UserStatus, SystemRoleCode } from '@/features/identity/types';
import { normalizeBangladeshPhone } from '@/shared/utils/phone';

export class SellerStaffService {
  constructor(
    private readonly sellerRepo: SellerRepository = new SellerRepository(),
    private readonly staffRepo: SellerStaffRepository = new SellerStaffRepository(),
    private readonly userRepo: UserRepository = new UserRepository(),
    private readonly roleRepo: RoleRepository = new RoleRepository(),
    private readonly roleAssignmentRepo: UserRoleAssignmentRepository = new UserRoleAssignmentRepository()
  ) {}

  /**
   * Lists active staff members for a specific seller store.
   */
  public async listStaff(sellerId: string) {
    const seller = await this.sellerRepo.findById(sellerId);
    if (!seller) {
      throw new NotFoundError(`Seller store with id '${sellerId}' not found.`);
    }

    return this.staffRepo.listBySeller(sellerId);
  }

  public async listActivity(sellerId: string, page = 1, limit = 50) {
    const seller = await this.sellerRepo.findById(sellerId);
    if (!seller) throw new NotFoundError(`Seller store with id '${sellerId}' not found.`);
    return this.staffRepo.listActivity(sellerId, page, limit);
  }

  /**
   * Adds or invites a staff member to a seller store with scoped permissions.
   */
  public async addOrInviteStaff(
    actorUserId: string,
    input: AddSellerStaffInput | InviteSellerStaffInput
  ): Promise<SellerStaffModel> {
    const seller = await this.sellerRepo.findById(input.sellerId);
    if (!seller) {
      throw new NotFoundError(`Seller store with id '${input.sellerId}' not found.`);
    }

    // 1. Resolve or create target user
    let targetUserId: string;

    if ('userId' in input && input.userId) {
      const existingUser = await this.userRepo.findById(input.userId);
      if (!existingUser) {
        throw new NotFoundError(`User with id '${input.userId}' not found.`);
      }
      targetUserId = existingUser.id;
    } else {
      const email = input.email ? input.email.trim().toLowerCase() : null;
      const phone = input.phone ? normalizeBangladeshPhone(input.phone) : null;

      let existingUser = email ? await this.userRepo.findByEmail(email) : null;
      if (!existingUser && phone) {
        existingUser = await this.userRepo.findByPhone(phone);
      }

      if (existingUser) {
        targetUserId = existingUser.id;
      } else {
        // Create user identity for the invited staff member
        const createdUser = await this.userRepo.create({
          email,
          phone,
          name: input.name || (email ? email.split('@')[0] : 'Staff Member'),
          status: UserStatus.ACTIVE,
          isEmailVerified: Boolean(email),
          isPhoneVerified: Boolean(phone),
        });
        targetUserId = createdUser.id;
      }
    }

    // 2. Prevent designating owner as subordinate staff or re-adding owner
    if (targetUserId === seller.ownerUserId) {
      throw new ConflictError('User is already the registered owner of this store.');
    }

    // 3. Prevent duplicate active staff assignments
    const existingStaff = await this.staffRepo.findBySellerAndUser(input.sellerId, targetUserId);
    if (existingStaff && !existingStaff.deletedAt) {
      throw new ConflictError('User is already an active staff member of this store.', {
        sellerId: input.sellerId,
        userId: targetUserId,
      });
    }

    // 4. Validate and enforce roleCode: must be store-level roles only
    const roleCode = input.roleCode || SystemRoleCode.SELLER_STAFF;
    const allowedStaffRoles = [SystemRoleCode.SELLER_STAFF, 'SELLER_MANAGER', 'STORE_MANAGER'];
    if (!allowedStaffRoles.includes(roleCode as any)) {
      throw new AuthorizationError(
        `Invalid staff role '${roleCode}'. Only store staff or manager roles can be assigned.`
      );
    }

    const targetRole = await this.roleRepo.findByCode(roleCode);
    if (!targetRole) {
      throw new NotFoundError(`Role '${roleCode}' not found in registry.`);
    }

    // 5. Add or restore staff in SellerStaff repository
    const staff = await this.staffRepo.addStaff({
      sellerId: input.sellerId,
      userId: targetUserId,
      roleCode,
      permissions: input.permissions || [],
    });

    // 6. Assign scoped role in UserRoleAssignment repository
    await this.roleAssignmentRepo.assignRole({
      userId: targetUserId,
      roleId: targetRole.id,
      sellerId: input.sellerId,
      assignedBy: actorUserId,
    });

    // 7. Emit transactional outbox event
    await (prisma as any).outboxEvent.create({
      data: {
        eventType: 'SELLER_STAFF_INVITED',
        aggregateType: 'SellerStaff',
        aggregateId: staff.id,
        payload: {
          staffId: staff.id,
          sellerId: input.sellerId,
          userId: targetUserId,
          roleCode,
          permissions: input.permissions || [],
          invitedBy: actorUserId,
        },
      },
    });

    // 8. Record in audit log
    await (prisma as any).auditLog.create({
      data: {
        actorId: actorUserId,
        action: 'SELLER_STAFF_ADDED',
        resource: 'SellerStaff',
        resourceId: staff.id,
        metadata: {
          sellerId: input.sellerId,
          targetUserId,
          roleCode,
          permissions: input.permissions || [],
        },
      },
    });

    return staff;
  }

  /**
   * Removes a staff member from a seller store.
   */
  public async removeStaff(actorUserId: string, sellerId: string, targetUserId: string): Promise<void> {
    const seller = await this.sellerRepo.findById(sellerId);
    if (!seller) {
      throw new NotFoundError(`Seller store with id '${sellerId}' not found.`);
    }

    if (targetUserId === seller.ownerUserId) {
      throw new ValidationError('Cannot remove the store owner from store staff.');
    }

    // Remove staff from SellerStaff
    await this.staffRepo.removeStaff(sellerId, targetUserId, actorUserId);

    // Revoke scoped role assignment in IAM
    try {
      await this.roleAssignmentRepo.revokeRole({
        userId: targetUserId,
        sellerId,
        actorId: actorUserId,
      });
    } catch (err: any) {
      if (!(err instanceof NotFoundError)) {
        throw err;
      }
    }

    // Record in audit log
    await (prisma as any).auditLog.create({
      data: {
        actorId: actorUserId,
        action: 'SELLER_STAFF_REMOVED',
        resource: 'SellerStaff',
        resourceId: `${sellerId}:${targetUserId}`,
        metadata: {
          sellerId,
          targetUserId,
          removedBy: actorUserId,
        },
      },
    });
  }
}
