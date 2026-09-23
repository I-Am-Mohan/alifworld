import { AuthorizationError, NotFoundError } from '@/shared/errors/app-error';
import { prisma } from '@/shared/database/prisma';
import { UserRoleAssignmentRepository } from '@/features/identity/repositories/user-role-assignment-repository';
import { SystemRoleCode } from '@/features/identity/types';
import { LocalizedCatalogRepository } from '../repositories/localized-catalog-repository';
import { LocalizedProductTranslationInput } from '../localization';

export class ProductContentService {
  constructor(private readonly repository: LocalizedCatalogRepository = new LocalizedCatalogRepository(), private readonly roles: UserRoleAssignmentRepository = new UserRoleAssignmentRepository()) {}

  public async get(productId: string, locale?: string) { return this.repository.findProductTranslation(productId, locale); }

  public async upsert(actorId: string, productId: string, input: LocalizedProductTranslationInput) {
    const product = await this.requireProduct(productId);
    await this.assertSellerScope(actorId, product.sellerId);
    const result = await this.repository.upsertProductTranslation(productId, input);
    await (prisma as any).auditLog.create({ data: { actorId, action: 'PRODUCT_TRANSLATION_UPSERT', resource: 'ProductTranslation', resourceId: result.id, metadata: { productId, locale: input.locale, version: result.version } } });
    return result;
  }

  private async requireProduct(productId: string) { const product = await (prisma as any).product.findFirst({ where: { id: productId, deletedAt: null }, select: { id: true, sellerId: true } }); if (!product) throw new NotFoundError(`Product '${productId}' not found.`); return product; }
  private async assertSellerScope(actorId: string, sellerId: string) { const seller = await (prisma as any).seller.findFirst({ where: { id: sellerId, deletedAt: null }, select: { ownerUserId: true } }); const admin = await this.roles.hasRole(actorId, SystemRoleCode.ADMIN) || await this.roles.hasRole(actorId, SystemRoleCode.SUPER_ADMIN); const staff = await this.roles.hasRole(actorId, SystemRoleCode.SELLER_STAFF, sellerId); if (!admin && !staff && seller?.ownerUserId !== actorId) throw new AuthorizationError('You are not authorized to manage this product content.'); }
}
