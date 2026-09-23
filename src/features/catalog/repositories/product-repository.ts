/**
 * AlifWorld Product Catalog Repository
 * 
 * Encapsulates database queries for products, tenant scoping (sellerId),
 * variants, media relations, OCC versioning, and slug history redirects.
 * 
 * Reference: docs/architecture/scope-boundaries-and-domain-map.md
 * Invariants: ADR-0001, ADR-0003, ADR-0005, ADR-0021, ADR-0022, ADR-0025
 */

import { prisma } from '@/shared/database/prisma';
import { generatePrefixedId, ENTITY_PREFIXES } from '@/shared/utils/id';
import { ConflictError, NotFoundError } from '@/shared/errors/app-error';
import { ProductModel, ProductStatus } from '../types';

export class ProductRepository {
  public async findById(id: string): Promise<ProductModel | null> {
    const product = await (prisma as any).product.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: true,
        brand: true,
        variants: {
          where: { deletedAt: null },
          orderBy: { displayOrder: 'asc' },
        },
        media: {
          where: { deletedAt: null },
          orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
        },
      },
    });

    return product ? this.mapToModel(product) : null;
  }

  /**
   * Looks up product by public slug.
   * If not found directly, inspects ProductSlugHistory to enable SEO redirects.
   */
  public async findBySlug(slug: string): Promise<{ product: ProductModel | null; redirectedFrom?: string }> {
    const directProduct = await (prisma as any).product.findFirst({
      where: { slug, deletedAt: null },
      include: {
        category: true,
        brand: true,
        variants: {
          where: { deletedAt: null },
          orderBy: { displayOrder: 'asc' },
        },
        media: {
          where: { deletedAt: null },
          orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
        },
      },
    });

    if (directProduct) {
      return { product: this.mapToModel(directProduct) };
    }

    // Check slug history for 301 SEO redirects
    const slugHistory = await (prisma as any).productSlugHistory.findUnique({
      where: { oldSlug: slug },
      include: {
        product: {
          include: {
            category: true,
            brand: true,
            variants: {
              where: { deletedAt: null },
              orderBy: { displayOrder: 'asc' },
            },
            media: {
              where: { deletedAt: null },
              orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
            },
          },
        },
      },
    });

    if (slugHistory && slugHistory.product && !slugHistory.product.deletedAt) {
      return {
        product: this.mapToModel(slugHistory.product),
        redirectedFrom: slug,
      };
    }

    return { product: null };
  }

  public async findMany(options: {
    sellerId?: string;
    categoryId?: string;
    brandId?: string;
    status?: ProductStatus;
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{ items: ProductModel[]; total: number }> {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(100, Math.max(1, options.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (options.sellerId) {
      where.sellerId = options.sellerId;
    }
    if (options.categoryId) {
      where.categoryId = options.categoryId;
    }
    if (options.brandId) {
      where.brandId = options.brandId;
    }
    if (options.status) {
      where.status = options.status;
    }
    if (options.search) {
      where.OR = [
        { title: { contains: options.search, mode: 'insensitive' } },
        { titleBn: { contains: options.search, mode: 'insensitive' } },
        { sku: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      (prisma as any).product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: true,
          brand: true,
          variants: {
            where: { deletedAt: null },
            orderBy: { displayOrder: 'asc' },
          },
          media: {
            where: { deletedAt: null },
            orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
          },
        },
      }),
      (prisma as any).product.count({ where }),
    ]);

    return {
      items: items.map((p: any) => this.mapToModel(p)),
      total,
    };
  }

  public async create(data: {
    sellerId: string;
    categoryId: string;
    brandId?: string | null;
    title: string;
    titleBn?: string | null;
    slug: string;
    description: string;
    descriptionBn?: string | null;
    status?: ProductStatus;
    basePricePoisha: bigint | number;
    compareAtPricePoisha?: bigint | number | null;
    currency: 'BDT';
    productPoint: number;
    sku?: string | null;
    barcode?: string | null;
    isPhysical?: boolean;
    weightGrams?: number | null;
    lengthMm?: number | null;
    widthMm?: number | null;
    heightMm?: number | null;
    shippingClass?: string | null;
    requiresShipping?: boolean;
    warranty?: string | null;
    tags?: string[];
    taxRatePercent?: number | null;
  }): Promise<ProductModel> {
    const id = generatePrefixedId(ENTITY_PREFIXES.PRODUCT);

    const product = await (prisma as any).product.create({
      data: {
        id,
        sellerId: data.sellerId,
        categoryId: data.categoryId,
        brandId: data.brandId,
        title: data.title,
        titleBn: data.titleBn,
        slug: data.slug,
        description: data.description,
        descriptionBn: data.descriptionBn,
        status: data.status ?? ProductStatus.DRAFT,
        basePricePoisha: BigInt(data.basePricePoisha),
        compareAtPricePoisha: data.compareAtPricePoisha ? BigInt(data.compareAtPricePoisha) : null,
        currency: data.currency ?? 'BDT',
        productPoint: data.productPoint ?? 0,
        sku: data.sku,
        barcode: data.barcode,
        isPhysical: data.isPhysical ?? true,
        weightGrams: data.weightGrams,
        lengthMm: data.lengthMm,
        widthMm: data.widthMm,
        heightMm: data.heightMm,
        shippingClass: data.shippingClass,
        requiresShipping: data.requiresShipping ?? true,
        warranty: data.warranty,
        tags: data.tags ?? [],
        taxRatePercent: data.taxRatePercent,
        version: 1,
      },
      include: {
        category: true,
        brand: true,
      },
    });

    return this.mapToModel(product);
  }

  public async update(
    id: string,
    expectedVersion: number,
    data: Partial<{
      categoryId: string;
      brandId: string | null;
      title: string;
      titleBn: string | null;
      slug: string;
      description: string;
      descriptionBn: string | null;
      status: ProductStatus;
      currency: string;
      basePricePoisha: bigint | number;
      compareAtPricePoisha: bigint | number | null;
      productPoint: number;
      sku: string | null;
      barcode: string | null;
      isPhysical: boolean;
      weightGrams: number | null;
      lengthMm: number | null;
      widthMm: number | null;
      heightMm: number | null;
      shippingClass: string | null;
      requiresShipping: boolean;
      warranty: string | null;
      tags: string[];
      taxRatePercent: number | null;
    }>
  ): Promise<ProductModel> {
    const existing = await (prisma as any).product.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundError(`Product with id '${id}' not found.`);
    }

    if (existing.version !== expectedVersion) {
      throw new ConflictError(
        `Optimistic concurrency conflict on Product '${id}'. Expected version ${expectedVersion}, found ${existing.version}.`,
        { productId: id, currentVersion: existing.version, expectedVersion }
      );
    }

    const updateData: any = {
      ...data,
      version: { increment: 1 },
    };

    if (data.basePricePoisha !== undefined) {
      updateData.basePricePoisha = BigInt(data.basePricePoisha);
    }
    if (data.compareAtPricePoisha !== undefined) {
      updateData.compareAtPricePoisha = data.compareAtPricePoisha ? BigInt(data.compareAtPricePoisha) : null;
    }

    const updated = await (prisma as any).product.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        brand: true,
        variants: {
          where: { deletedAt: null },
          orderBy: { displayOrder: 'asc' },
        },
        media: {
          where: { deletedAt: null },
          orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
        },
      },
    });

    return this.mapToModel(updated);
  }

  public async recordSlugHistory(productId: string, oldSlug: string): Promise<void> {
    await (prisma as any).productSlugHistory.upsert({
      where: { oldSlug },
      create: {
        id: `psh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        productId,
        oldSlug,
      },
      update: {
        productId,
      },
    });
  }

  public async softDelete(id: string, expectedVersion: number, deletedBy?: string): Promise<void> {
    const existing = await (prisma as any).product.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundError(`Product with id '${id}' not found.`);
    }

    if (existing.version !== expectedVersion) {
      throw new ConflictError(
        `Optimistic concurrency conflict on Product deletion for '${id}'. Expected version ${expectedVersion}, found ${existing.version}.`
      );
    }

    await (prisma as any).product.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy,
        version: { increment: 1 },
      },
    });
  }

  private mapToModel(raw: any): ProductModel {
    return {
      id: raw.id,
      sellerId: raw.sellerId,
      categoryId: raw.categoryId,
      brandId: raw.brandId,
      title: raw.title,
      titleBn: raw.titleBn,
      slug: raw.slug,
      description: raw.description,
      descriptionBn: raw.descriptionBn,
      status: raw.status as ProductStatus,
      basePricePoisha: Number(raw.basePricePoisha),
      compareAtPricePoisha: raw.compareAtPricePoisha ? Number(raw.compareAtPricePoisha) : null,
      currency: raw.currency,
      productPoint: raw.productPoint,
      sku: raw.sku,
      barcode: raw.barcode,
      isPhysical: raw.isPhysical,
      weightGrams: raw.weightGrams,
      lengthMm: raw.lengthMm,
      widthMm: raw.widthMm,
      heightMm: raw.heightMm,
      shippingClass: raw.shippingClass,
      requiresShipping: raw.requiresShipping,
      warranty: raw.warranty,
      tags: raw.tags ?? [],
      taxRatePercent: raw.taxRatePercent ? Number(raw.taxRatePercent) : null,
      version: raw.version,
      deletedAt: raw.deletedAt,
      deletedBy: raw.deletedBy,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      category: raw.category
        ? {
            id: raw.category.id,
            name: raw.category.name,
            nameBn: raw.category.nameBn,
            slug: raw.category.slug,
            description: raw.category.description,
            parentId: raw.category.parentId,
            imageUrl: raw.category.imageUrl,
            icon: raw.category.icon,
            displayOrder: raw.category.displayOrder,
            isActive: raw.category.isActive,
            taxRatePercent: Number(raw.category.taxRatePercent ?? 0),
            version: raw.category.version,
            createdAt: raw.category.createdAt,
            updatedAt: raw.category.updatedAt,
          }
        : undefined,
      brand: raw.brand
        ? {
            id: raw.brand.id,
            name: raw.brand.name,
            slug: raw.brand.slug,
            logoUrl: raw.brand.logoUrl,
            website: raw.brand.website,
            isVerified: raw.brand.isVerified,
            isActive: raw.brand.isActive,
            version: raw.brand.version,
            createdAt: raw.brand.createdAt,
            updatedAt: raw.brand.updatedAt,
          }
        : null,
      variants: raw.variants
        ? raw.variants.map((v: any) => ({
            id: v.id,
            productId: v.productId,
            sku: v.sku,
            title: v.title,
            pricePoisha: Number(v.pricePoisha),
            compareAtPricePoisha: v.compareAtPricePoisha ? Number(v.compareAtPricePoisha) : null,
            productPoint: v.productPoint,
            barcode: v.barcode,
            weightGrams: v.weightGrams,
            option1Name: v.option1Name,
            option1Value: v.option1Value,
            option2Name: v.option2Name,
            option2Value: v.option2Value,
            option3Name: v.option3Name,
            option3Value: v.option3Value,
            imageUrl: v.imageUrl,
            isActive: v.isActive,
            displayOrder: v.displayOrder,
            version: v.version,
            deletedAt: v.deletedAt,
            deletedBy: v.deletedBy,
            createdAt: v.createdAt,
            updatedAt: v.updatedAt,
          }))
        : undefined,
      media: raw.media
        ? raw.media.map((m: any) => ({
            id: m.id,
            productId: m.productId,
            mediaType: m.mediaType,
            url: m.url,
            altText: m.altText,
            altTextBn: m.altTextBn,
            isPrimary: m.isPrimary,
            displayOrder: m.displayOrder,
            fileSize: m.fileSize,
            mimeType: m.mimeType,
            width: m.width,
            height: m.height,
            deletedAt: m.deletedAt,
            deletedBy: m.deletedBy,
            createdAt: m.createdAt,
            updatedAt: m.updatedAt,
          }))
        : undefined,
    };
  }
}
