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
      const snapshotProduct = await tx.product.findFirst({ where: { id: params.productId, deletedAt: null }, include: { variants: { where: { deletedAt: null }, orderBy: { displayOrder: 'asc' } }, media: { where: { deletedAt: null }, orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }] }, optionSets: { where: { deletedAt: null }, orderBy: { displayOrder: 'asc' } } } });
      const snapshot = {
        id: snapshotProduct.id, sellerId: snapshotProduct.sellerId, categoryId: snapshotProduct.categoryId, brandId: snapshotProduct.brandId,
        title: snapshotProduct.title, titleBn: snapshotProduct.titleBn, slug: snapshotProduct.slug, description: snapshotProduct.description, descriptionBn: snapshotProduct.descriptionBn,
        status: snapshotProduct.status, basePricePoisha: String(snapshotProduct.basePricePoisha), compareAtPricePoisha: snapshotProduct.compareAtPricePoisha == null ? null : String(snapshotProduct.compareAtPricePoisha),
        currency: snapshotProduct.currency, productPoint: snapshotProduct.productPoint, sku: snapshotProduct.sku, barcode: snapshotProduct.barcode,
        isPhysical: snapshotProduct.isPhysical, weightGrams: snapshotProduct.weightGrams, lengthMm: snapshotProduct.lengthMm, widthMm: snapshotProduct.widthMm, heightMm: snapshotProduct.heightMm,
        shippingClass: snapshotProduct.shippingClass, requiresShipping: snapshotProduct.requiresShipping, warranty: snapshotProduct.warranty, tags: snapshotProduct.tags,
        taxRatePercent: snapshotProduct.taxRatePercent == null ? null : String(snapshotProduct.taxRatePercent), version: snapshotProduct.version,
        variants: snapshotProduct.variants.map((variant: any) => ({ id: variant.id, sku: variant.sku, title: variant.title, pricePoisha: String(variant.pricePoisha), compareAtPricePoisha: variant.compareAtPricePoisha == null ? null : String(variant.compareAtPricePoisha), productPoint: variant.productPoint, barcode: variant.barcode, weightGrams: variant.weightGrams, option1Name: variant.option1Name, option1Value: variant.option1Value, option2Name: variant.option2Name, option2Value: variant.option2Value, option3Name: variant.option3Name, option3Value: variant.option3Value, isActive: variant.isActive, displayOrder: variant.displayOrder })),
        media: snapshotProduct.media.map((media: any) => ({ id: media.id, mediaType: media.mediaType, isPrimary: media.isPrimary, displayOrder: media.displayOrder, altText: media.altText, altTextBn: media.altTextBn, mimeType: media.mimeType, fileSize: media.fileSize })),
        optionSets: snapshotProduct.optionSets.map((optionSet: any) => ({ id: optionSet.id, attributeId: optionSet.attributeId, isRequired: optionSet.isRequired, isVariantDefining: optionSet.isVariantDefining, displayOrder: optionSet.displayOrder, valueIds: (optionSet.values ?? []).map((value: any) => value.valueId) })),
      };
      await tx.productVersionHistory.create({ data: { id: generatePrefixedId(ENTITY_PREFIXES.PRODUCT_VERSION), productId: params.productId, version: updated.version, action: `PRODUCT_${params.toStatus}`, snapshot, actorId: params.actorId, actorRole: null, requestId: request.id, ipAddress: null, userAgent: null } });
      await tx.productStatusHistory.create({ data: { id: generatePrefixedId(ENTITY_PREFIXES.PRODUCT_STATUS_HISTORY), productId: params.productId, fromStatus: params.fromStatus, toStatus: params.toStatus, reason: params.reason ?? null, actorId: params.actorId, requestId: request.id } });
      await tx.auditLog.create({ data: { actorId: params.actorId, action: `PRODUCT_${params.toStatus}`, resource: 'Product', resourceId: params.productId, metadata: { fromStatus: params.fromStatus, toStatus: params.toStatus, requestId: request.id, reason: params.reason ?? null } } });
      await tx.outboxEvent.create({ data: { id: generatePrefixedId(ENTITY_PREFIXES.OUTBOX), eventType: `PRODUCT_${params.toStatus}`, aggregateType: 'Product', aggregateId: params.productId, payload: { productId: params.productId, fromStatus: params.fromStatus, toStatus: params.toStatus, requestId: request.id, actorId: params.actorId } } });
      return { product: updated, request };
    });
  }
}
