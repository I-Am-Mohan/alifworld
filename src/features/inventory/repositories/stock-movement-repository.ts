/**
 * AlifWorld Stock Movement Repository
 * 
 * Manages the append-only, immutable inventory movement ledger.
 * Every balance change, checkout reservation, order commitment, return, or audit
 * adjustment records an audit trail entry. Entries are never updated or deleted.
 * 
 * Reference: docs/architecture/scope-boundaries-and-domain-map.md
 * Invariants: ADR-0003, ADR-0021, ADR-0022, ADR-0026
 */

import { prisma } from '@/shared/database/prisma';
import { generatePrefixedId, ENTITY_PREFIXES } from '@/shared/utils/id';
import { StockMovementModel, MovementType, SourceType } from '../types';

export interface CreateMovementInput {
  stockBalanceId: string;
  warehouseId: string;
  variantId: string;
  movementType: MovementType;
  quantityDelta: number;
  onHandAfter: number;
  reservedAfter: number;
  availableAfter: number;
  sourceType: SourceType;
  sourceId: string;
  actorId?: string | null;
  reason?: string | null;
}

export class StockMovementRepository {
  /**
   * Appends an immutable stock movement record to the ledger.
   */
  public async record(input: CreateMovementInput): Promise<StockMovementModel> {
    const id = generatePrefixedId(ENTITY_PREFIXES.STOCK_MOVEMENT);

    const record = await (prisma as any).stockMovementLedger.create({
      data: {
        id,
        stockBalanceId: input.stockBalanceId,
        warehouseId: input.warehouseId,
        variantId: input.variantId,
        movementType: input.movementType,
        quantityDelta: input.quantityDelta,
        onHandAfter: input.onHandAfter,
        reservedAfter: input.reservedAfter,
        availableAfter: input.availableAfter,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        actorId: input.actorId ?? null,
        reason: input.reason ?? null,
      },
    });

    return this.mapToModel(record);
  }

  public async findById(id: string): Promise<StockMovementModel | null> {
    const record = await (prisma as any).stockMovementLedger.findUnique({
      where: { id },
    });

    return record ? this.mapToModel(record) : null;
  }

  public async findByStockBalance(stockBalanceId: string, limit = 50): Promise<StockMovementModel[]> {
    const records = await (prisma as any).stockMovementLedger.findMany({
      where: { stockBalanceId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return records.map((r: any) => this.mapToModel(r));
  }

  public async findByWarehouse(warehouseId: string, limit = 50): Promise<StockMovementModel[]> {
    const records = await (prisma as any).stockMovementLedger.findMany({
      where: { warehouseId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return records.map((r: any) => this.mapToModel(r));
  }

  public async findByVariant(variantId: string, limit = 50): Promise<StockMovementModel[]> {
    const records = await (prisma as any).stockMovementLedger.findMany({
      where: { variantId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return records.map((r: any) => this.mapToModel(r));
  }

  public async list(options?: {
    warehouseId?: string;
    variantId?: string;
    movementType?: MovementType;
    sourceType?: SourceType;
    sourceId?: string;
    limit?: number;
  }): Promise<StockMovementModel[]> {
    const where: any = {};
    if (options?.warehouseId) where.warehouseId = options.warehouseId;
    if (options?.variantId) where.variantId = options.variantId;
    if (options?.movementType) where.movementType = options.movementType;
    if (options?.sourceType) where.sourceType = options.sourceType;
    if (options?.sourceId) where.sourceId = options.sourceId;

    const records = await (prisma as any).stockMovementLedger.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.limit ?? 50,
    });

    return records.map((r: any) => this.mapToModel(r));
  }

  private mapToModel(record: any): StockMovementModel {
    return {
      id: record.id,
      stockBalanceId: record.stockBalanceId,
      warehouseId: record.warehouseId,
      variantId: record.variantId,
      movementType: record.movementType as MovementType,
      quantityDelta: record.quantityDelta,
      onHandAfter: record.onHandAfter,
      reservedAfter: record.reservedAfter,
      availableAfter: record.availableAfter,
      sourceType: record.sourceType as SourceType,
      sourceId: record.sourceId,
      actorId: record.actorId,
      reason: record.reason,
      createdAt: record.createdAt,
    };
  }
}
