/**
 * AlifWorld Seller Store Settings Service
 * 
 * Manages store profile customization, courier defaults, logistics addresses,
 * and vacation mode.
 * 
 * Reference: docs/architecture/scope-boundaries-and-domain-map.md
 * Invariant: ADR-0003, ADR-0006, ADR-0024
 */

import { createHash } from 'crypto';
import { SellerStoreSettingsRepository } from '../repositories/seller-store-settings-repository';
import { SellerRepository } from '../repositories/seller-repository';
import { UserRoleAssignmentRepository } from '@/features/identity/repositories/user-role-assignment-repository';
import { NotFoundError, AuthorizationError } from '@/shared/errors/app-error';
import { prisma } from '@/shared/database/prisma';
import { SellerStoreSettingsModel } from '../types';
import { UpdateStoreSettingsInput } from '../validators';
import { SystemRoleCode } from '@/features/identity/types';
import { generateId, ID_PREFIXES } from '@/shared/utils/id';
import { S3PrivateObjectStorage } from '@/shared/storage/s3-object-storage';
import { validateBrandingFile } from '../branding-validation';

export class SellerSettingsService {
  constructor(
    private readonly settingsRepo: SellerStoreSettingsRepository = new SellerStoreSettingsRepository(),
    private readonly sellerRepo: SellerRepository = new SellerRepository(),
    private readonly roleAssignmentRepo: UserRoleAssignmentRepository = new UserRoleAssignmentRepository(),
    private readonly storage: S3PrivateObjectStorage = new S3PrivateObjectStorage()
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
      storeDescription: input.storeDescription,
      shippingPolicy: input.shippingPolicy,
      returnPolicy: input.returnPolicy,
      cancellationPolicy: input.cancellationPolicy,
      publicEmailEnabled: input.publicEmailEnabled,
      publicPhoneEnabled: input.publicPhoneEnabled,
      publicPickupAddressEnabled: input.publicPickupAddressEnabled,
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

  public async uploadBranding(
    actorUserId: string,
    sellerId: string,
    assetType: 'LOGO' | 'BANNER',
    file: File,
    expectedVersion: number
  ): Promise<SellerStoreSettingsModel> {
    const seller = await this.sellerRepo.findById(sellerId);
    if (!seller) throw new NotFoundError(`Seller with id '${sellerId}' not found.`);
    const isOwner = seller.ownerUserId === actorUserId;
    const isTenantStaff = await this.roleAssignmentRepo.hasRole(actorUserId, SystemRoleCode.SELLER_STAFF, sellerId);
    const isSuperAdmin = await this.roleAssignmentRepo.hasRole(actorUserId, SystemRoleCode.SUPER_ADMIN);
    if (!isOwner && !isTenantStaff && !isSuperAdmin) throw new AuthorizationError('You do not have permission to update branding for this seller storefront.');

    const bytes = new Uint8Array(await file.arrayBuffer());
    validateBrandingFile(file, bytes, assetType);
    const contentSha256 = createHash('sha256').update(bytes).digest('hex');
    const extension = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1];
    const objectKey = `public/store-branding/${sellerId}/${generateId(ID_PREFIXES.MEDIA)}-${contentSha256}.${extension}`;
    const current = await this.settingsRepo.findBySellerId(sellerId);
    const previousObjectKey = assetType === 'LOGO' ? current?.logoObjectKey : current?.bannerObjectKey;
    await this.storage.putObject({ key: objectKey, body: bytes, contentType: file.type, metadata: { sellerId, assetType, sha256: contentSha256 } });
    try {
      const updated = await this.settingsRepo.upsertSettings(sellerId, assetType === 'LOGO' ? { logoObjectKey: objectKey, logoUrl: null, version: expectedVersion } : { bannerObjectKey: objectKey, bannerUrl: null, version: expectedVersion });
      await (prisma as any).auditLog.create({ data: { actorId: actorUserId, action: 'SELLER_BRANDING_UPDATED', resource: 'SellerStoreSettings', resourceId: updated.id, metadata: { sellerId, assetType, contentSha256 } } });
      if (previousObjectKey && previousObjectKey !== objectKey) await this.storage.deleteObject(previousObjectKey).catch(() => undefined);
      return updated;
    } catch (error) {
      await this.storage.deleteObject(objectKey).catch(() => undefined);
      throw error;
    }
  }

  /**
   * Retrieves store settings for a specific seller.
   */
  public async getSettings(sellerId: string): Promise<SellerStoreSettingsModel | null> {
    return this.settingsRepo.findBySellerId(sellerId);
  }
}
