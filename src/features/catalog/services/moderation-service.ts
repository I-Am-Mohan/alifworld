import { AuthorizationError, NotFoundError, ValidationError } from '@/shared/errors/app-error';
import { UserRoleAssignmentRepository } from '@/features/identity/repositories/user-role-assignment-repository';
import { SystemRoleCode } from '@/features/identity/types';
import { prisma } from '@/shared/database/prisma';
import { CatalogModerationRepository, duplicateHash, normalizeDuplicateText } from '../repositories/moderation-repository';
import { ModerationResolveInput } from '../moderation';

export class CatalogModerationService {
  constructor(private readonly repository: CatalogModerationRepository = new CatalogModerationRepository(), private readonly roles: UserRoleAssignmentRepository = new UserRoleAssignmentRepository()) {}

  public async recheckProduct(actorId: string, productId: string, reason?: string | null) {
    await this.assertAdmin(actorId);
    const product = await this.repository.findProduct(productId);
    if (!product) throw new NotFoundError(`Product '${productId}' not found.`);
    const fingerprint = this.fingerprint(product);
    const candidates = await this.repository.findCandidates(fingerprint, productId);
    const matchedProductIds = candidates.map((candidate: any) => candidate.product.id);
    const exactIdentity = candidates.some((candidate: any) => candidate.skuFingerprint === fingerprint.skuFingerprint || candidate.barcodeFingerprint === fingerprint.barcodeFingerprint);
    const duplicateStatus = matchedProductIds.length ? 'CANDIDATE' : 'CLEAR';
    const severity = exactIdentity ? 'HIGH' : matchedProductIds.length ? 'MEDIUM' : 'LOW';
    return this.repository.saveAnalysis(productId, product.version, fingerprint, duplicateStatus, matchedProductIds, reason || (matchedProductIds.length ? 'Potential duplicate detected by deterministic fingerprint matching.' : 'No duplicate candidate detected.'), severity);
  }

  public async listQueue(actorId: string, filters: { status?: string; severity?: string }) { await this.assertAdmin(actorId); return this.repository.listQueue(filters); }
  public async getReview(actorId: string, id: string) { await this.assertAdmin(actorId); const review = await this.repository.findReview(id); if (!review) throw new NotFoundError(`Moderation review '${id}' not found.`); return review; }
  public async resolve(actorId: string, id: string, input: ModerationResolveInput) { await this.assertAdmin(actorId); if (input.status !== 'DISMISSED' && !input.reason?.trim()) throw new ValidationError('A resolution reason is required.'); const result = await this.repository.resolve(id, actorId, input.status, input.reason); await (prisma as any).auditLog.create({ data: { actorId, action: `CATALOG_MODERATION_${input.status}`, resource: 'CatalogModerationReview', resourceId: id, metadata: { reason: input.reason ?? null } } }); return result; }

  public fingerprint(product: any) {
    const normalizedTitle = normalizeDuplicateText(product.title);
    const brandCategoryKey = `${product.brandId || 'none'}:${product.categoryId}`;
    const variantSignature = (product.variants || []).map((variant: any) => `${variant.sku}:${(variant.options || []).map((option: any) => `${option.attributeId}=${option.valueId || option.textValue || ''}`).sort().join('|')}`).sort().join('||');
    return { normalizedTitleHash: duplicateHash(normalizedTitle), brandCategoryKey, skuFingerprint: product.sku ? duplicateHash(normalizeDuplicateText(product.sku)) : null, barcodeFingerprint: product.barcode ? duplicateHash(normalizeDuplicateText(product.barcode)) : null, variantSignature: variantSignature || null };
  }

  private async assertAdmin(actorId: string): Promise<void> { const [superAdmin, admin] = await Promise.all([this.roles.hasRole(actorId, SystemRoleCode.SUPER_ADMIN), this.roles.hasRole(actorId, SystemRoleCode.ADMIN)]); if (!superAdmin && !admin) throw new AuthorizationError('Only catalog administrators can manage moderation reviews.'); }
}
