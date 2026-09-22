/**
 * AlifWorld Stock Balance Repository
 * 
 * Encapsulates inventory balances per warehouse/variant, atomic balance updates,
 * OCC version checks, and availability calculations.
 * 
 * Reference: docs/architecture/scope-boundaries-and-domain-map.md
 * Invariants: ADR-0003, ADR-0021, ADR-0022, ADR-0026
 */

import { prisma } from '@/shared/database/prisma';
import { generatePrefixedId, ENTITY_PREFIXES } from '@/shared/utils/id';
import { ConflictError, NotFoundError } from '@/shared/errors/app-error';
import { StockBalanceModel, calculateAvailableStock } from '../types';

export class StockBalanceRepository {
  public async findById(id: string): Promise<StockBalanceModel | null> {
    const record = await (prisma as any).stockBalance.findFirst({
      where: { id, deletedAt: null },
      include: {
        warehouse: true,
        variant: {
          include: {
            product: true,
          },
        },
      },
    });

    return record ? this.mapToModel(record) : null;
  }

  public async findByWarehouseAndVariant(warehouseId: string, variantId: string): Promise<StockBalanceModel | null> {
    const record = await (prisma as any).stockBalance.findFirst({
      where: { warehouseId, variantId, deletedAt: null },
      include: {
        warehouse: true,
        variant: {
          include: {
            product: true,
          },
        },
      },
    });

    return record ? this.mapToModel(record) : null;
  }

  public async findMany(options?: {
    warehouseId?: string;
    variantId?: string;
    sellerId?: string;
    lowStockOnly?: boolean;
  }): Promise<StockBalanceModel[]> {
    const where: any = { deletedAt: null };
    if (options?.warehouseId) {
      where.warehouseId = options.warehouseId;
    }
    if (options?.variantId) {
      where.variantId = options.variantId;
    }
    if (options?.sellerId) {
      where.variant = {
        product: {
          sellerId: options.sellerId,
        },
      };
    }

    const records = await (prisma as any).stockBalance.findMany({
      where,
      include: {
        warehouse: true,
        variant: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const mapped = records.map((r: any) => this.mapToModel(r));

    if (options?.lowStockOnly) {
      return mapped.filter((b: StockBalanceModel) => b.available <= b.lowStockThreshold);
    }

    return mapped;
  }

  public async getOrCreate(warehouseId: string, variantId: string): Promise<StockBalanceModel> {
    const existing = await this.findByWarehouseAndVariant(warehouseId, variantId);
    if (existing) {
      return existing;
    }

    const id = generatePrefixedId(ENTITY_PREFIXES.STOCK_BALANCE);

    const created = await (prisma as any).stockBalance.upsert({
      where: {
        warehouseId_variantId: {
          warehouseId,
          variantId,
        },
      },
      create: {
        id,
        warehouseId,
        variantId,
        onHand: 0,
        reserved: 0,
        damaged: 0,
        quarantined: 0,
        lowStockThreshold: 5,
        reorderPoint: 10,
        version: 1,
      },
      update: {},
      include: {
        warehouse: true,
        variant: {
          include: { product: true },
        },
      },
    });

    return this.mapToModel(created);
  }

  /**
   * Executes an atomic balance update with optimistic concurrency control.
   * Validates invariant: Available = OnHand - Reserved - Damaged - Quarantined >= 0
   */
  public async atomicUpdate(
    id: string,
    expectedVersion: number,
    deltas: {
      onHandDelta?: number;
      reservedDelta?: number;
      damagedDelta?: number;
      quarantinedDelta?: number;
    }
  ): Promise<StockBalanceModel> {
    const current = await (prisma as any).stockBalance.findFirst({
      where: { id, deletedAt: null },
    });

    if (!current) {
      throw new NotFoundError(`Stock balance with id '${id}' not found.`);
    }

    if (current.version !== expectedVersion) {
      throw new ConflictError(
        `Optimistic concurrency conflict on StockBalance '${id}'. Expected version ${expectedVersion}, found ${current.version}.`,
        { balanceId: id, currentVersion: current.version, expectedVersion }
      );
    }

    const newOnHand = current.onHand + (deltas.onHandDelta ?? 0);
    const newReserved = current.reserved + (deltas.reservedDelta ?? 0);
    const newDamaged = current.damaged + (deltas.damagedDelta ?? 0);
    const newQuarantined = current.quarantined + (deltas.quarantinedDelta ?? 0);

    // Invariant checks:
    if (newOnHand < 0) {
      throw new ConflictError(`Invalid inventory state: onHand cannot be negative (${newOnHand}).`);
    }
    if (newReserved < 0) {
      throw new ConflictError(`Invalid inventory state: reserved cannot be negative (${newReserved}).`);
    }

    const available = newOnHand - newReserved - newDamaged - newQuarantined;
    if (available < 0) {
      throw new ConflictError(
        `Insufficient available stock for update. OnHand: ${newOnHand}, Reserved: ${newReserved}, Required: ${Math.abs(available)} units shortfall.`,
        { onHand: newOnHand, reserved: newReserved, available }
      );
    }

    const updated = await (prisma as any).stockBalance.update({
      where: { id },
      data: {
        onHand: newOnHand,
        reserved: newReserved,
        damaged: newDamaged,
        quarantined: newQuarantined,
        version: { increment: 1 },
      },
      include: {
        warehouse: true,
        variant: {
          include: { product: true },
        },
      },
    });

    return this.mapToModel(updated);
  }

  private mapToModel(raw: any): StockBalanceModel {
    const available = calculateAvailableStock({
      onHand: raw.onHand,
      reserved: raw.reserved,
      damaged: raw.damaged,
      quarantined: raw.quarantined,
    });

    return {
      id: raw.id,
      warehouseId: raw.warehouseId,
      variantId: raw.variantId,
      onHand: raw.onHand,
      reserved: raw.reserved,
      damaged: raw.damaged,
      quarantined: raw.quarantined,
      available,
      lowStockThreshold: raw.lowStockThreshold,
      reorderPoint: raw.reorderPoint,
      version: raw.version,
      deletedAt: raw.deletedAt,
      deletedBy: raw.deletedBy,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      warehouse: raw.warehouse ? {
        id: raw.warehouse.id,
        sellerId: raw.warehouse.sellerId,
        name: raw.warehouse.name,
        code: raw.warehouse.code,
        division: raw.warehouse.division,
        district: raw.warehouse.district,
        upazila: raw.warehouse.upazila,
        addressLine: raw.warehouse.addressLine,
        postalCode: raw.warehouse.postalCode,
        isPlatformHub: raw.warehouse.isPlatformHub,
        isActive: raw.warehouse.isActive,
        version: raw.warehouse.version,
        createdAt: raw.warehouse.createdAt,
        updatedAt: raw.warehouse.updatedAt,
      } : undefined,
      variant: raw.variant ? {
        id: raw.variant.id,
        sku: raw.variant.sku,
        title: raw.variant.title,
        product: raw.variant.product ? {
          id: raw.variant.product.id,
          title: raw.variant.product.title,
          sellerId: raw.variant.product.sellerId,
        } : undefined,
      } : undefined,
    };
  }
}
