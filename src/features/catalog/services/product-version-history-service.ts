import { AuthorizationError, NotFoundError } from '@/shared/errors/app-error';
import { prisma } from '@/shared/database/prisma';
import { UserRoleAssignmentRepository } from '@/features/identity/repositories/user-role-assignment-repository';
import { SystemRoleCode } from '@/features/identity/types';
import { redactSensitiveData } from '@/shared/audit/redactor';
import { ProductVersionHistoryRepository } from '../repositories/product-version-history-repository';

export interface ProductVersionActor {
  userId: string;
  sellerId?: string | null;
  roles?: string[];
  requestId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface ProductVersionRecordContext {
  action: string;
  actorId?: string | null;
  actorRole?: string | null;
  requestId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export class ProductVersionHistoryService {
  constructor(
    private readonly repository: ProductVersionHistoryRepository = new ProductVersionHistoryRepository(),
    private readonly roles: UserRoleAssignmentRepository = new UserRoleAssignmentRepository(),
  ) {}

  public async list(actor: ProductVersionActor, productId: string): Promise<any[]> {
    const product = await this.requireVisibleProduct(actor, productId);
    return this.repository.list(product.id);
  }

  public async get(actor: ProductVersionActor, productId: string, version: number): Promise<any> {
    const product = await this.requireVisibleProduct(actor, productId);
    const history = await this.repository.find(product.id, version);
    if (!history) throw new NotFoundError(`Product version '${version}' not found.`);
    return history;
  }

  public async record(productId: string, context: ProductVersionRecordContext): Promise<any | null> {
    try {
      const product = await this.loadSnapshotProduct(productId);
      const snapshot = redactSensitiveData(this.toSnapshot(product));
      return await this.repository.record({
        productId: product.id,
        version: product.version,
        action: context.action,
        snapshot,
        actorId: context.actorId,
        actorRole: context.actorRole,
        requestId: context.requestId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });
    } catch (error) {
      // Version history is observability metadata; preserve the primary catalog mutation if its read-side projection is unavailable.
      console.error('Product version history recording failed', { productId, action: context.action, error });
      return null;
    }
  }

  private async requireVisibleProduct(actor: ProductVersionActor, productId: string): Promise<any> {
    const product = await this.repository.requireProduct(productId);
    const isAdmin = actor.roles?.includes(SystemRoleCode.ADMIN) || actor.roles?.includes(SystemRoleCode.SUPER_ADMIN)
      || await this.roles.hasRole(actor.userId, SystemRoleCode.ADMIN)
      || await this.roles.hasRole(actor.userId, SystemRoleCode.SUPER_ADMIN);
    if (isAdmin) return product;

    const seller = await (prisma as any).seller.findFirst({
      where: { id: product.sellerId, deletedAt: null },
      select: { ownerUserId: true },
    });
    const isOwner = seller?.ownerUserId === actor.userId;
    const isStaff = await this.roles.hasRole(actor.userId, SystemRoleCode.SELLER_STAFF, product.sellerId);
    if (!isOwner && !isStaff && actor.sellerId !== product.sellerId) {
      throw new AuthorizationError('You are not authorized to view this product version history.');
    }
    return product;
  }

  private async loadSnapshotProduct(productId: string): Promise<any> {
    const product = await (prisma as any).product.findFirst({
      where: { id: productId, deletedAt: null },
      include: {
        variants: { where: { deletedAt: null }, orderBy: { displayOrder: 'asc' } },
        media: { where: { deletedAt: null }, orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }] },
        optionSets: { where: { deletedAt: null }, orderBy: { displayOrder: 'asc' } },
      },
    });
    if (!product) throw new NotFoundError(`Product '${productId}' not found.`);
    return product;
  }

  private toSnapshot(product: any): Record<string, unknown> {
    return {
      id: product.id,
      sellerId: product.sellerId,
      categoryId: product.categoryId,
      brandId: product.brandId,
      title: product.title,
      titleBn: product.titleBn,
      slug: product.slug,
      description: product.description,
      descriptionBn: product.descriptionBn,
      status: product.status,
      basePricePoisha: String(product.basePricePoisha),
      compareAtPricePoisha: product.compareAtPricePoisha == null ? null : String(product.compareAtPricePoisha),
      currency: product.currency,
      productPoint: product.productPoint,
      sku: product.sku,
      barcode: product.barcode,
      isPhysical: product.isPhysical,
      weightGrams: product.weightGrams,
      lengthMm: product.lengthMm,
      widthMm: product.widthMm,
      heightMm: product.heightMm,
      shippingClass: product.shippingClass,
      requiresShipping: product.requiresShipping,
      warranty: product.warranty,
      tags: product.tags,
      taxRatePercent: product.taxRatePercent == null ? null : String(product.taxRatePercent),
      version: product.version,
      variants: (product.variants ?? []).map((variant: any) => ({
        id: variant.id,
        sku: variant.sku,
        title: variant.title,
        pricePoisha: String(variant.pricePoisha),
        compareAtPricePoisha: variant.compareAtPricePoisha == null ? null : String(variant.compareAtPricePoisha),
        productPoint: variant.productPoint,
        barcode: variant.barcode,
        weightGrams: variant.weightGrams,
        option1Name: variant.option1Name,
        option1Value: variant.option1Value,
        option2Name: variant.option2Name,
        option2Value: variant.option2Value,
        option3Name: variant.option3Name,
        option3Value: variant.option3Value,
        isActive: variant.isActive,
        displayOrder: variant.displayOrder,
      })),
      media: (product.media ?? []).map((media: any) => ({
        id: media.id,
        mediaType: media.mediaType,
        isPrimary: media.isPrimary,
        displayOrder: media.displayOrder,
        altText: media.altText,
        altTextBn: media.altTextBn,
        mimeType: media.mimeType,
        fileSize: media.fileSize,
      })),
      optionSets: (product.optionSets ?? []).map((optionSet: any) => ({
        id: optionSet.id,
        attributeId: optionSet.attributeId,
        isRequired: optionSet.isRequired,
        isVariantDefining: optionSet.isVariantDefining,
        displayOrder: optionSet.displayOrder,
        valueIds: (optionSet.values ?? []).map((value: any) => value.valueId),
      })),
    };
  }
}
