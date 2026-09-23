import { prisma } from '@/shared/database/prisma';
import { buildOwnerWhere, buildSellerWhere, formatPaginatedResult, parseOffsetPagination, PaginatedResponse } from '@/shared/database/base-repository';
import { ConflictError, NotFoundError } from '@/shared/errors/app-error';
import { generateId, ID_PREFIXES } from '@/shared/utils/id';
import type { SellerApplicationDraftInput, SellerApplicationStatus } from '../application';

export interface SellerApplicationRecord {
  id: string;
  applicantUserId: string;
  sellerId: string | null;
  status: SellerApplicationStatus | string;
  businessName: string;
  slug: string;
  tradeLicenseNumber: string | null;
  binNumber: string | null;
  tinNumber: string | null;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  reviewReason: string | null;
  version: number;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  reviews?: Array<{ id: string; fromStatus: string; toStatus: string; reason: string | null; reviewerId: string; createdAt: Date }>;
}

export class SellerApplicationRepository {
  private readonly db = prisma as any;

  async findCurrentByApplicantUserId(applicantUserId: string): Promise<SellerApplicationRecord | null> {
    return this.db.sellerApplication.findFirst({
      where: buildOwnerWhere(applicantUserId, { status: { not: 'WITHDRAWN' } }, 'applicantUserId'),
      include: { reviews: { orderBy: { createdAt: 'desc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByIdForApplicant(applicationId: string, applicantUserId: string): Promise<SellerApplicationRecord | null> {
    return this.db.sellerApplication.findFirst({
      where: buildOwnerWhere(applicantUserId, { id: applicationId }, 'applicantUserId'),
      include: { reviews: { orderBy: { createdAt: 'desc' } } },
    });
  }

  async findByIdForSeller(applicationId: string, sellerId: string): Promise<SellerApplicationRecord | null> {
    return this.db.sellerApplication.findFirst({
      where: buildSellerWhere(sellerId, { id: applicationId }),
      include: { reviews: { orderBy: { createdAt: 'desc' } } },
    });
  }

  async findById(applicationId: string): Promise<SellerApplicationRecord | null> {
    return this.db.sellerApplication.findFirst({
      where: { id: applicationId, deletedAt: null },
      include: { reviews: { orderBy: { createdAt: 'desc' } } },
    });
  }

  async create(applicantUserId: string, input: SellerApplicationDraftInput): Promise<SellerApplicationRecord> {
    const existing = await this.findCurrentByApplicantUserId(applicantUserId);
    if (existing && !['REJECTED', 'WITHDRAWN'].includes(existing.status)) {
      throw new ConflictError('An active seller application already exists.', { applicationId: existing.id });
    }

    const existingSlug = await this.db.sellerApplication.findFirst({ where: { slug: input.slug, deletedAt: null, status: { notIn: ['REJECTED', 'WITHDRAWN'] } } });
    if (existingSlug) throw new ConflictError('This store URL is already used by an active seller application.', { slug: input.slug });

    return this.db.sellerApplication.create({
      data: {
        id: generateId(ID_PREFIXES.SELLER_APPLICATION),
        applicantUserId,
        businessName: input.businessName,
        slug: input.slug,
        tradeLicenseNumber: input.tradeLicenseNumber || null,
        binNumber: input.binNumber || null,
        tinNumber: input.tinNumber || null,
        status: 'DRAFT',
        version: 1,
      },
      include: { reviews: true },
    });
  }

  async updateDraft(applicationId: string, applicantUserId: string, expectedVersion: number, input: SellerApplicationDraftInput): Promise<SellerApplicationRecord> {
    const existing = await this.findByIdForApplicant(applicationId, applicantUserId);
    if (!existing) throw new NotFoundError('Seller application not found.', { applicationId });
    if (!['DRAFT', 'CHANGES_REQUESTED'].includes(existing.status)) throw new ConflictError('Only draft or changes-requested applications can be edited.', { status: existing.status });
    if (existing.version !== expectedVersion) throw new ConflictError('Seller application was modified by another request.', { expectedVersion, actualVersion: existing.version });

    const slugConflict = await this.db.sellerApplication.findFirst({ where: { slug: input.slug, id: { not: applicationId }, deletedAt: null, status: { notIn: ['REJECTED', 'WITHDRAWN'] } } });
    if (slugConflict) throw new ConflictError('This store URL is already used by another active application.', { slug: input.slug });

    return this.db.sellerApplication.update({
      where: { id: applicationId },
      data: { ...input, tradeLicenseNumber: input.tradeLicenseNumber || null, binNumber: input.binNumber || null, tinNumber: input.tinNumber || null, version: existing.version + 1 },
      include: { reviews: { orderBy: { createdAt: 'desc' } } },
    });
  }

  async listForAdmin(options: { status?: string; search?: string; page?: number; limit?: number } = {}): Promise<PaginatedResponse<SellerApplicationRecord>> {
    const { skip, take, page, limit } = parseOffsetPagination({ page: options.page, limit: options.limit });
    const where: any = { deletedAt: null };
    if (options.status) where.status = options.status;
    if (options.search?.trim()) {
      const search = options.search.trim();
      where.OR = [
        { businessName: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { tradeLicenseNumber: { contains: search } },
      ];
    }
    const [items, total] = await Promise.all([
      this.db.sellerApplication.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: { reviews: { orderBy: { createdAt: 'desc' }, take: 1 } } }),
      this.db.sellerApplication.count({ where }),
    ]);
    return formatPaginatedResult(items, total, page, limit);
  }
}
