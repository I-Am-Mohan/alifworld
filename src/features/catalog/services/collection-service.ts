import { CollectionRepository } from '../repositories/collection-repository';
import { CollectionModel, CollectionStatus } from '../collection-types';
import { CreateCollectionInput, UpdateCollectionInput } from '../collection';
import { UserRoleAssignmentRepository } from '@/features/identity/repositories/user-role-assignment-repository';
import { SystemRoleCode } from '@/features/identity/types';
import { AuthorizationError, ConflictError, NotFoundError, ValidationError } from '@/shared/errors/app-error';
import { prisma } from '@/shared/database/prisma';

export class CollectionService {
  constructor(
    private readonly collectionRepo: CollectionRepository = new CollectionRepository(),
    private readonly roleAssignmentRepo: UserRoleAssignmentRepository = new UserRoleAssignmentRepository(),
  ) {}

  public async createCollection(adminUserId: string, input: CreateCollectionInput): Promise<CollectionModel> {
    await this.assertAdminAccess(adminUserId);
    if (await this.collectionRepo.findBySlug(input.slug)) throw new ConflictError(`Collection slug '${input.slug}' is already registered.`);
    const collection = await this.collectionRepo.create(input);
    await this.audit(adminUserId, 'COLLECTION_CREATE', collection.id, { collectionType: collection.collectionType, slug: collection.slug });
    return collection;
  }

  public async updateCollection(adminUserId: string, id: string, expectedVersion: number, input: Omit<UpdateCollectionInput, 'version'>): Promise<CollectionModel> {
    await this.assertAdminAccess(adminUserId);
    const existing = await this.collectionRepo.findById(id);
    if (!existing) throw new NotFoundError(`Collection with id '${id}' not found.`);
    if (input.slug && input.slug !== existing.slug) {
      const conflict = await this.collectionRepo.findBySlug(input.slug);
      if (conflict && conflict.id !== id) throw new ConflictError(`Collection slug '${input.slug}' is already registered.`);
    }
    if (input.collectionType && input.collectionType !== existing.collectionType) throw new ValidationError('Collection type cannot be changed after creation.');
    const updated = await this.collectionRepo.update(id, expectedVersion, input);
    await this.audit(adminUserId, 'COLLECTION_UPDATE', id, { version: updated.version });
    return updated;
  }

  public async replaceProducts(adminUserId: string, id: string, expectedVersion: number, productIds: string[]): Promise<CollectionModel> {
    await this.assertAdminAccess(adminUserId);
    const collection = await this.collectionRepo.findById(id);
    if (!collection) throw new NotFoundError(`Collection with id '${id}' not found.`);
    if (collection.collectionType !== 'CURATED') throw new ValidationError('Only curated collections can have explicit product memberships.');
    if (new Set(productIds).size !== productIds.length) throw new ValidationError('Collection product IDs must be unique.');
    const existingProducts = await (prisma as any).product.findMany({ where: { id: { in: productIds }, deletedAt: null }, select: { id: true } });
    if (existingProducts.length !== productIds.length) throw new ValidationError('All collection products must exist and be active.');
    const updated = await this.collectionRepo.replaceProducts(id, expectedVersion, productIds);
    await this.audit(adminUserId, 'COLLECTION_PRODUCTS_REPLACE', id, { productCount: productIds.length, version: updated.version });
    return updated;
  }

  public async publishCollection(adminUserId: string, id: string, expectedVersion: number): Promise<CollectionModel> {
    await this.assertAdminAccess(adminUserId);
    const collection = await this.collectionRepo.findById(id, true);
    if (!collection) throw new NotFoundError(`Collection with id '${id}' not found.`);
    if (collection.status !== 'DRAFT') throw new ConflictError('Only draft collections can be published.');
    if (collection.collectionType === 'CURATED' && !(collection.productIds?.length)) throw new ValidationError('Curated collections require at least one product before publishing.');
    const updated = await this.collectionRepo.setStatus(id, expectedVersion, CollectionStatus.PUBLISHED);
    await this.audit(adminUserId, 'COLLECTION_PUBLISH', id, { status: updated.status, version: updated.version });
    return updated;
  }

  public async archiveCollection(adminUserId: string, id: string, expectedVersion: number): Promise<CollectionModel> {
    await this.assertAdminAccess(adminUserId);
    const collection = await this.collectionRepo.findById(id);
    if (!collection) throw new NotFoundError(`Collection with id '${id}' not found.`);
    if (collection.status === 'ARCHIVED') throw new ConflictError('Collection is already archived.');
    const updated = await this.collectionRepo.setStatus(id, expectedVersion, CollectionStatus.ARCHIVED);
    await this.audit(adminUserId, 'COLLECTION_ARCHIVE', id, { status: updated.status, version: updated.version });
    return updated;
  }

  public async getPublished(): Promise<CollectionModel[]> {
    const collections = await this.collectionRepo.findAll({ status: 'PUBLISHED', isActive: true, includeProducts: true });
    return Promise.all(collections.map(async (collection) => ({ ...collection, visibleProducts: await this.collectionRepo.findVisibleProducts(collection) })));
  }
  public async getPublishedBySlug(slug: string): Promise<CollectionModel | null> {
    const collection = await this.collectionRepo.findBySlug(slug, true);
    if (!collection || collection.status !== 'PUBLISHED' || !collection.isActive) return null;
    return { ...collection, visibleProducts: await this.collectionRepo.findVisibleProducts(collection) };
  }
  public async getAdminAll(): Promise<CollectionModel[]> { return this.collectionRepo.findAll({ includeProducts: true }); }

  private async assertAdminAccess(userId: string): Promise<void> {
    const isSuperAdmin = await this.roleAssignmentRepo.hasRole(userId, SystemRoleCode.SUPER_ADMIN);
    const isAdmin = await this.roleAssignmentRepo.hasRole(userId, SystemRoleCode.ADMIN);
    if (!isSuperAdmin && !isAdmin) throw new AuthorizationError('Only system administrators can manage collections.');
  }

  private async audit(actorId: string, action: string, resourceId: string, metadata: Record<string, unknown>): Promise<void> {
    await (prisma as any).auditLog.create({ data: { actorId, action, resource: 'Collection', resourceId, metadata } });
  }
}
