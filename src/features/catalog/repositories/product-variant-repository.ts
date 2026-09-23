/**
 * AlifWorld Product Variant Repository
 * 
 * Manages sellable SKU variations, variant pricing, options, and OCC.
 * 
 * Reference: docs/architecture/scope-boundaries-and-domain-map.md
 * Invariants: ADR-0001, ADR-0003, ADR-0005, ADR-0021, ADR-0022, ADR-0025
 */

import { prisma } from '@/shared/database/prisma';
import { generatePrefixedId, ENTITY_PREFIXES } from '@/shared/utils/id';
import { ConflictError, NotFoundError } from '@/shared/errors/app-error';
import { ProductVariantModel } from '../types';

export class ProductVariantRepository {
  public async findById(id: string, productId?: string, sellerId?: string): Promise<ProductVariantModel | null> {
    const variant = await (prisma as any).productVariant.findFirst({
      where: { id, deletedAt: null, ...(productId ? { productId } : {}), ...(sellerId ? { product: { sellerId } } : {}) },
      include: { options: { orderBy: { displayOrder: 'asc' } } },
    });
    return variant ? this.mapToModel(variant) : null;
  }

  public async findBySku(sku: string): Promise<ProductVariantModel | null> {
    const variant = await (prisma as any).productVariant.findFirst({
      where: { sku, deletedAt: null },
    });
    return variant ? this.mapToModel(variant) : null;
  }

  public async findByProductId(productId: string, sellerId?: string): Promise<ProductVariantModel[]> {
    const variants = await (prisma as any).productVariant.findMany({
      where: { productId, deletedAt: null, ...(sellerId ? { product: { sellerId } } : {}) },
      include: { options: { orderBy: { displayOrder: 'asc' } } },
      orderBy: { displayOrder: 'asc' },
    });
    return variants.map((v: any) => this.mapToModel(v));
  }

  public async create(productId: string, data: {
    sku: string;
    title: string;
    pricePoisha: bigint | number;
    compareAtPricePoisha?: bigint | number | null;
    productPoint: number;
    barcode?: string | null;
    weightGrams?: number | null;
    option1Name?: string | null;
    option1Value?: string | null;
    option2Name?: string | null;
    option2Value?: string | null;
    option3Name?: string | null;
    option3Value?: string | null;
    imageUrl?: string | null;
    isActive?: boolean;
    displayOrder?: number;
  }): Promise<ProductVariantModel> {
    const id = generatePrefixedId(ENTITY_PREFIXES.VARIANT);

    const variant = await (prisma as any).productVariant.create({
      data: {
        id,
        productId,
        sku: data.sku,
        title: data.title,
        pricePoisha: BigInt(data.pricePoisha),
        compareAtPricePoisha: data.compareAtPricePoisha ? BigInt(data.compareAtPricePoisha) : null,
        productPoint: data.productPoint,
        barcode: data.barcode,
        weightGrams: data.weightGrams,
        option1Name: data.option1Name,
        option1Value: data.option1Value,
        option2Name: data.option2Name,
        option2Value: data.option2Value,
        option3Name: data.option3Name,
        option3Value: data.option3Value,
        imageUrl: data.imageUrl,
        isActive: data.isActive ?? true,
        displayOrder: data.displayOrder ?? 0,
        version: 1,
      },
    });

    return this.mapToModel(variant);
  }

  public async update(
    id: string,
    expectedVersion: number,
    data: Partial<{
      sku: string;
      title: string;
      pricePoisha: bigint | number;
      compareAtPricePoisha: bigint | number | null;
      productPoint: number | null;
      barcode: string | null;
      weightGrams: number | null;
      option1Name: string | null;
      option1Value: string | null;
      option2Name: string | null;
      option2Value: string | null;
      option3Name: string | null;
      option3Value: string | null;
      imageUrl: string | null;
      isActive: boolean;
      displayOrder: number;
    }>
  , productId?: string, sellerId?: string): Promise<ProductVariantModel> {
    const existing = await (prisma as any).productVariant.findFirst({
      where: { id, deletedAt: null, ...(productId ? { productId } : {}), ...(sellerId ? { product: { sellerId } } : {}) },
    });

    if (!existing) {
      throw new NotFoundError(`ProductVariant with id '${id}' not found.`);
    }

    if (existing.version !== expectedVersion) {
      throw new ConflictError(
        `Optimistic concurrency conflict on ProductVariant '${id}'. Expected version ${expectedVersion}, found ${existing.version}.`
      );
    }

    const updateData: any = {
      ...data,
      version: { increment: 1 },
    };

    if (data.pricePoisha !== undefined) {
      updateData.pricePoisha = BigInt(data.pricePoisha);
    }
    if (data.compareAtPricePoisha !== undefined) {
      updateData.compareAtPricePoisha = data.compareAtPricePoisha ? BigInt(data.compareAtPricePoisha) : null;
    }

    const updated = await (prisma as any).productVariant.update({
      where: { id },
      data: updateData,
    });

    return this.mapToModel(updated);
  }

  public async softDelete(id: string, expectedVersion: number, deletedBy?: string, productId?: string, sellerId?: string): Promise<void> {
    const existing = await (prisma as any).productVariant.findFirst({
      where: { id, deletedAt: null, ...(productId ? { productId } : {}), ...(sellerId ? { product: { sellerId } } : {}) },
    });

    if (!existing) {
      throw new NotFoundError(`ProductVariant with id '${id}' not found.`);
    }

    if (existing.version !== expectedVersion) {
      throw new ConflictError(
        `Optimistic concurrency conflict on ProductVariant deletion for '${id}'. Expected version ${expectedVersion}, found ${existing.version}.`
      );
    }

    await (prisma as any).productVariant.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy,
        version: { increment: 1 },
      },
    });
  }

  private mapToModel(raw: any): ProductVariantModel {
    return {
      id: raw.id,
      productId: raw.productId,
      sku: raw.sku,
      title: raw.title,
      pricePoisha: Number(raw.pricePoisha),
      compareAtPricePoisha: raw.compareAtPricePoisha ? Number(raw.compareAtPricePoisha) : null,
      productPoint: raw.productPoint,
      barcode: raw.barcode,
      weightGrams: raw.weightGrams,
      option1Name: raw.option1Name,
      option1Value: raw.option1Value,
      option2Name: raw.option2Name,
      option2Value: raw.option2Value,
      option3Name: raw.option3Name,
      option3Value: raw.option3Value,
      imageUrl: raw.imageUrl,
      isActive: raw.isActive,
      displayOrder: raw.displayOrder,
      version: raw.version,
      options: raw.options?.map((option: any) => ({ id: option.id, variantId: option.variantId, attributeId: option.attributeId, valueId: option.valueId, textValue: option.textValue, displayOrder: option.displayOrder })),
      deletedAt: raw.deletedAt,
      deletedBy: raw.deletedBy,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }
}
