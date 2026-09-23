/**
 * AlifWorld Seller KYC Document Repository
 * 
 * Manages regulatory verification documents for merchants with tenant scoping.
 * 
 * Reference: docs/architecture/postgresql-and-prisma-foundations.md
 * Invariant: ADR-0003, ADR-0006, ADR-0022, ADR-0024
 */

import { BaseRepository, assertSellerScope } from '@/shared/database/base-repository';
import { generateId, ID_PREFIXES } from '@/shared/utils/id';
import { nextVersion } from '@/shared/database/lifecycle';
import { NotFoundError } from '@/shared/errors/app-error';
import { SellerKycDocumentModel, KycDocumentType, KycDocumentStatus } from '../types';

export interface SubmitKycData {
  id?: string;
  sellerId: string;
  documentType: KycDocumentType | string;
  documentNumber?: string | null;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  contentSha256?: string | null;
  uploadedBy?: string | null;
}

export interface ReviewKycData {
  status: KycDocumentStatus | string;
  rejectionReason?: string | null;
  verifiedBy: string;
}

export class SellerKycDocumentRepository extends BaseRepository {
  /**
   * Finds an active KYC document by primary ID with optional sellerId tenant scoping.
   * Scopes query at the database level when sellerId is provided.
   */
  public async findById(id: string, sellerId?: string): Promise<SellerKycDocumentModel | null> {
    return this.executeSafe(async () => {
      const where = sellerId
        ? this.whereSellerScope(sellerId, { id })
        : this.whereNotDeleted({ id });
      const doc = await (this.db as any).sellerKycDocument.findFirst({
        where,
      });
      return doc as SellerKycDocumentModel | null;
    }, 'SellerKycDocumentRepository.findById');
  }

  /**
   * Submits a new or updated KYC document for a seller.
   */
  public async findByContentHash(sellerId: string, contentSha256: string): Promise<SellerKycDocumentModel | null> {
    return this.executeSafe(async () => {
      const doc = await (this.db as any).sellerKycDocument.findFirst({
        where: this.whereSellerScope(sellerId, { contentSha256 }),
        orderBy: { createdAt: 'desc' },
      });
      return doc as SellerKycDocumentModel | null;
    }, 'SellerKycDocumentRepository.findByContentHash');
  }

  /**
   * Submits a document metadata record whose fileUrl is an internal private object key.
   */
  public async submitDocument(data: SubmitKycData): Promise<SellerKycDocumentModel> {
    return this.executeSafe(async () => {
      const id = data.id || generateId(ID_PREFIXES.KYC_DOCUMENT);

      const created = await (this.db as any).sellerKycDocument.create({
        data: {
          id,
          sellerId: data.sellerId,
          documentType: data.documentType,
          documentNumber: data.documentNumber?.trim() || null,
          fileUrl: data.fileUrl.trim(),
          fileSize: data.fileSize,
          mimeType: data.mimeType,
          contentSha256: data.contentSha256 || null,
          uploadedBy: data.uploadedBy || null,
          status: KycDocumentStatus.PENDING,
          version: 1,
        },
      });

      return created as SellerKycDocumentModel;
    }, 'SellerKycDocumentRepository.submitDocument');
  }

  /**
   * Reviews a KYC document (Admin verification or rejection).
   */
  public async reviewDocument(
    id: string,
    expectedVersion: number,
    review: ReviewKycData
  ): Promise<SellerKycDocumentModel> {
    return this.executeSafe(async () => {
      const existing = await this.findById(id);
      if (!existing) {
        throw new NotFoundError(`KYC Document with id '${id}' not found`, { id });
      }

      this.assertVersion(existing.version, expectedVersion, id);

      const updated = await (this.db as any).sellerKycDocument.update({
        where: { id },
        data: {
          status: review.status,
          rejectionReason: review.rejectionReason || null,
          verifiedAt: review.status === KycDocumentStatus.VERIFIED ? new Date() : null,
          verifiedBy: review.verifiedBy,
          version: nextVersion(existing.version),
        },
      });

      return updated as SellerKycDocumentModel;
    }, 'SellerKycDocumentRepository.reviewDocument');
  }

  /**
   * Lists all active KYC documents for a specific seller.
   */
  public async listBySeller(sellerId: string): Promise<SellerKycDocumentModel[]> {
    return this.executeSafe(async () => {
      const docs = await (this.db as any).sellerKycDocument.findMany({
        where: this.whereNotDeleted({ sellerId }),
        orderBy: { createdAt: 'desc' },
      });
      return docs as SellerKycDocumentModel[];
    }, 'SellerKycDocumentRepository.listBySeller');
  }

  /**
   * Lists all pending KYC documents across the platform for Admin review.
   */
  public async listPendingForAdmin(): Promise<
    Array<
      SellerKycDocumentModel & {
        seller: { id: string; businessName: string; slug: string };
      }
    >
  > {
    return this.executeSafe(async () => {
      const docs = await (this.db as any).sellerKycDocument.findMany({
        where: this.whereNotDeleted({ status: KycDocumentStatus.PENDING }),
        include: {
          seller: {
            select: {
              id: true,
              businessName: true,
              slug: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });
      return docs as any;
    }, 'SellerKycDocumentRepository.listPendingForAdmin');
  }
}
