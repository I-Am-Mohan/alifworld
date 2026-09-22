/**
 * AlifWorld Product Media Repository
 * 
 * Manages gallery visual assets, permanent S3 keys, and primary image flags.
 * 
 * Reference: docs/architecture/scope-boundaries-and-domain-map.md
 * Invariants: ADR-0003, ADR-0021, ADR-0022, ADR-0025
 */

import { prisma } from '@/shared/database/prisma';
import { generatePrefixedId, ENTITY_PREFIXES } from '@/shared/utils/id';
import { NotFoundError } from '@/shared/errors/app-error';
import { ProductMediaModel, MediaType } from '../types';

export class ProductMediaRepository {
  public async findById(id: string): Promise<ProductMediaModel | null> {
    const media = await (prisma as any).productMedia.findFirst({
      where: { id, deletedAt: null },
    });
    return media ? this.mapToModel(media) : null;
  }

  public async findByProductId(productId: string): Promise<ProductMediaModel[]> {
    const list = await (prisma as any).productMedia.findMany({
      where: { productId, deletedAt: null },
      orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
    });
    return list.map((m: any) => this.mapToModel(m));
  }

  public async create(productId: string, data: {
    mediaType?: MediaType;
    url: string;
    altText?: string | null;
    altTextBn?: string | null;
    isPrimary?: boolean;
    displayOrder?: number;
    fileSize?: number | null;
    mimeType?: string | null;
    width?: number | null;
    height?: number | null;
  }): Promise<ProductMediaModel> {
    const id = generatePrefixedId(ENTITY_PREFIXES.MEDIA);

    // If marked as primary, unmark existing primary media for this product
    if (data.isPrimary) {
      await (prisma as any).productMedia.updateMany({
        where: { productId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const media = await (prisma as any).productMedia.create({
      data: {
        id,
        productId,
        mediaType: data.mediaType ?? MediaType.IMAGE,
        url: data.url,
        altText: data.altText,
        altTextBn: data.altTextBn,
        isPrimary: data.isPrimary ?? false,
        displayOrder: data.displayOrder ?? 0,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        width: data.width,
        height: data.height,
      },
    });

    return this.mapToModel(media);
  }

  public async setPrimary(id: string, productId: string): Promise<void> {
    await (prisma as any).productMedia.updateMany({
      where: { productId, isPrimary: true },
      data: { isPrimary: false },
    });

    await (prisma as any).productMedia.update({
      where: { id },
      data: { isPrimary: true },
    });
  }

  public async softDelete(id: string, deletedBy?: string): Promise<void> {
    const existing = await (prisma as any).productMedia.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundError(`ProductMedia with id '${id}' not found.`);
    }

    await (prisma as any).productMedia.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy,
      },
    });
  }

  private mapToModel(raw: any): ProductMediaModel {
    return {
      id: raw.id,
      productId: raw.productId,
      mediaType: raw.mediaType as MediaType,
      url: raw.url,
      altText: raw.altText,
      altTextBn: raw.altTextBn,
      isPrimary: raw.isPrimary,
      displayOrder: raw.displayOrder,
      fileSize: raw.fileSize,
      mimeType: raw.mimeType,
      width: raw.width,
      height: raw.height,
      deletedAt: raw.deletedAt,
      deletedBy: raw.deletedBy,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }
}
