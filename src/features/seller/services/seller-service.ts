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

  /**
   * Suspends a merchant store (Admin Only).
   */
  public async suspendSeller(
    sellerId: string,
    expectedVersion: number,
    reason: string,
    adminUserId: string
  ): Promise<SellerModel> {
    const updated = await this.sellerRepo.update(sellerId, expectedVersion, {
      status: SellerStatus.SUSPENDED,
      rejectionReason: reason,
    });

    await (prisma as any).outboxEvent.create({
      data: {
        eventType: 'SELLER_SUSPENDED',
        aggregateType: 'Seller',
        aggregateId: sellerId,
        payload: { sellerId, reason, adminUserId },
      },
    });

    await (prisma as any).auditLog.create({
      data: {
        actorId: adminUserId,
        action: 'SELLER_SUSPEND',
        resource: 'Seller',
        resourceId: sellerId,
        metadata: { reason },
      },
    });

    return updated;
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
