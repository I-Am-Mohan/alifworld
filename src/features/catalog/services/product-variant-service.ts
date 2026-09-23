import { AuthorizationError, ConflictError, NotFoundError } from '@/shared/errors/app-error';
import { prisma } from '@/shared/database/prisma';
import { UserRoleAssignmentRepository } from '@/features/identity/repositories/user-role-assignment-repository';
import { SystemRoleCode } from '@/features/identity/types';
import { IdentifierPolicyService } from './identifier-policy-service';
import { ProductVariantRepository } from '../repositories/product-variant-repository';
import { CreateProductVariantInput } from '../validators';

export class ProductVariantService {
  constructor(
    private readonly repository: ProductVariantRepository = new ProductVariantRepository(),
    private readonly roles: UserRoleAssignmentRepository = new UserRoleAssignmentRepository(),
    private readonly identifiers: IdentifierPolicyService = new IdentifierPolicyService(),
  ) {}

  public async list(actorId: string, productId: string, sellerId?: string) {
    await this.assertProductAccess(actorId, productId, sellerId);
    return this.repository.findByProductId(productId, sellerId);
  }

  public async get(actorId: string, productId: string, variantId: string, sellerId?: string) {
    await this.assertProductAccess(actorId, productId, sellerId);
    const variant = await this.repository.findById(variantId, productId, sellerId);
    if (!variant) throw new NotFoundError(`Product variant '${variantId}' not found.`);
    return variant;
  }

  public async create(actorId: string, productId: string, input: CreateProductVariantInput, sellerId?: string) {
    await this.assertProductAccess(actorId, productId, sellerId);
    await this.identifiers.assertAvailable({ sku: input.sku, barcode: input.barcode || undefined });
    const existing = await this.repository.findBySku(input.sku);
    if (existing) throw new ConflictError(`Variant SKU '${input.sku}' is already in use.`);
    const variant = await this.repository.create(productId, input);
    await (prisma as any).auditLog.create({ data: { actorId, action: 'PRODUCT_VARIANT_CREATE', resource: 'ProductVariant', resourceId: variant.id, metadata: { productId, sku: variant.sku } } });
    return variant;
  }

  public async update(actorId: string, productId: string, variantId: string, expectedVersion: number, input: Partial<CreateProductVariantInput>, sellerId?: string) {
    await this.assertProductAccess(actorId, productId, sellerId);
    const current = await this.repository.findById(variantId, productId, sellerId);
    if (!current) throw new NotFoundError(`Product variant '${variantId}' not found.`);
    if (input.sku || input.barcode) await this.identifiers.assertAvailable({ sku: input.sku || undefined, barcode: input.barcode || undefined, excludeVariantId: variantId });
    const variant = await this.repository.update(variantId, expectedVersion, input, productId, sellerId);
    await (prisma as any).auditLog.create({ data: { actorId, action: 'PRODUCT_VARIANT_UPDATE', resource: 'ProductVariant', resourceId: variantId, metadata: { productId, version: variant.version } } });
    return variant;
  }

  public async remove(actorId: string, productId: string, variantId: string, expectedVersion: number, sellerId?: string) {
    await this.assertProductAccess(actorId, productId, sellerId);
    const current = await this.repository.findById(variantId, productId, sellerId);
    if (!current) throw new NotFoundError(`Product variant '${variantId}' not found.`);
    await this.repository.softDelete(variantId, expectedVersion, actorId, productId, sellerId);
    await (prisma as any).auditLog.create({ data: { actorId, action: 'PRODUCT_VARIANT_DELETE', resource: 'ProductVariant', resourceId: variantId, metadata: { productId, version: expectedVersion + 1 } } });
    return { deleted: true, variantId };
  }

  private async assertProductAccess(actorId: string, productId: string, sellerId?: string) {
    const product = await (prisma as any).product.findFirst({ where: { id: productId, deletedAt: null, ...(sellerId ? { sellerId } : {}) }, select: { id: true, sellerId: true } });
    if (!product) throw new NotFoundError(`Product '${productId}' not found.`);
    const seller = await (prisma as any).seller.findFirst({ where: { id: product.sellerId, deletedAt: null }, select: { ownerUserId: true } });
    const admin = await this.roles.hasRole(actorId, SystemRoleCode.ADMIN) || await this.roles.hasRole(actorId, SystemRoleCode.SUPER_ADMIN);
    const staff = await this.roles.hasRole(actorId, SystemRoleCode.SELLER_STAFF, product.sellerId);
    if (!admin && !staff && seller?.ownerUserId !== actorId) throw new AuthorizationError('You are not authorized to manage this product variant.');
    return product;
  }
}
