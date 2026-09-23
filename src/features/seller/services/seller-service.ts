/**
 * AlifWorld Seller Domain Service
 * 
 * Orchestrates merchant store onboarding, KYC review transitions,
 * staff associations, and compliance audits.
 * 
 * Reference: docs/architecture/scope-boundaries-and-domain-map.md
 * Invariant: ADR-0003, ADR-0006, ADR-0021, ADR-0022, ADR-0024
 */

import { SellerRepository } from '../repositories/seller-repository';
import { SellerStaffRepository } from '../repositories/seller-staff-repository';
import { SellerStoreSettingsRepository } from '../repositories/seller-store-settings-repository';
import { SellerKycDocumentRepository } from '../repositories/seller-kyc-document-repository';
import { UserRoleAssignmentRepository } from '@/features/identity/repositories/user-role-assignment-repository';
import { RoleRepository } from '@/features/identity/repositories/role-repository';
import { ConflictError, NotFoundError, ValidationError, AuthorizationError } from '@/shared/errors/app-error';
import { prisma } from '@/shared/database/prisma';
import { PublicSellerProfile, SellerModel, SellerStatus, KycDocumentType, KycDocumentStatus } from '../types';
import { CreateSellerInput, UpdateSellerInput } from '../validators';
import { SystemRoleCode } from '@/features/identity/types';
import { generateId, ID_PREFIXES } from '@/shared/utils/id';
import { canTransitionSellerStatus } from '../lifecycle';

export class SellerService {
  constructor(
    private readonly sellerRepo: SellerRepository = new SellerRepository(),
    private readonly staffRepo: SellerStaffRepository = new SellerStaffRepository(),
    private readonly settingsRepo: SellerStoreSettingsRepository = new SellerStoreSettingsRepository(),
    private readonly kycRepo: SellerKycDocumentRepository = new SellerKycDocumentRepository(),
    private readonly roleAssignmentRepo: UserRoleAssignmentRepository = new UserRoleAssignmentRepository(),
    private readonly roleRepo: RoleRepository = new RoleRepository()
  ) {}

  /**
   * Registers a new merchant storefront.
   * Creates the seller record, default settings, and designates the owner as SELLER_OWNER.
   */
  public async registerSeller(ownerUserId: string, input: CreateSellerInput): Promise<SellerModel> {
    // Check if slug is unique
    const existingSlug = await this.sellerRepo.findBySlug(input.slug);
    if (existingSlug) {
      throw new ConflictError(`Store slug '${input.slug}' is already taken. Please select another URL handle.`, {
        slug: input.slug,
      });
    }

    // Check if owner already has a registered store
    const existingOwner = await this.sellerRepo.findByOwnerUserId(ownerUserId);
    if (existingOwner) {
      throw new ConflictError('A store is already registered for this merchant account.', {
        ownerUserId,
        existingSellerId: existingOwner.id,
      });
    }

    // Create seller record
    const seller = await this.sellerRepo.create({
      ownerUserId,
      businessName: input.businessName,
      slug: input.slug,
      tradeLicenseNumber: input.tradeLicenseNumber,
      binNumber: input.binNumber,
      tinNumber: input.tinNumber,
      status: SellerStatus.DRAFT,
    });

    // Initialize default store settings
    await this.settingsRepo.upsertSettings(seller.id, {
      vacationMode: false,
    });

    // Register owner in SellerStaff
    await this.staffRepo.addStaff({
      sellerId: seller.id,
      userId: ownerUserId,
      roleCode: 'SELLER_OWNER',
      permissions: ['*'],
    });

    // Assign scoped SELLER_OWNER role in IAM
    const ownerRole = await this.roleRepo.findByCode(SystemRoleCode.SELLER_OWNER);
    if (ownerRole) {
      await this.roleAssignmentRepo.assignRole({
        userId: ownerUserId,
        roleId: ownerRole.id,
        sellerId: seller.id,
        assignedBy: 'SELLER_REGISTER',
      });
    }

    // Emit transactional outbox event
    await (prisma as any).outboxEvent.create({
      data: {
        eventType: 'SELLER_REGISTERED',
        aggregateType: 'Seller',
        aggregateId: seller.id,
        payload: {
          sellerId: seller.id,
          ownerUserId,
          businessName: seller.businessName,
          slug: seller.slug,
        },
      },
    });

    // Record in Audit Log
    await (prisma as any).auditLog.create({
      data: {
        actorId: ownerUserId,
        action: 'SELLER_REGISTER',
        resource: 'Seller',
        resourceId: seller.id,
        metadata: {
          businessName: seller.businessName,
          slug: seller.slug,
        },
      },
    });

    return seller;
  }

  /**
   * Updates seller profile details with OCC version check.
   */
  public async getPublicProfileBySlug(slug: string): Promise<PublicSellerProfile | null> {
    return this.sellerRepo.findVerifiedPublicBySlug(slug);
  }

  public async updateSeller(
    sellerId: string,
    expectedVersion: number,
    data: UpdateSellerInput,
    actorId: string
  ): Promise<SellerModel> {
    const updated = await this.sellerRepo.update(sellerId, expectedVersion, {
      businessName: data.businessName,
      tradeLicenseNumber: data.tradeLicenseNumber,
      binNumber: data.binNumber,
      tinNumber: data.tinNumber,
    });

    await (prisma as any).auditLog.create({
      data: {
        actorId,
        action: 'SELLER_UPDATE',
        resource: 'Seller',
        resourceId: sellerId,
        metadata: { updatedFields: Object.keys(data), version: updated.version },
      },
    });

    return updated;
  }

  /**
   * Approves and verifies a merchant store (Admin Only).
   * Verifies that at least a Trade License document has been approved.
   */
  public async verifySeller(sellerId: string, expectedVersion: number, adminUserId: string): Promise<SellerModel> {
    const kycDocs = await this.kycRepo.listBySeller(sellerId);
    const hasVerifiedTradeLicense = kycDocs.some(
      (d) => d.documentType === KycDocumentType.TRADE_LICENSE && d.status === KycDocumentStatus.VERIFIED
    );

    if (!hasVerifiedTradeLicense) {
      throw new ValidationError(
        'Cannot verify merchant store without a verified Trade License document.',
        { sellerId }
      );
    }

    const updated = await this.sellerRepo.update(sellerId, expectedVersion, {
      status: SellerStatus.VERIFIED,
      verifiedAt: new Date(),
      verifiedBy: adminUserId,
    });

    await (prisma as any).outboxEvent.create({
      data: {
        eventType: 'SELLER_VERIFIED',
        aggregateType: 'Seller',
        aggregateId: sellerId,
        payload: {
          sellerId,
          businessName: updated.businessName,
          verifiedBy: adminUserId,
        },
      },
    });

    await (prisma as any).auditLog.create({
      data: {
        actorId: adminUserId,
        action: 'SELLER_VERIFY',
        resource: 'Seller',
        resourceId: sellerId,
        metadata: { status: SellerStatus.VERIFIED },
      },
    });

    return updated;
  }

  public async restrictSeller(sellerId: string, expectedVersion: number, reason: string, adminUserId: string): Promise<SellerModel> {
    return this.transitionLifecycle(sellerId, expectedVersion, SellerStatus.RESTRICTED, reason, adminUserId);
  }

  public async reactivateSeller(sellerId: string, expectedVersion: number, reason: string, adminUserId: string): Promise<SellerModel> {
    return this.transitionLifecycle(sellerId, expectedVersion, SellerStatus.VERIFIED, reason, adminUserId);
  }

  private async transitionLifecycle(sellerId: string, expectedVersion: number, targetStatus: SellerStatus, reason: string, adminUserId: string): Promise<SellerModel> {
    if (!reason || reason.trim().length < 5) throw new ValidationError('A descriptive lifecycle reason (minimum 5 characters) is required.');
    const current = await this.sellerRepo.findById(sellerId);
    if (!current) throw new NotFoundError(`Seller with id '${sellerId}' not found.`);
    if (!canTransitionSellerStatus(current.status, targetStatus)) throw new ConflictError(`Seller cannot transition from ${current.status} to ${targetStatus}.`);
    if (current.version !== expectedVersion) throw new ConflictError('Seller was modified by another request.');
    return prisma.$transaction(async (tx: any) => {
      const update = await tx.seller.updateMany({ where: { id: sellerId, deletedAt: null, version: expectedVersion, status: current.status }, data: { status: targetStatus, rejectionReason: targetStatus === SellerStatus.SUSPENDED ? reason.trim() : null, restrictionReason: targetStatus === SellerStatus.RESTRICTED ? reason.trim() : null, version: expectedVersion + 1 } });
      if (update.count !== 1) throw new ConflictError('Seller lifecycle changed before this request completed.');
      const eventId = generateId(ID_PREFIXES.AUDIT);
      await tx.sellerLifecycleEvent.create({ data: { id: generateId(ID_PREFIXES.CONFIG), sellerId, fromStatus: current.status, toStatus: targetStatus, reason: reason.trim(), actorId: adminUserId } });
      await tx.outboxEvent.create({ data: { id: generateId(ID_PREFIXES.OUTBOX), eventType: targetStatus === SellerStatus.VERIFIED ? 'SELLER_REACTIVATED' : targetStatus === SellerStatus.RESTRICTED ? 'SELLER_RESTRICTED' : 'SELLER_SUSPENDED', aggregateType: 'Seller', aggregateId: sellerId, payload: { sellerId, fromStatus: current.status, toStatus: targetStatus, reason: reason.trim(), actorId: adminUserId } } });
      await tx.auditLog.create({ data: { id: eventId, actorId: adminUserId, action: targetStatus === SellerStatus.VERIFIED ? 'SELLER_REACTIVATED' : targetStatus === SellerStatus.RESTRICTED ? 'SELLER_RESTRICTED' : 'SELLER_SUSPENDED', resource: 'Seller', resourceId: sellerId, metadata: { fromStatus: current.status, toStatus: targetStatus, reason: reason.trim() } } });
      return tx.seller.findUnique({ where: { id: sellerId } });
    });
  }

  /**
   * Suspends a merchant store (Admin Only).
   */
  public async suspendSeller(
    sellerId: string,
    expectedVersion: number,
    reason: string,
    adminUserId: string
  ): Promise<SellerModel> {
    return this.transitionLifecycle(sellerId, expectedVersion, SellerStatus.SUSPENDED, reason, adminUserId);
  }

  /**
   * Rejects a seller KYC registration application (Admin Only).
   */
  public async rejectSeller(
    sellerId: string,
    expectedVersion: number,
    reason: string,
    adminUserId: string
  ): Promise<SellerModel> {
    if (!reason || reason.trim().length < 5) {
      throw new ValidationError('A descriptive rejection reason (minimum 5 characters) is required.');
    }

    const updated = await this.sellerRepo.update(sellerId, expectedVersion, {
      status: SellerStatus.REJECTED,
      rejectionReason: reason.trim(),
    });

    await (prisma as any).auditLog.create({
      data: {
        actorId: adminUserId,
        action: 'SELLER_REJECT',
        resource: 'Seller',
        resourceId: sellerId,
        metadata: { reason },
      },
    });

    return updated;
  }
}
