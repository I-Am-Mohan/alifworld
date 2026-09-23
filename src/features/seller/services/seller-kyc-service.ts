/**
 * AlifWorld Seller KYC Service
 * 
 * Handles document submissions, administrative verification, and audited
 * access control for merchant KYC files.
 * 
 * Reference: docs/architecture/scope-boundaries-and-domain-map.md
 * Invariant: ADR-0003, ADR-0006, ADR-0024
 */

import { createHash } from 'crypto';
import { SellerKycDocumentRepository } from '../repositories/seller-kyc-document-repository';
import { SellerRepository } from '../repositories/seller-repository';
import { UserRoleAssignmentRepository } from '@/features/identity/repositories/user-role-assignment-repository';
import { NotFoundError, AuthorizationError, ValidationError } from '@/shared/errors/app-error';
import { prisma } from '@/shared/database/prisma';
import { SellerKycDocumentModel, KycDocumentStatus, KycDocumentType } from '../types';
import { SubmitKycDocumentInput, VerifyKycDocumentInput } from '../validators';
import { SystemRoleCode } from '@/features/identity/types';
import { generateId, ID_PREFIXES } from '@/shared/utils/id';
import { S3PrivateObjectStorage } from '@/shared/storage/s3-object-storage';

export class SellerKycService {
  constructor(
    private readonly kycRepo: SellerKycDocumentRepository = new SellerKycDocumentRepository(),
    private readonly sellerRepo: SellerRepository = new SellerRepository(),
    private readonly roleAssignmentRepo: UserRoleAssignmentRepository = new UserRoleAssignmentRepository(),
    private readonly storage: S3PrivateObjectStorage = new S3PrivateObjectStorage()
  ) {}

  /**
   * Submits a regulatory KYC document for a merchant storefront.
   */
  public async submitDocument(
    actorUserId: string,
    input: SubmitKycDocumentInput
  ): Promise<SellerKycDocumentModel> {
    const seller = await this.sellerRepo.findById(input.sellerId);
    if (!seller) {
      throw new NotFoundError(`Seller with id '${input.sellerId}' not found.`, { sellerId: input.sellerId });
    }

    // Verify actor is owner or authorized staff of this seller
    const isOwner = seller.ownerUserId === actorUserId;
    const hasTenantStaffRole = await this.roleAssignmentRepo.hasRole(
      actorUserId,
      SystemRoleCode.SELLER_STAFF,
      input.sellerId
    );
    const isSuperAdmin = await this.roleAssignmentRepo.hasRole(actorUserId, SystemRoleCode.SUPER_ADMIN);

    if (!isOwner && !hasTenantStaffRole && !isSuperAdmin) {
      throw new AuthorizationError('You do not have permission to submit KYC documents for this seller tenant.');
    }

    const doc = await this.kycRepo.submitDocument({
      sellerId: input.sellerId,
      documentType: input.documentType,
      documentNumber: input.documentNumber,
      fileUrl: input.fileUrl,
      fileSize: input.fileSize,
      mimeType: input.mimeType,
    });

    // If seller was in DRAFT, transition to PENDING_VERIFICATION
    if (seller.status === 'DRAFT') {
      await this.sellerRepo.update(seller.id, seller.version, {
        status: 'PENDING_VERIFICATION',
      });
    }

    // Emit transactional outbox event
    await (prisma as any).outboxEvent.create({
      data: {
        eventType: 'SELLER_KYC_SUBMITTED',
        aggregateType: 'Seller',
        aggregateId: input.sellerId,
        payload: {
          sellerId: input.sellerId,
          documentId: doc.id,
          documentType: doc.documentType,
        },
      },
    });

    // Record in Audit Log
    await (prisma as any).auditLog.create({
      data: {
        actorId: actorUserId,
        action: 'SELLER_KYC_SUBMIT',
        resource: 'SellerKycDocument',
        resourceId: doc.id,
        metadata: {
          sellerId: input.sellerId,
          documentType: doc.documentType,
          fileSize: doc.fileSize,
        },
      },
    });

    return doc;
  }

  /**
   * Uploads a validated private object and records only its non-sensitive metadata.
   * The database stores the S3 object key in fileUrl; it never stores a public URL.
   */
  public async uploadDocument(
    actorUserId: string,
    input: Omit<SubmitKycDocumentInput, 'fileUrl' | 'fileSize' | 'mimeType'> & { mimeType: string },
    file: Uint8Array
  ): Promise<SellerKycDocumentModel> {
    const seller = await this.sellerRepo.findById(input.sellerId);
    if (!seller) throw new NotFoundError(`Seller with id '${input.sellerId}' not found.`, { sellerId: input.sellerId });

    const isOwner = seller.ownerUserId === actorUserId;
    const hasTenantStaffRole = await this.roleAssignmentRepo.hasRole(actorUserId, SystemRoleCode.SELLER_STAFF, input.sellerId);
    const isSuperAdmin = await this.roleAssignmentRepo.hasRole(actorUserId, SystemRoleCode.SUPER_ADMIN);
    if (!isOwner && !hasTenantStaffRole && !isSuperAdmin) {
      throw new AuthorizationError('You do not have permission to submit KYC documents for this seller tenant.');
    }

    const contentSha256 = createHash('sha256').update(file).digest('hex');
    const duplicate = await this.kycRepo.findByContentHash(input.sellerId, contentSha256);
    if (duplicate) {
      throw new ValidationError('This document has already been uploaded for this seller.', { documentId: duplicate.id });
    }

    const documentId = generateId(ID_PREFIXES.KYC_DOCUMENT);
    const objectKey = `private/kyc/${input.sellerId}/${documentId}/${input.documentType.toLowerCase()}`;
    await this.storage.putObject({
      key: objectKey,
      body: file,
      contentType: input.mimeType,
      metadata: { sellerId: input.sellerId, documentId, sha256: contentSha256 },
    });

    try {
      const doc = await this.kycRepo.submitDocument({
        id: documentId,
        sellerId: input.sellerId,
        documentType: input.documentType,
        documentNumber: input.documentNumber,
        fileUrl: objectKey,
        fileSize: file.byteLength,
        mimeType: input.mimeType,
        contentSha256,
        uploadedBy: actorUserId,
      });

      if (seller.status === 'DRAFT') {
        await this.sellerRepo.update(seller.id, seller.version, { status: 'PENDING_VERIFICATION' });
      }

      await (prisma as any).outboxEvent.create({
        data: {
          eventType: 'SELLER_KYC_SUBMITTED',
          aggregateType: 'SellerKycDocument',
          aggregateId: doc.id,
          payload: { sellerId: input.sellerId, documentId: doc.id, documentType: doc.documentType },
        },
      });
      await (prisma as any).auditLog.create({
        data: {
          actorId: actorUserId,
          action: 'SELLER_KYC_SUBMITTED',
          resource: 'SellerKycDocument',
          resourceId: doc.id,
          metadata: { sellerId: input.sellerId, documentType: doc.documentType, fileSize: doc.fileSize, contentSha256 },
        },
      });
      return doc;
    } catch (error) {
      await this.storage.deleteObject(objectKey).catch(() => undefined);
      throw error;
    }
  }

  /**
   * Reviews an uploaded KYC document (Admin Only).
   */
  public async reviewDocument(
    adminUserId: string,
    expectedVersion: number,
    input: VerifyKycDocumentInput
  ): Promise<SellerKycDocumentModel> {
    const isSuperAdmin = await this.roleAssignmentRepo.hasRole(adminUserId, SystemRoleCode.SUPER_ADMIN);
    const isAdmin = await this.roleAssignmentRepo.hasRole(adminUserId, SystemRoleCode.ADMIN);

    if (!isSuperAdmin && !isAdmin) {
      throw new AuthorizationError('Only administrators can review and verify KYC documents.');
    }

    const updated = await this.kycRepo.reviewDocument(input.documentId, expectedVersion, {
      status: input.status,
      rejectionReason: input.rejectionReason,
      verifiedBy: adminUserId,
    });

    await (prisma as any).auditLog.create({
      data: {
        actorId: adminUserId,
        action: input.status === KycDocumentStatus.VERIFIED ? 'SELLER_KYC_VERIFY' : 'SELLER_KYC_REJECT',
        resource: 'SellerKycDocument',
        resourceId: input.documentId,
        metadata: {
          status: input.status,
          rejectionReason: input.rejectionReason,
        },
      },
    });

    return updated;
  }

  /**
   * Generates a signed, short-lived secure view URL for a private KYC document.
   * Enforces strict authorization and writes access audits.
   */
  public async getSecureDocumentViewUrl(actorUserId: string, documentId: string): Promise<{ viewUrl: string; expiresAt: Date }> {
    const isSuperAdmin = await this.roleAssignmentRepo.hasRole(actorUserId, SystemRoleCode.SUPER_ADMIN);
    const isAdmin = await this.roleAssignmentRepo.hasRole(actorUserId, SystemRoleCode.ADMIN);
    let doc = await this.kycRepo.findById(documentId);

    if (!doc) {
      throw new NotFoundError(`Document with id '${documentId}' not found.`);
    }

    const seller = await this.sellerRepo.findById(doc.sellerId);
    if (!seller) {
      throw new NotFoundError(`Seller tenant for document not found.`);
    }

    // Re-read through the seller-scoped repository boundary for non-admin access.
    const isOwner = seller.ownerUserId === actorUserId;
    if (isOwner && !isSuperAdmin && !isAdmin) {
      const scopedDoc = await this.kycRepo.findById(documentId, seller.id);
      if (!scopedDoc) throw new NotFoundError(`Document with id '${documentId}' not found.`);
      doc = scopedDoc;
    }

    // Access authorization: only the seller owner or platform administrators may view KYC documents.
    if (!isOwner && !isSuperAdmin && !isAdmin) {
      throw new AuthorizationError('Access Denied: You are not authorized to inspect this sensitive KYC document.');
    }

    const signed = await this.storage.createReadUrl(doc.fileUrl, 15 * 60);

    // Audit document inspection (mandatory for regulatory compliance)
    await (prisma as any).auditLog.create({
      data: {
        actorId: actorUserId,
        action: 'SELLER_KYC_VIEW',
        resource: 'SellerKycDocument',
        resourceId: doc.id,
        metadata: {
          sellerId: doc.sellerId,
          documentType: doc.documentType,
          expiresAt: signed.expiresAt.toISOString(),
        },
      },
    });

    return { viewUrl: signed.url, expiresAt: signed.expiresAt };
  }
}
