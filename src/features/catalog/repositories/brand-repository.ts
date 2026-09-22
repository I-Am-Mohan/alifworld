/**
 * AlifWorld Brand Registry Repository
 * 
 * Encapsulates database queries for approved brands, trademark verification,
 * and brand authority.
 * 
 * Reference: docs/architecture/scope-boundaries-and-domain-map.md
 * Invariants: ADR-0003, ADR-0021, ADR-0022, ADR-0025
 */

import { prisma } from '@/shared/database/prisma';
import { generatePrefixedId, ENTITY_PREFIXES } from '@/shared/utils/id';
import { ConflictError, NotFoundError } from '@/shared/errors/app-error';
import { BrandModel } from '../types';

export class BrandRepository {
  public async findById(id: string): Promise<BrandModel | null> {
    const brand = await (prisma as any).brand.findFirst({
      where: { id, deletedAt: null },
    });
    return brand ? this.mapToModel(brand) : null;
  }

  public async findBySlug(slug: string): Promise<BrandModel | null> {
    const brand = await (prisma as any).brand.findFirst({
      where: { slug, deletedAt: null },
    });
    return brand ? this.mapToModel(brand) : null;
  }

  public async findAll(options?: { isActive?: boolean; isVerified?: boolean }): Promise<BrandModel[]> {
    const where: any = { deletedAt: null };
    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }
    if (options?.isVerified !== undefined) {
      where.isVerified = options.isVerified;
    }

    const brands = await (prisma as any).brand.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return brands.map((b: any) => this.mapToModel(b));
  }

  public async create(data: {
    name: string;
    slug: string;
    logoUrl?: string | null;
    website?: string | null;
    isVerified?: boolean;
    isActive?: boolean;
  }): Promise<BrandModel> {
    const id = generatePrefixedId(ENTITY_PREFIXES.BRAND);

    const brand = await (prisma as any).brand.create({
      data: {
        id,
        name: data.name,
        slug: data.slug,
        logoUrl: data.logoUrl,
        website: data.website,
        isVerified: data.isVerified ?? true,
        isActive: data.isActive ?? true,
        version: 1,
      },
    });

    return this.mapToModel(brand);
  }

  public async update(
    id: string,
    expectedVersion: number,
    data: Partial<{
      name: string;
      slug: string;
      logoUrl?: string | null;
      website?: string | null;
      isVerified: boolean;
      isActive: boolean;
    }>
  ): Promise<BrandModel> {
    const existing = await (prisma as any).brand.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundError(`Brand with id '${id}' not found.`);
    }

    if (existing.version !== expectedVersion) {
      throw new ConflictError(
        `Optimistic concurrency conflict on Brand '${id}'. Expected version ${expectedVersion}, found ${existing.version}.`
      );
    }

    const updated = await (prisma as any).brand.update({
      where: { id },
      data: {
        ...data,
        version: { increment: 1 },
      },
    });

    return this.mapToModel(updated);
  }

  public async softDelete(id: string, expectedVersion: number, deletedBy?: string): Promise<void> {
    const existing = await (prisma as any).brand.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundError(`Brand with id '${id}' not found.`);
    }

    if (existing.version !== expectedVersion) {
      throw new ConflictError(
        `Optimistic concurrency conflict on Brand deletion for '${id}'. Expected version ${expectedVersion}, found ${existing.version}.`
      );
    }

    await (prisma as any).brand.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy,
        version: { increment: 1 },
      },
    });
  }

  private mapToModel(raw: any): BrandModel {
    return {
      id: raw.id,
      name: raw.name,
      slug: raw.slug,
      logoUrl: raw.logoUrl,
      website: raw.website,
      isVerified: raw.isVerified,
      isActive: raw.isActive,
      version: raw.version,
      deletedAt: raw.deletedAt,
      deletedBy: raw.deletedBy,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }
}
