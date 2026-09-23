import { prisma } from '@/shared/database/prisma';
import { ConflictError, NotFoundError } from '@/shared/errors/app-error';
import { generatePrefixedId, ENTITY_PREFIXES } from '@/shared/utils/id';
import { CollectionModel, CollectionProductModel, CollectionProductSummary } from '../collection-types';
import { CreateCollectionInput, UpdateCollectionInput } from '../collection';

export class CollectionRepository {
  public async findById(id: string, includeProducts = false): Promise<CollectionModel | null> {
    const collection = await (prisma as any).collection.findFirst({
      where: { id, deletedAt: null },
      include: includeProducts ? { products: { orderBy: { displayOrder: 'asc' } } } : undefined,
    });
    return collection ? this.mapToModel(collection) : null;
  }

  public async findBySlug(slug: string, includeProducts = false): Promise<CollectionModel | null> {
    const collection = await (prisma as any).collection.findFirst({
      where: { slug, deletedAt: null },
      include: includeProducts ? { products: { orderBy: { displayOrder: 'asc' } } } : undefined,
    });
    return collection ? this.mapToModel(collection) : null;
  }

  public async findAll(options: { status?: string; collectionType?: string; isActive?: boolean; includeProducts?: boolean } = {}): Promise<CollectionModel[]> {
    const where: any = { deletedAt: null };
    if (options.status) where.status = options.status;
    if (options.collectionType) where.collectionType = options.collectionType;
    if (options.isActive !== undefined) where.isActive = options.isActive;
    const collections = await (prisma as any).collection.findMany({
      where,
      include: options.includeProducts ? { products: { orderBy: { displayOrder: 'asc' } } } : undefined,
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });
    return collections.map((collection: any) => this.mapToModel(collection));
  }

  public async findVisibleProducts(collection: CollectionModel): Promise<CollectionProductSummary[]> {
    const productWhere: any = {
      deletedAt: null,
      status: 'PUBLISHED',
      seller: { status: 'ACTIVE', deletedAt: null },
      category: { isActive: true, deletedAt: null },
      OR: [{ brandId: null }, { brand: { isActive: true, deletedAt: null, approvalStatus: 'APPROVED' } }],
    };
    if (collection.collectionType === 'CURATED') {
      productWhere.id = { in: collection.productIds ?? [] };
    } else {
      const rule = collection.rule ?? {};
      if (rule.categoryId) productWhere.categoryId = rule.categoryId;
      if (rule.brandId) productWhere.brandId = rule.brandId;
      if (rule.sellerId) productWhere.sellerId = rule.sellerId;
      if (rule.minPricePoisha !== undefined || rule.maxPricePoisha !== undefined) {
        productWhere.basePricePoisha = {};
        if (rule.minPricePoisha !== undefined) productWhere.basePricePoisha.gte = BigInt(rule.minPricePoisha);
        if (rule.maxPricePoisha !== undefined) productWhere.basePricePoisha.lte = BigInt(rule.maxPricePoisha);
      }
      if (rule.tags?.length) productWhere.tags = { hasEvery: rule.tags };
    }
    const products = await (prisma as any).product.findMany({
      where: productWhere,
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, titleBn: true, slug: true, status: true, basePricePoisha: true, currency: true, productPoint: true, categoryId: true, brandId: true, tags: true },
    });
    return products.map((product: any) => ({ ...product, basePricePoisha: product.basePricePoisha.toString() }));
  }

  public async create(input: CreateCollectionInput): Promise<CollectionModel> {
    const collection = await (prisma as any).collection.create({
      data: {
        id: generatePrefixedId(ENTITY_PREFIXES.COLLECTION),
        name: input.name,
        slug: input.slug,
        description: input.description ?? null,
        collectionType: input.collectionType,
        rule: input.rule ?? null,
        displayOrder: input.displayOrder ?? 0,
        isActive: input.isActive ?? true,
        status: 'DRAFT',
        version: 1,
      },
    });
    return this.mapToModel(collection);
  }

  public async update(id: string, expectedVersion: number, input: Omit<UpdateCollectionInput, 'version'>): Promise<CollectionModel> {
    const existing = await (prisma as any).collection.findFirst({ where: { id, deletedAt: null } });
    this.assertVersion(existing, id, expectedVersion);
    const data = input;
    const updated = await (prisma as any).collection.update({ where: { id }, data: { ...data, version: { increment: 1 } } });
    return this.mapToModel(updated);
  }

  public async setStatus(id: string, expectedVersion: number, status: string): Promise<CollectionModel> {
    const existing = await (prisma as any).collection.findFirst({ where: { id, deletedAt: null } });
    this.assertVersion(existing, id, expectedVersion);
    const updated = await (prisma as any).collection.update({ where: { id }, data: { status, version: { increment: 1 } } });
    return this.mapToModel(updated);
  }

  public async replaceProducts(id: string, expectedVersion: number, productIds: string[]): Promise<CollectionModel> {
    const existing = await (prisma as any).collection.findFirst({ where: { id, deletedAt: null } });
    this.assertVersion(existing, id, expectedVersion);
    await (prisma as any).$transaction(async (tx: any) => {
      await tx.collectionProduct.deleteMany({ where: { collectionId: id } });
      if (productIds.length) {
        await tx.collectionProduct.createMany({ data: productIds.map((productId, index) => ({ id: generatePrefixedId(ENTITY_PREFIXES.COLLECTION), collectionId: id, productId, displayOrder: index })) });
      }
      await tx.collection.update({ where: { id }, data: { version: { increment: 1 } } });
    });
    return (await this.findById(id, true)) as CollectionModel;
  }

  public async softDelete(id: string, expectedVersion: number, deletedBy: string): Promise<void> {
    const existing = await (prisma as any).collection.findFirst({ where: { id, deletedAt: null } });
    this.assertVersion(existing, id, expectedVersion);
    await (prisma as any).collection.update({ where: { id }, data: { deletedAt: new Date(), deletedBy, status: 'ARCHIVED', version: { increment: 1 } } });
  }

  private assertVersion(existing: any, id: string, expectedVersion: number): void {
    if (!existing) throw new NotFoundError(`Collection with id '${id}' not found.`);
    if (existing.version !== expectedVersion) throw new ConflictError(`Optimistic concurrency conflict on Collection '${id}'. Expected version ${expectedVersion}, found ${existing.version}.`);
  }

  private mapToModel(raw: any): CollectionModel {
    return {
      id: raw.id, name: raw.name, slug: raw.slug, description: raw.description,
      collectionType: raw.collectionType, rule: raw.rule, status: raw.status,
      isActive: raw.isActive, displayOrder: raw.displayOrder, version: raw.version,
      deletedAt: raw.deletedAt, deletedBy: raw.deletedBy, createdAt: raw.createdAt, updatedAt: raw.updatedAt,
      products: raw.products?.map((product: any): CollectionProductModel => ({ id: product.id, collectionId: product.collectionId, productId: product.productId, displayOrder: product.displayOrder, createdAt: product.createdAt })),
      productIds: raw.products?.map((product: any) => product.productId),
    };
  }
}
