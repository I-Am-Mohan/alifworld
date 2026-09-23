import { AuthorizationError, NotFoundError, ValidationError } from '@/shared/errors/app-error';
import { prisma } from '@/shared/database/prisma';
import { UserRoleAssignmentRepository } from '@/features/identity/repositories/user-role-assignment-repository';
import { SystemRoleCode } from '@/features/identity/types';
import { S3PrivateObjectStorage } from '@/shared/storage/s3-object-storage';
import { ENTITY_PREFIXES, generatePrefixedId } from '@/shared/utils/id';
import { ProductMediaRepository } from '../repositories/product-media-repository';
import { ProductMediaUploadSchema, PRODUCT_MEDIA_LIMITS, validateProductMediaFile } from '../media';

export class ProductMediaService {
  constructor(private readonly repository: ProductMediaRepository = new ProductMediaRepository(), private readonly roles: UserRoleAssignmentRepository = new UserRoleAssignmentRepository(), private readonly storage: S3PrivateObjectStorage = new S3PrivateObjectStorage()) {}

  public async list(actorId: string, productId: string) { const product = await this.requireOwnedProduct(actorId, productId); return this.repository.findByProductId(product.id); }

  public async upload(actorId: string, productId: string, input: { mediaType: 'IMAGE' | 'VIDEO'; isPrimary: boolean; displayOrder: number; altText?: string | null; altTextBn?: string | null }, file: { bytes: Uint8Array; mimeType: string; fileSize: number }) {
    const product = await this.requireOwnedProduct(actorId, productId);
    validateProductMediaFile(input.mediaType, file.mimeType, file.fileSize);
    const existing = await this.repository.findByProductId(productId);
    if (existing.length >= PRODUCT_MEDIA_LIMITS.MAX_PER_PRODUCT) throw new ValidationError('Product media limit reached.');
    const id = generatePrefixedId(ENTITY_PREFIXES.MEDIA);
    const key = `catalog-media/${product.sellerId}/${productId}/${id}`;
    await this.storage.putObject({ key, body: file.bytes, contentType: file.mimeType, metadata: { productId, sellerId: product.sellerId, mediaType: input.mediaType } });
    const media = await this.repository.create(productId, { ...input, url: key, fileSize: file.fileSize, mimeType: file.mimeType });
    await (prisma as any).auditLog.create({ data: { actorId, action: 'PRODUCT_MEDIA_UPLOAD', resource: 'ProductMedia', resourceId: media.id, metadata: { productId, mediaType: input.mediaType, fileSize: file.fileSize } } });
    return media;
  }

  public async readUrl(actorId: string, mediaId: string) { const media = await this.repository.findById(mediaId); if (!media) throw new NotFoundError(`Product media '${mediaId}' not found.`); await this.requireOwnedProduct(actorId, media.productId); return this.storage.createReadUrl(media.url); }
  public async remove(actorId: string, mediaId: string) { const media = await this.repository.findById(mediaId); if (!media) throw new NotFoundError(`Product media '${mediaId}' not found.`); await this.requireOwnedProduct(actorId, media.productId); await this.repository.softDelete(mediaId, actorId); await (prisma as any).auditLog.create({ data: { actorId, action: 'PRODUCT_MEDIA_DELETE', resource: 'ProductMedia', resourceId: mediaId, metadata: { productId: media.productId } } }); return { deleted: true }; }

  private async requireOwnedProduct(actorId: string, productId: string): Promise<{ id: string; sellerId: string }> { const product = await (prisma as any).product.findFirst({ where: { id: productId, deletedAt: null }, select: { id: true, sellerId: true } }); if (!product) throw new NotFoundError(`Product '${productId}' not found.`); const seller = await (prisma as any).seller.findFirst({ where: { id: product.sellerId, deletedAt: null }, select: { ownerUserId: true } }); const admin = await this.roles.hasRole(actorId, SystemRoleCode.ADMIN) || await this.roles.hasRole(actorId, SystemRoleCode.SUPER_ADMIN); const staff = await this.roles.hasRole(actorId, SystemRoleCode.SELLER_STAFF, product.sellerId); if (!admin && !staff && seller?.ownerUserId !== actorId) throw new AuthorizationError('You are not authorized to manage this product media.'); return product; }
}
