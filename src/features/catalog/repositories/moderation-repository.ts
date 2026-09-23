import { createHash } from 'crypto';
import { prisma } from '@/shared/database/prisma';
import { NotFoundError } from '@/shared/errors/app-error';
import { ENTITY_PREFIXES, generatePrefixedId } from '@/shared/utils/id';

export function normalizeDuplicateText(value: string | null | undefined): string { return (value || '').toLocaleLowerCase('en-BD').normalize('NFKC').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim(); }
export function duplicateHash(value: string): string { return createHash('sha256').update(value).digest('hex'); }

export class CatalogModerationRepository {
  public async findProduct(productId: string): Promise<any | null> { return (prisma as any).product.findFirst({ where: { id: productId, deletedAt: null }, include: { brand: true, category: true, seller: true, variants: { where: { deletedAt: null }, include: { options: true } } } }); }
  public async listQueue(filters: { status?: string; severity?: string }): Promise<any[]> { return (prisma as any).catalogModerationReview.findMany({ where: { ...(filters.status ? { moderationStatus: filters.status } : {}), ...(filters.severity ? { severity: filters.severity } : {}) }, include: { product: { include: { brand: true, category: true, seller: true } } }, orderBy: { createdAt: 'asc' }, take: 100 }); }
  public async findReview(id: string): Promise<any | null> { return (prisma as any).catalogModerationReview.findUnique({ where: { id }, include: { product: true } }); }
  public async findFingerprint(productId: string): Promise<any | null> { return (prisma as any).productDuplicateFingerprint.findUnique({ where: { productId } }); }
  public async findCandidates(fingerprint: { normalizedTitleHash: string; brandCategoryKey: string; skuFingerprint?: string | null; barcodeFingerprint?: string | null }, productId: string): Promise<any[]> { return (prisma as any).productDuplicateFingerprint.findMany({ where: { productId: { not: productId }, OR: [{ skuFingerprint: fingerprint.skuFingerprint ?? undefined }, { barcodeFingerprint: fingerprint.barcodeFingerprint ?? undefined }, { normalizedTitleHash: fingerprint.normalizedTitleHash, brandCategoryKey: fingerprint.brandCategoryKey }] }, include: { product: { select: { id: true, title: true, slug: true, sellerId: true, brandId: true, categoryId: true, status: true } } }, take: 20 }); }
  public async saveAnalysis(productId: string, productVersion: number, fingerprint: any, duplicateStatus: string, matchedProductIds: string[], reason: string, severity: string): Promise<any> {
    return (prisma as any).$transaction(async (tx: any) => {
      const savedFingerprint = await tx.productDuplicateFingerprint.upsert({ where: { productId }, create: { id: generatePrefixedId(ENTITY_PREFIXES.DUPLICATE_FINGERPRINT), productId, ...fingerprint, algorithmVersion: 'v1', calculatedAt: new Date() }, update: { ...fingerprint, algorithmVersion: 'v1', calculatedAt: new Date() } });
      const review = await tx.catalogModerationReview.create({ data: { id: generatePrefixedId(ENTITY_PREFIXES.MODERATION_REVIEW), productId, productVersion, moderationStatus: 'PENDING', duplicateStatus, reason, severity, matchedProductIds, source: 'AUTOMATED' } });
      return { fingerprint: savedFingerprint, review };
    });
  }
  public async resolve(reviewId: string, actorId: string, status: string, reason?: string | null): Promise<any> { const review = await this.findReview(reviewId); if (!review) throw new NotFoundError(`Moderation review '${reviewId}' not found.`); return (prisma as any).catalogModerationReview.update({ where: { id: reviewId }, data: { moderationStatus: status, reason: reason ?? review.reason, decisionBy: actorId, resolvedAt: new Date() } }); }
}
