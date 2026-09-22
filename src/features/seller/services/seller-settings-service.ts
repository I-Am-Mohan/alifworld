/**
 * AlifWorld Seller Store Settings Service
 * 
 * Manages store profile customization, courier defaults, logistics addresses,
 * and vacation mode.
 * 
 * Reference: docs/architecture/scope-boundaries-and-domain-map.md
 * Invariant: ADR-0003, ADR-0006, ADR-0024
 */

import { SellerStoreSettingsRepository } from '../repositories/seller-store-settings-repository';
import { SellerRepository } from '../repositories/seller-repository';
import { UserRoleAssignmentRepository } from '@/features/identity/repositories/user-role-assignment-repository';
import { NotFoundError, AuthorizationError } from '@/shared/errors/app-error';
import { prisma } from '@/shared/database/prisma';
import { SellerStoreSettingsModel } from '../types';
import { UpdateStoreSettingsInput } from '../validators';
import { SystemRoleCode } from '@/features/identity/types';

export class SellerSettingsService {
  constructor(
    private readonly settingsRepo: SellerStoreSettingsRepository = new SellerStoreSettingsRepository(),
    private readonly sellerRepo: SellerRepository = new SellerRepository(),
    private readonly roleAssignmentRepo: UserRoleAssignmentRepository = new UserRoleAssignmentRepository()
  ) {}

  /**
   * Updates store settings with strict tenant isolation.
   */
  public async updateSettings(
    actorUserId: string,
    input: UpdateStoreSettingsInput
  ): Promise<SellerStoreSettingsModel> {
    const seller = await this.sellerRepo.findById(input.sellerId);
    if (!seller) {
      throw new NotFoundError(`Seller with id '${input.sellerId}' not found.`);
    }

    // Verify tenant authorization: Owner, tenant staff, or Admin
    const isOwner = seller.ownerUserId === actorUserId;
    const isTenantStaff = await this.roleAssignmentRepo.hasRole(
      actorUserId,
      SystemRoleCode.SELLER_STAFF,
      input.sellerId
    );
    const isSuperAdmin = await this.roleAssignmentRepo.hasRole(actorUserId, SystemRoleCode.SUPER_ADMIN);

    if (!isOwner && !isTenantStaff && !isSuperAdmin) {
      throw new AuthorizationError('You do not have permission to update settings for this seller storefront.');
    }

    const updated = await this.settingsRepo.upsertSettings(input.sellerId, {
      logoUrl: input.logoUrl,
      bannerUrl: input.bannerUrl,
      supportEmail: input.supportEmail,
      supportPhone: input.supportPhone,
      pickupAddress: input.pickupAddress,
      returnAddress: input.returnAddress,
      defaultCourier: input.defaultCourier,
      vacationMode: input.vacationMode,
      vacationMessage: input.vacationMessage,
      version: input.version,
    });

    await (prisma as any).auditLog.create({
      data: {
        actorId: actorUserId,
        action: 'SELLER_SETTINGS_UPDATE',
        resource: 'SellerStoreSettings',
        resourceId: updated.id,
        metadata: {
          sellerId: input.sellerId,
          vacationMode: updated.vacationMode,
          courier: updated.defaultCourier,
        },
      },
    });

    return updated;
  }

  /**
   * Retrieves store settings for a specific seller.
   */
  public async getSettings(sellerId: string): Promise<SellerStoreSettingsModel | null> {
    return this.settingsRepo.findBySellerId(sellerId);
  }
}
