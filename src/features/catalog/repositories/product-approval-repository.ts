import { prisma } from '@/shared/database/prisma';
import { ConflictError, NotFoundError } from '@/shared/errors/app-error';
import { ENTITY_PREFIXES, generatePrefixedId } from '@/shared/utils/id';

export class ProductApprovalRepository {
  public async findProduct(id: string): Promise<any | null> {
    return (prisma as any).product.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: { include: { attributeAssignments: { include: { attribute: true } } } },
        brand: true,      seller: true,
      attributeValues: true,        variants: { where: { deletedAt: null }, include: { options: true } },
        media: { where: { deletedAt: null } },
        optionSets: { include: { values: true } },
      },
    });
  }

  public async listPending(): Promise<any[]> {
    return (prisma as any).product.findMany({ where: { deletedAt: null, status: 'PENDING_APPROVAL' }, include: { category: true, brand: true, seller: true }, orderBy: { updatedAt: 'asc' } });
  }

  public async findHistory(productId: string): Promise<any[]> {
    return (prisma as any).productStatusHistory.findMany({ where: { productId }, orderBy: { createdAt: 'asc' } });
  }

  public async findIdempotentRequest(idempotencyKey: string): Promise<any | null> {
    return (prisma as any).productApprovalRequest.findUnique({ where: { idempotencyKey } });
  }

  public async transition(params: { productId: string; expectedVersion: number; fromStatus: string; toStatus: string; actorId: string; reason?: string | null; reviewNotes?: string | null; submittedVersion?: number; idempotencyKey?: string }): Promise<any> {
    return (prisma as any).$transaction(async (tx: any) => {
      const product = await tx.product.findFirst({ where: { id: params.productId, deletedAt: null } });
      if (!product) throw new NotFoundError(`Product '${params.productId}' not found.`);
      if (product.version !== params.expectedVersion || product.status !== params.fromStatus) throw new ConflictError(`Product '${params.productId}' changed before this workflow action could be applied.`);

      const request = await tx.productApprovalRequest.create({ data: { id: generatePrefixedId(ENTITY_PREFIXES.PRODUCT_APPROVAL), productId: params.productId, submittedVersion: params.submittedVersion ?? params.expectedVersion, submittedBy: params.actorId, status: params.toStatus === 'PENDING_APPROVAL' ? 'PENDING' : params.toStatus, decisionBy: params.toStatus === 'PENDING_APPROVAL' ? null : params.actorId, reason: params.reason ?? null, reviewNotes: params.reviewNotes ?? null, idempotencyKey: params.idempotencyKey ?? null, decidedAt: params.toStatus === 'PENDING_APPROVAL' ? null : new Date() } });
      const updated = await tx.product.update({ where: { id: params.productId }, data: { status: params.toStatus, version: { increment: 1 } } });
      await tx.productStatusHistory.create({ data: { id: generatePrefixedId(ENTITY_PREFIXES.PRODUCT_STATUS_HISTORY), productId: params.productId, fromStatus: params.fromStatus, toStatus: params.toStatus, reason: params.reason ?? null, actorId: params.actorId, requestId: request.id } });
      await tx.auditLog.create({ data: { actorId: params.actorId, action: `PRODUCT_${params.toStatus}`, resource: 'Product', resourceId: params.productId, metadata: { fromStatus: params.fromStatus, toStatus: params.toStatus, requestId: request.id, reason: params.reason ?? null } } });
      await tx.outboxEvent.create({ data: { id: generatePrefixedId(ENTITY_PREFIXES.OUTBOX), eventType: `PRODUCT_${params.toStatus}`, aggregateType: 'Product', aggregateId: params.productId, payload: { productId: params.productId, fromStatus: params.fromStatus, toStatus: params.toStatus, requestId: request.id, actorId: params.actorId } } });
      return { product: updated, request };
    });
  }
}
