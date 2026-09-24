import { prisma } from '@/shared/database/prisma';
import { generateId, ID_PREFIXES } from '@/shared/utils/id';
import { ConflictError, NotFoundError, ValidationError } from '@/shared/errors/app-error';
import { SellerApplicationRepository, SellerApplicationRecord } from '../repositories/seller-application-repository';
import { AUDIT_ACTIONS } from '@/shared/audit/audit.interface';
import type { SellerApplicationDraftInput, SellerApplicationReviewInput, SellerApplicationStatus, SellerApplicationUpdateInput } from '../application';
import { canTransitionSellerApplication } from '../application';

const REVIEWABLE_STATUSES = ['SUBMITTED', 'UNDER_REVIEW'] as const;

export class SellerApplicationService {
  constructor(private readonly repository: SellerApplicationRepository = new SellerApplicationRepository()) {}

  async getCurrentForApplicant(userId: string): Promise<SellerApplicationRecord | null> {
    return this.repository.findCurrentByApplicantUserId(userId);
  }

  async getForApplicant(applicationId: string, userId: string): Promise<SellerApplicationRecord | null> {
    return this.repository.findByIdForApplicant(applicationId, userId);
  }

  async createDraft(userId: string, input: SellerApplicationDraftInput): Promise<SellerApplicationRecord> {
    return this.repository.create(userId, input);
  }

  async updateDraft(userId: string, applicationId: string, input: SellerApplicationUpdateInput): Promise<SellerApplicationRecord> {
    const { version, ...draft } = input;
    return this.repository.updateDraft(applicationId, userId, version, draft);
  }

  async submit(userId: string, applicationId: string, expectedVersion: number): Promise<SellerApplicationRecord> {
    const application = await this.repository.findByIdForApplicant(applicationId, userId);
    if (!application) throw new NotFoundError('Seller application not found.', { applicationId });
    if (!['DRAFT', 'CHANGES_REQUESTED'].includes(application.status)) {
      throw new ConflictError('Only draft or changes-requested applications can be submitted.', { status: application.status });
    }
    if (application.version !== expectedVersion) {
      throw new ConflictError('Seller application was modified by another request.', { expectedVersion, actualVersion: application.version });
    }

    return prisma.$transaction(async (tx: any) => {
      const updated = await (tx as any).sellerApplication.updateMany({
        where: { id: applicationId, applicantUserId: userId, deletedAt: null, version: expectedVersion, status: { in: ['DRAFT', 'CHANGES_REQUESTED'] } },
        data: { status: 'SUBMITTED', submittedAt: new Date(), reviewedAt: null, reviewedBy: null, reviewReason: null, version: expectedVersion + 1 },
      });
      if (updated.count !== 1) throw new ConflictError('Seller application changed before submission.');
      await (tx as any).outboxEvent.create({
        data: { eventType: 'SELLER_APPLICATION_SUBMITTED', aggregateType: 'SellerApplication', aggregateId: applicationId, payload: { applicationId, applicantUserId: userId } },
      });
      await (tx as any).auditLog.create({
        data: { actorId: userId, action: 'SELLER_APPLICATION_SUBMITTED', resource: 'SellerApplication', resourceId: applicationId, metadata: { fromStatus: application.status, toStatus: 'SUBMITTED' } },
      });
      return (tx as any).sellerApplication.findUnique({ where: { id: applicationId }, include: { reviews: { orderBy: { createdAt: 'desc' } } } });
    });
  }

  async getForAdmin(applicationId: string): Promise<SellerApplicationRecord> {
    const application = await this.repository.findById(applicationId);
    if (!application) throw new NotFoundError('Seller application not found.', { applicationId });
    return application;
  }

  async listForAdmin(options: { status?: string; search?: string; page?: number; limit?: number } = {}) {
    return this.repository.listForAdmin(options);
  }

  async review(applicationId: string, reviewerId: string, input: SellerApplicationReviewInput, idempotencyKey?: string): Promise<SellerApplicationRecord> {
    const application = await this.repository.findById(applicationId);
    if (!application) throw new NotFoundError('Seller application not found.', { applicationId });
    if (idempotencyKey) {
      const prior = await (prisma as any).sellerApplicationReview.findUnique({ where: { idempotencyKey }, include: { application: { include: { reviews: { orderBy: { createdAt: 'desc' } } } } } });
      if (prior?.applicationId === applicationId && prior.reviewerId === reviewerId) return prior.application as SellerApplicationRecord;
    }
    if (!REVIEWABLE_STATUSES.includes(application.status as (typeof REVIEWABLE_STATUSES)[number])) {
      throw new ConflictError('This seller application is not available for review.', { status: application.status });
    }
    const nextStatus = input.decision as SellerApplicationStatus;
    if (!canTransitionSellerApplication(application.status as SellerApplicationStatus, nextStatus)) {
      throw new ConflictError('The requested seller application transition is not allowed.', { fromStatus: application.status, toStatus: nextStatus });
    }
    if (application.version !== input.version) {
      throw new ConflictError('Seller application was modified by another reviewer.', { expectedVersion: input.version, actualVersion: application.version });
    }
    if ((input.decision === 'CHANGES_REQUESTED' || input.decision === 'REJECTED') && (!input.reason || input.reason.trim().length < 5)) {
      throw new ValidationError('A reason is required for this review decision.');
    }

    return prisma.$transaction(async (tx: any) => {
      const now = new Date();
      let sellerId = application.sellerId;
      if (input.decision === 'APPROVED') {
        const existingSeller = await (tx as any).seller.findFirst({ where: { ownerUserId: application.applicantUserId, deletedAt: null } });
        if (existingSeller) throw new ConflictError('This applicant already owns a seller store.', { sellerId: existingSeller.id });
        const slugConflict = await (tx as any).seller.findFirst({ where: { slug: application.slug, deletedAt: null } });
        if (slugConflict) throw new ConflictError('The application store URL is already in use.', { slug: application.slug });

        sellerId = generateId(ID_PREFIXES.SELLER);
        await (tx as any).seller.create({
          data: {
            id: sellerId,
            ownerUserId: application.applicantUserId,
            businessName: application.businessName,
            slug: application.slug,
            tradeLicenseNumber: application.tradeLicenseNumber,
            binNumber: application.binNumber,
            tinNumber: application.tinNumber,
            status: 'VERIFIED',
            verifiedAt: now,
            verifiedBy: reviewerId,
            version: 1,
          },
        });
        await (tx as any).sellerStoreSettings.create({ data: { id: generateId(ID_PREFIXES.STORE_SETTINGS), sellerId, vacationMode: false, version: 1 } });
        await (tx as any).sellerStaff.create({ data: { id: generateId(ID_PREFIXES.STAFF), sellerId, userId: application.applicantUserId, roleCode: 'SELLER_OWNER', permissions: ['*'], version: 1 } });
        const ownerRole = await (tx as any).role.findUnique({ where: { code: 'SELLER_OWNER' } });
        if (ownerRole) {
          await (tx as any).userRoleAssignment.create({ data: { id: generateId(ID_PREFIXES.ROLE_ASSIGNMENT), userId: application.applicantUserId, roleId: ownerRole.id, sellerId, assignedBy: reviewerId, version: 1 } });
        }
      }

      const updated = await (tx as any).sellerApplication.updateMany({
        where: { id: applicationId, deletedAt: null, version: input.version, status: { in: [...REVIEWABLE_STATUSES] } },
        data: { status: input.decision, sellerId, reviewedAt: now, reviewedBy: reviewerId, reviewReason: input.reason?.trim() || null, version: input.version + 1 },
      });
      if (updated.count !== 1) throw new ConflictError('Seller application changed before review.');

      await (tx as any).sellerApplicationReview.create({ data: { id: generateId(ID_PREFIXES.SELLER_APPLICATION_REVIEW), applicationId, reviewerId, fromStatus: application.status, toStatus: input.decision, reason: input.reason?.trim() || null, idempotencyKey: idempotencyKey || null } });
      await (tx as any).outboxEvent.create({ data: { eventType: `SELLER_APPLICATION_${input.decision}`, aggregateType: 'SellerApplication', aggregateId: applicationId, payload: { applicationId, sellerId, reviewerId, decision: input.decision, idempotencyKey: idempotencyKey || null } } });
      if (sellerId && input.decision === 'APPROVED') {
        await (tx as any).outboxEvent.create({ data: { eventType: 'SELLER_REGISTERED', aggregateType: 'Seller', aggregateId: sellerId, payload: { sellerId, applicationId, ownerUserId: application.applicantUserId } } });
      }
      await (tx as any).auditLog.create({ data: { actorId: reviewerId, action: (AUDIT_ACTIONS as any)[`SELLER_APPLICATION_${input.decision}`] || `SELLER_APPLICATION_${input.decision}`, resource: 'SellerApplication', resourceId: applicationId, metadata: { sellerId, fromStatus: application.status, toStatus: input.decision, reason: input.reason || null, idempotencyKey: idempotencyKey || null } } });
      return (tx as any).sellerApplication.findUnique({ where: { id: applicationId }, include: { reviews: { orderBy: { createdAt: 'desc' } } } });
    });
  }
}
