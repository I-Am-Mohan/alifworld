/**
 * AlifWorld Seller Repository
 * 
 * Manages Seller entities, slug lookups, status transitions,
 * and paginated merchant queries.
 * 
 * Reference: docs/architecture/postgresql-and-prisma-foundations.md
 * Invariant: ADR-0003, ADR-0021, ADR-0022, ADR-0024
 */

import { BaseRepository, parseOffsetPagination, formatPaginatedResult, PaginatedResponse } from '@/shared/database/base-repository';
import { generateId, ID_PREFIXES } from '@/shared/utils/id';
import { nextVersion } from '@/shared/database/lifecycle';
import { NotFoundError, ConflictError } from '@/shared/errors/app-error';
import { getServerEnv } from '@/shared/config/environment';
import { PublicSellerProfile, SellerModel, SellerProfile, SellerStatus, SellerFilterOptions } from '../types';

export interface CreateSellerData {
  id?: string;
  ownerUserId: string;
  businessName: string;
  slug: string;
  tradeLicenseNumber?: string | null;
  binNumber?: string | null;
  tinNumber?: string | null;
  status?: SellerStatus | string;
}

export interface UpdateSellerData {
  businessName?: string;
  tradeLicenseNumber?: string | null;
  binNumber?: string | null;
  tinNumber?: string | null;
  status?: SellerStatus | string;
  rejectionReason?: string | null;
  verifiedAt?: Date | null;
  verifiedBy?: string | null;
}

export class SellerRepository extends BaseRepository {
  /**
   * Finds an active seller by primary identifier (`sel_...`).
   */
  public async findById(id: string): Promise<SellerModel | null> {
    return this.executeSafe(async () => {
      const seller = await (this.db as any).seller.findFirst({
        where: this.whereNotDeleted({ id }),
      });
      return seller as SellerModel | null;
    }, 'SellerRepository.findById');
  }

  /**
   * Finds an active seller by unique store URL slug.
   */
  public async findBySlug(slug: string): Promise<SellerModel | null> {
    return this.executeSafe(async () => {
      const seller = await (this.db as any).seller.findFirst({
        where: this.whereNotDeleted({ slug: slug.toLowerCase() }),
      });
      return seller as SellerModel | null;
    }, 'SellerRepository.findBySlug');
  }

  public async findVerifiedPublicBySlug(slug: string): Promise<import('../types').PublicSellerProfile | null> {
    return this.executeSafe(async () => {
      const seller = await (this.db as any).seller.findFirst({
        where: this.whereNotDeleted({ slug: slug.trim().toLowerCase(), status: SellerStatus.VERIFIED }),
        select: {
          id: true,
          businessName: true,
          slug: true,
          status: true,
          verifiedAt: true,
          settings: {
            where: { deletedAt: null },
            select: { logoUrl: true, bannerUrl: true, logoObjectKey: true, bannerObjectKey: true, storeDescription: true, shippingPolicy: true, returnPolicy: true, cancellationPolicy: true, publicEmailEnabled: true, publicPhoneEnabled: true, publicPickupAddressEnabled: true, supportEmail: true, supportPhone: true, pickupAddress: true, vacationMode: true, vacationMessage: true },
          },
        },
      });
      if (!seller) return null;
      const publicBase = getServerEnv().S3_PUBLIC_BASE_URL.replace(/\/$/, '');
      const publicAssetUrl = (key?: string | null, fallback?: string | null) => key ? `${publicBase}/${key}` : fallback || null;
      const publicPickupAddress = seller.settings?.publicPickupAddressEnabled ? seller.settings?.pickupAddress ?? null : null;
      return {
        id: seller.id,
        businessName: seller.businessName,
        slug: seller.slug,
        status: seller.status,
        verifiedAt: seller.verifiedAt,
        logoUrl: publicAssetUrl(seller.settings?.logoObjectKey, seller.settings?.logoUrl),
        bannerUrl: publicAssetUrl(seller.settings?.bannerObjectKey, seller.settings?.bannerUrl),
        storeDescription: seller.settings?.storeDescription ?? null,
        shippingPolicy: seller.settings?.shippingPolicy ?? null,
        returnPolicy: seller.settings?.returnPolicy ?? null,
        cancellationPolicy: seller.settings?.cancellationPolicy ?? null,
        supportEmail: seller.settings?.publicEmailEnabled ? seller.settings?.supportEmail ?? null : null,
        supportPhone: seller.settings?.publicPhoneEnabled ? seller.settings?.supportPhone ?? null : null,
        pickupAddress: publicPickupAddress,
        vacationMode: seller.settings?.vacationMode ?? false,
        vacationMessage: seller.settings?.vacationMessage ?? null,
      };
    }, 'SellerRepository.findVerifiedPublicBySlug');
  }

  /**
   * Finds an active seller by its owner's user ID.
   */
  public async findByOwnerUserId(ownerUserId: string): Promise<SellerModel | null> {
    return this.executeSafe(async () => {
      const seller = await (this.db as any).seller.findFirst({
        where: this.whereNotDeleted({ ownerUserId }),
      });
      return seller as SellerModel | null;
    }, 'SellerRepository.findByOwnerUserId');
  }

  /**
   * Creates a new seller record with a standardized `sel_...` ID.
   */
  public async create(data: CreateSellerData): Promise<SellerModel> {
    return this.executeSafe(async () => {
      const id = data.id || generateId(ID_PREFIXES.SELLER);

      const created = await (this.db as any).seller.create({
        data: {
          id,
          ownerUserId: data.ownerUserId,
          businessName: data.businessName.trim(),
          slug: data.slug.toLowerCase().trim(),
          tradeLicenseNumber: data.tradeLicenseNumber?.trim() || null,
          binNumber: data.binNumber?.trim() || null,
          tinNumber: data.tinNumber?.trim() || null,
          status: data.status || SellerStatus.DRAFT,
          version: 1,
        },
      });

      return created as SellerModel;
    }, 'SellerRepository.create');
  }

  /**
   * Updates a seller record with optimistic concurrency validation.
   */
  public async update(id: string, expectedVersion: number, data: UpdateSellerData): Promise<SellerModel> {
    return this.executeSafe(async () => {
      const existing = await this.findById(id);
      if (!existing) {
        throw new NotFoundError(`Seller with id '${id}' not found`, { id });
      }

      this.assertVersion(existing.version, expectedVersion, id);

      const updated = await (this.db as any).seller.update({
        where: { id },
        data: {
          ...data,
          version: nextVersion(existing.version),
        },
      });

      return updated as SellerModel;
    }, 'SellerRepository.update');
  }

  /**
   * Soft-deletes a seller entity.
   */
  public async softDelete(id: string, expectedVersion: number, actorId?: string): Promise<SellerModel> {
    return this.executeSafe(async () => {
      this.assertCanDelete('Seller');

      const existing = await this.findById(id);
      if (!existing) {
        throw new NotFoundError(`Seller with id '${id}' not found`, { id });
      }

      this.assertVersion(existing.version, expectedVersion, id);

      const patch = this.createSoftDeletePatch(actorId);
      const updated = await (this.db as any).seller.update({
        where: { id },
        data: {
          ...patch,
          status: SellerStatus.SUSPENDED,
          version: nextVersion(existing.version),
        },
      });

      return updated as SellerModel;
    }, 'SellerRepository.softDelete');
  }

  /**
   * Retrieves full seller profile including KYC documents and store settings.
   */
  public async getSellerProfile(id: string): Promise<SellerProfile | null> {
    return this.executeSafe(async () => {
      const seller = await (this.db as any).seller.findFirst({
        where: this.whereNotDeleted({ id }),
        include: {
          settings: {
            where: { deletedAt: null },
          },
          kycDocuments: {
            where: { deletedAt: null },
          },
          _count: {
            select: { staff: { where: { deletedAt: null } } },
          },
        },
      });

      if (!seller) return null;

      return {
        ...seller,
        staffCount: seller._count?.staff || 0,
      } as SellerProfile;
    }, 'SellerRepository.getSellerProfile');
  }

  /**
   * Lists sellers with pagination, status filters, and search.
   */
  public async listPaginated(
    options: SellerFilterOptions & { page?: number; limit?: number } = {}
  ): Promise<PaginatedResponse<SellerModel>> {
    return this.executeSafe(async () => {
      const { skip, take, page, limit } = parseOffsetPagination({
        page: options.page,
        limit: options.limit,
      });

      const where: any = options.includeDeleted ? {} : { deletedAt: null };

      if (options.status) {
        where.status = options.status;
      }

      if (options.ownerUserId) {
        where.ownerUserId = options.ownerUserId;
      }

      if (options.search) {
        const query = options.search.trim();
        where.OR = [
          { businessName: { contains: query, mode: 'insensitive' } },
          { slug: { contains: query, mode: 'insensitive' } },
          { tradeLicenseNumber: { contains: query } },
          { binNumber: { contains: query } },
        ];
      }

      const [items, total] = await Promise.all([
        (this.db as any).seller.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: 'desc' },
        }),
        (this.db as any).seller.count({ where }),
      ]);

      return formatPaginatedResult(items as SellerModel[], total, page, limit);
    }, 'SellerRepository.listPaginated');
  }
}
