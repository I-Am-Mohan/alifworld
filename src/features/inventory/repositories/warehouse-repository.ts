/**
 * AlifWorld Warehouse Repository
 * 
 * Encapsulates database queries for fulfillment centers, regional depots,
 * and merchant warehouse facilities across Bangladesh.
 * 
 * Reference: docs/architecture/scope-boundaries-and-domain-map.md
 * Invariants: ADR-0003, ADR-0021, ADR-0022, ADR-0026
 */

import { prisma } from '@/shared/database/prisma';
import { generatePrefixedId, ENTITY_PREFIXES } from '@/shared/utils/id';
import { ConflictError, NotFoundError } from '@/shared/errors/app-error';
import { WarehouseModel } from '../types';

export class WarehouseRepository {
  public async findById(id: string): Promise<WarehouseModel | null> {
    const warehouse = await (prisma as any).warehouse.findFirst({
      where: { id, deletedAt: null },
    });
    return warehouse ? this.mapToModel(warehouse) : null;
  }

  public async findByCode(code: string): Promise<WarehouseModel | null> {
    const warehouse = await (prisma as any).warehouse.findFirst({
      where: { code, deletedAt: null },
    });
    return warehouse ? this.mapToModel(warehouse) : null;
  }

  public async findMany(options?: {
    sellerId?: string | null;
    division?: string;
    isPlatformHub?: boolean;
    isActive?: boolean;
  }): Promise<WarehouseModel[]> {
    const where: any = { deletedAt: null };
    if (options?.sellerId !== undefined) {
      where.sellerId = options.sellerId;
    }
    if (options?.division) {
      where.division = options.division;
    }
    if (options?.isPlatformHub !== undefined) {
      where.isPlatformHub = options.isPlatformHub;
    }
    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    const list = await (prisma as any).warehouse.findMany({
      where,
      orderBy: [{ isPlatformHub: 'desc' }, { name: 'asc' }],
    });

    return list.map((w: any) => this.mapToModel(w));
  }

  public async create(data: {
    sellerId?: string | null;
    name: string;
    code: string;
    division: string;
    district: string;
    upazila?: string | null;
    addressLine: string;
    postalCode?: string | null;
    isPlatformHub?: boolean;
    isActive?: boolean;
  }): Promise<WarehouseModel> {
    const id = generatePrefixedId(ENTITY_PREFIXES.WAREHOUSE);

    const warehouse = await (prisma as any).warehouse.create({
      data: {
        id,
        sellerId: data.sellerId,
        name: data.name,
        code: data.code,
        division: data.division,
        district: data.district,
        upazila: data.upazila,
        addressLine: data.addressLine,
        postalCode: data.postalCode,
        isPlatformHub: data.isPlatformHub ?? false,
        isActive: data.isActive ?? true,
        version: 1,
      },
    });

    return this.mapToModel(warehouse);
  }

  public async update(
    id: string,
    expectedVersion: number,
    data: Partial<{
      name: string;
      code: string;
      division: string;
      district: string;
      upazila: string | null;
      addressLine: string;
      postalCode: string | null;
      isActive: boolean;
    }>
  ): Promise<WarehouseModel> {
    const existing = await (prisma as any).warehouse.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundError(`Warehouse with id '${id}' not found.`);
    }

    if (existing.version !== expectedVersion) {
      throw new ConflictError(
        `Optimistic concurrency conflict on Warehouse '${id}'. Expected version ${expectedVersion}, found ${existing.version}.`
      );
    }

    const updated = await (prisma as any).warehouse.update({
      where: { id },
      data: {
        ...data,
        version: { increment: 1 },
      },
    });

    return this.mapToModel(updated);
  }

  public async softDelete(id: string, expectedVersion: number, deletedBy?: string): Promise<void> {
    const existing = await (prisma as any).warehouse.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundError(`Warehouse with id '${id}' not found.`);
    }

    if (existing.version !== expectedVersion) {
      throw new ConflictError(
        `Optimistic concurrency conflict on Warehouse deletion for '${id}'. Expected version ${expectedVersion}, found ${existing.version}.`
      );
    }

    await (prisma as any).warehouse.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy,
        version: { increment: 1 },
      },
    });
  }

  private mapToModel(raw: any): WarehouseModel {
    return {
      id: raw.id,
      sellerId: raw.sellerId,
      name: raw.name,
      code: raw.code,
      division: raw.division,
      district: raw.district,
      upazila: raw.upazila,
      addressLine: raw.addressLine,
      postalCode: raw.postalCode,
      isPlatformHub: raw.isPlatformHub,
      isActive: raw.isActive,
      version: raw.version,
      deletedAt: raw.deletedAt,
      deletedBy: raw.deletedBy,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }
}
