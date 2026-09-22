/**
 * AlifWorld Category Taxonomy Repository
 * 
 * Encapsulates database queries for hierarchical categories, parent/child
 * traversal, and NBR VAT rate mappings.
 * 
 * Reference: docs/architecture/scope-boundaries-and-domain-map.md
 * Invariants: ADR-0003, ADR-0021, ADR-0022, ADR-0025
 */

import { prisma } from '@/shared/database/prisma';
import { generatePrefixedId, ENTITY_PREFIXES } from '@/shared/utils/id';
import { ConflictError, NotFoundError } from '@/shared/errors/app-error';
import { CategoryModel } from '../types';

export class CategoryRepository {
  public async findById(id: string): Promise<CategoryModel | null> {
    const category = await (prisma as any).category.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        children: {
          where: { deletedAt: null },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    return category ? this.mapToModel(category) : null;
  }

  public async findBySlug(slug: string): Promise<CategoryModel | null> {
    const category = await (prisma as any).category.findFirst({
      where: {
        slug,
        deletedAt: null,
      },
      include: {
        children: {
          where: { deletedAt: null },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    return category ? this.mapToModel(category) : null;
  }

  public async findAll(options?: { isActive?: boolean; parentId?: string | null }): Promise<CategoryModel[]> {
    const where: any = { deletedAt: null };
    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }
    if (options?.parentId !== undefined) {
      where.parentId = options.parentId;
    }

    const categories = await (prisma as any).category.findMany({
      where,
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      include: {
        children: {
          where: { deletedAt: null },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    return categories.map((c: any) => this.mapToModel(c));
  }

  public async create(data: {
    name: string;
    nameBn?: string | null;
    slug: string;
    description?: string | null;
    parentId?: string | null;
    imageUrl?: string | null;
    icon?: string | null;
    displayOrder?: number;
    isActive?: boolean;
    taxRatePercent?: number;
  }): Promise<CategoryModel> {
    const id = generatePrefixedId(ENTITY_PREFIXES.CATEGORY);

    const category = await (prisma as any).category.create({
      data: {
        id,
        name: data.name,
        nameBn: data.nameBn,
        slug: data.slug,
        description: data.description,
        parentId: data.parentId,
        imageUrl: data.imageUrl,
        icon: data.icon,
        displayOrder: data.displayOrder ?? 0,
        isActive: data.isActive ?? true,
        taxRatePercent: data.taxRatePercent ?? 0.0,
        version: 1,
      },
    });

    return this.mapToModel(category);
  }

  public async update(
    id: string,
    expectedVersion: number,
    data: Partial<{
      name: string;
      nameBn?: string | null;
      slug: string;
      description?: string | null;
      parentId?: string | null;
      imageUrl?: string | null;
      icon?: string | null;
      displayOrder: number;
      isActive: boolean;
      taxRatePercent: number;
    }>
  ): Promise<CategoryModel> {
    const existing = await (prisma as any).category.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundError(`Category with id '${id}' not found.`);
    }

    if (existing.version !== expectedVersion) {
      throw new ConflictError(
        `Optimistic concurrency conflict on Category '${id}'. Expected version ${expectedVersion}, but found ${existing.version}.`,
        { categoryId: id, currentVersion: existing.version, expectedVersion }
      );
    }

    const updated = await (prisma as any).category.update({
      where: { id },
      data: {
        ...data,
        version: { increment: 1 },
      },
    });

    return this.mapToModel(updated);
  }

  public async softDelete(id: string, expectedVersion: number, deletedBy?: string): Promise<void> {
    const existing = await (prisma as any).category.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundError(`Category with id '${id}' not found.`);
    }

    if (existing.version !== expectedVersion) {
      throw new ConflictError(
        `Optimistic concurrency conflict on Category deletion for '${id}'. Expected version ${expectedVersion}, found ${existing.version}.`
      );
    }

    await (prisma as any).category.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy,
        version: { increment: 1 },
      },
    });
  }

  private mapToModel(raw: any): CategoryModel {
    return {
      id: raw.id,
      name: raw.name,
      nameBn: raw.nameBn,
      slug: raw.slug,
      description: raw.description,
      parentId: raw.parentId,
      imageUrl: raw.imageUrl,
      icon: raw.icon,
      displayOrder: raw.displayOrder,
      isActive: raw.isActive,
      taxRatePercent: Number(raw.taxRatePercent ?? 0),
      version: raw.version,
      deletedAt: raw.deletedAt,
      deletedBy: raw.deletedBy,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      children: raw.children ? raw.children.map((c: any) => this.mapToModel(c)) : undefined,
    };
  }
}
