/**
 * AlifWorld Seller Staff Repository
 * 
 * Manages seller staff delegations with strict tenant scoping.
 * 
 * Reference: docs/architecture/postgresql-and-prisma-foundations.md
 * Invariant: ADR-0003, ADR-0006, ADR-0022, ADR-0024
 */

import { BaseRepository, assertSellerScope } from '@/shared/database/base-repository';
import { generateId, ID_PREFIXES } from '@/shared/utils/id';
import { nextVersion } from '@/shared/database/lifecycle';
import { NotFoundError } from '@/shared/errors/app-error';
import { SellerStaffModel } from '../types';

export interface AddStaffData {
  id?: string;
  sellerId: string;
  userId: string;
  roleCode?: string;
  permissions?: string[];
}

export class SellerStaffRepository extends BaseRepository {
  /**
   * Finds an active staff assignment by primary ID.
   */
  public async findById(id: string): Promise<SellerStaffModel | null> {
    return this.executeSafe(async () => {
      const staff = await (this.db as any).sellerStaff.findFirst({
        where: this.whereNotDeleted({ id }),
      });
      return staff as SellerStaffModel | null;
    }, 'SellerStaffRepository.findById');
  }

  /**
   * Finds an active staff assignment for a specific user and seller.
   */
  public async findBySellerAndUser(sellerId: string, userId: string): Promise<SellerStaffModel | null> {
    return this.executeSafe(async () => {
      const staff = await (this.db as any).sellerStaff.findFirst({
        where: this.whereNotDeleted({ sellerId, userId }),
      });
      return staff as SellerStaffModel | null;
    }, 'SellerStaffRepository.findBySellerAndUser');
  }

  /**
   * Adds or restores a staff member for a seller.
   */
  public async addStaff(data: AddStaffData): Promise<SellerStaffModel> {
    return this.executeSafe(async () => {
      const existing = await (this.db as any).sellerStaff.findFirst({
        where: {
          sellerId: data.sellerId,
          userId: data.userId,
        },
      });

      if (existing && !existing.deletedAt) {
        return existing as SellerStaffModel;
      }

      if (existing && existing.deletedAt) {
        const patch = this.createRestorePatch();
        const restored = await (this.db as any).sellerStaff.update({
          where: { id: existing.id },
          data: {
            ...patch,
            roleCode: data.roleCode || 'SELLER_STAFF',
            permissions: data.permissions || [],
            version: nextVersion(existing.version),
          },
        });
        return restored as SellerStaffModel;
      }

      const id = data.id || generateId(ID_PREFIXES.STAFF);
      const created = await (this.db as any).sellerStaff.create({
        data: {
          id,
          sellerId: data.sellerId,
          userId: data.userId,
          roleCode: data.roleCode || 'SELLER_STAFF',
          permissions: data.permissions || [],
          version: 1,
        },
      });

      return created as SellerStaffModel;
    }, 'SellerStaffRepository.addStaff');
  }

  /**
   * Removes a staff member from a seller via soft-deletion.
   */
  public async removeStaff(sellerId: string, userId: string, actorId?: string): Promise<void> {
    return this.executeSafe(async () => {
      this.assertCanDelete('SellerStaff');

      const existing = await this.findBySellerAndUser(sellerId, userId);
      if (!existing) {
        throw new NotFoundError(`Staff member not found for seller '${sellerId}'`, { sellerId, userId });
      }

      assertSellerScope(existing.sellerId, sellerId);

      const patch = this.createSoftDeletePatch(actorId);
      await (this.db as any).sellerStaff.update({
        where: { id: existing.id },
        data: {
          ...patch,
          version: nextVersion(existing.version),
        },
      });
    }, 'SellerStaffRepository.removeStaff');
  }

  /**
   * Lists all active staff members for a specific seller tenant.
   */
  public async listBySeller(sellerId: string): Promise<
    Array<
      SellerStaffModel & {
        user: { id: string; name: string | null; email: string | null; phone: string | null };
      }
    >
  > {
    return this.executeSafe(async () => {
      const records = await (this.db as any).sellerStaff.findMany({
        where: this.whereNotDeleted({ sellerId }),
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      return records as Array<
        SellerStaffModel & {
          user: { id: string; name: string | null; email: string | null; phone: string | null };
        }
      >;
    }, 'SellerStaffRepository.listBySeller');
  }
}
