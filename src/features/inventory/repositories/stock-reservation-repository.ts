/**
 * AlifWorld Stock Reservation Repository
 * 
 * Handles atomic reservation records during checkout sessions, deterministic TTL
 * expiration queries, commitments upon order placement, and releases upon cart abandon.
 * 
 * Reference: docs/architecture/scope-boundaries-and-domain-map.md
 * Invariants: ADR-0003, ADR-0021, ADR-0022, ADR-0026
 */

import { prisma } from '@/shared/database/prisma';
import { generatePrefixedId, ENTITY_PREFIXES } from '@/shared/utils/id';
import { ConflictError, NotFoundError } from '@/shared/errors/app-error';
import { StockReservationModel, ReservationStatus, calculateAvailableStock } from '../types';

export class StockReservationRepository {
  public async findById(id: string): Promise<StockReservationModel | null> {
    const record = await (prisma as any).stockReservation.findFirst({
      where: { id, deletedAt: null },
      include: {
        stockBalance: {
          include: {
            warehouse: true,
            variant: {
              include: { product: true },
            },
          },
        },
      },
    });

    return record ? this.mapToModel(record) : null;
  }

  public async findActiveByCartId(cartId: string): Promise<StockReservationModel[]> {
    const records = await (prisma as any).stockReservation.findMany({
      where: {
        cartId,
        status: ReservationStatus.ACTIVE,
        expiresAt: { gt: new Date() },
        deletedAt: null,
      },
      include: {
        stockBalance: {
          include: { warehouse: true, variant: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((r: any) => this.mapToModel(r));
  }

  public async findActiveByOrderId(orderId: string): Promise<StockReservationModel[]> {
    const records = await (prisma as any).stockReservation.findMany({
      where: {
        orderId,
        status: ReservationStatus.ACTIVE,
        deletedAt: null,
      },
      include: {
        stockBalance: {
          include: { warehouse: true, variant: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((r: any) => this.mapToModel(r));
  }

  public async create(data: {
    stockBalanceId: string;
    quantity: number;
    orderId?: string | null;
    cartId?: string | null;
    ttlMinutes?: number;
  }): Promise<StockReservationModel> {
    const id = generatePrefixedId(ENTITY_PREFIXES.STOCK_RESERVATION);
    const ttl = data.ttlMinutes ?? 15;
    const expiresAt = new Date(Date.now() + ttl * 60 * 1000);

    const record = await (prisma as any).stockReservation.create({
      data: {
        id,
        stockBalanceId: data.stockBalanceId,
        orderId: data.orderId ?? null,
        cartId: data.cartId ?? null,
        quantity: data.quantity,
        status: ReservationStatus.ACTIVE,
        expiresAt,
        version: 1,
      },
      include: {
        stockBalance: {
          include: { warehouse: true, variant: true },
        },
      },
    });

    return this.mapToModel(record);
  }

  public async commit(id: string, expectedVersion: number, orderId?: string): Promise<StockReservationModel> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundError(`Stock reservation '${id}' not found.`);
    }

    if (existing.version !== expectedVersion) {
      throw new ConflictError(
        `Optimistic concurrency conflict on reservation '${id}'. Expected version ${expectedVersion}, but found ${existing.version}.`
      );
    }

    if (existing.status !== ReservationStatus.ACTIVE) {
      throw new ConflictError(`Cannot commit reservation '${id}' in status '${existing.status}'.`);
    }

    const updated = await (prisma as any).stockReservation.update({
      where: { id },
      data: {
        status: ReservationStatus.COMMITTED,
        committedAt: new Date(),
        orderId: orderId ?? existing.orderId,
        version: { increment: 1 },
      },
      include: {
        stockBalance: {
          include: { warehouse: true, variant: true },
        },
      },
    });

    return this.mapToModel(updated);
  }

  public async release(id: string, expectedVersion: number): Promise<StockReservationModel> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundError(`Stock reservation '${id}' not found.`);
    }

    if (existing.version !== expectedVersion) {
      throw new ConflictError(
        `Optimistic concurrency conflict on reservation '${id}'. Expected version ${expectedVersion}, but found ${existing.version}.`
      );
    }

    if (existing.status !== ReservationStatus.ACTIVE) {
      throw new ConflictError(`Cannot release reservation '${id}' in status '${existing.status}'.`);
    }

    const updated = await (prisma as any).stockReservation.update({
      where: { id },
      data: {
        status: ReservationStatus.RELEASED,
        releasedAt: new Date(),
        version: { increment: 1 },
      },
      include: {
        stockBalance: {
          include: { warehouse: true, variant: true },
        },
      },
    });

    return this.mapToModel(updated);
  }

  public async expire(id: string, expectedVersion: number): Promise<StockReservationModel> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundError(`Stock reservation '${id}' not found.`);
    }

    if (existing.version !== expectedVersion) {
      throw new ConflictError(
        `Optimistic concurrency conflict on reservation '${id}'. Expected version ${expectedVersion}, but found ${existing.version}.`
      );
    }

    if (existing.status !== ReservationStatus.ACTIVE) {
      throw new ConflictError(`Cannot expire reservation '${id}' in status '${existing.status}'.`);
    }

    const updated = await (prisma as any).stockReservation.update({
      where: { id },
      data: {
        status: ReservationStatus.EXPIRED,
        version: { increment: 1 },
      },
      include: {
        stockBalance: {
          include: { warehouse: true, variant: true },
        },
      },
    });

    return this.mapToModel(updated);
  }

  public async findExpiredActiveReservations(cutoffDate: Date = new Date()): Promise<StockReservationModel[]> {
    const records = await (prisma as any).stockReservation.findMany({
      where: {
        status: ReservationStatus.ACTIVE,
        expiresAt: { lte: cutoffDate },
        deletedAt: null,
      },
      include: {
        stockBalance: {
          include: { warehouse: true, variant: true },
        },
      },
      take: 100, // Batch limit for cleanup sweeps
      orderBy: { expiresAt: 'asc' },
    });

    return records.map((r: any) => this.mapToModel(r));
  }

  public async list(options?: {
    stockBalanceId?: string;
    status?: ReservationStatus;
    orderId?: string;
    cartId?: string;
    limit?: number;
  }): Promise<StockReservationModel[]> {
    const where: any = { deletedAt: null };
    if (options?.stockBalanceId) where.stockBalanceId = options.stockBalanceId;
    if (options?.status) where.status = options.status;
    if (options?.orderId) where.orderId = options.orderId;
    if (options?.cartId) where.cartId = options.cartId;

    const records = await (prisma as any).stockReservation.findMany({
      where,
      take: options?.limit ?? 50,
      orderBy: { createdAt: 'desc' },
      include: {
        stockBalance: {
          include: { warehouse: true, variant: true },
        },
      },
    });

    return records.map((r: any) => this.mapToModel(r));
  }

  private mapToModel(record: any): StockReservationModel {
    return {
      id: record.id,
      stockBalanceId: record.stockBalanceId,
      orderId: record.orderId,
      cartId: record.cartId,
      quantity: record.quantity,
      status: record.status as ReservationStatus,
      expiresAt: record.expiresAt,
      committedAt: record.committedAt,
      releasedAt: record.releasedAt,
      version: record.version,
      deletedAt: record.deletedAt,
      deletedBy: record.deletedBy,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      stockBalance: record.stockBalance
        ? {
            id: record.stockBalance.id,
            warehouseId: record.stockBalance.warehouseId,
            variantId: record.stockBalance.variantId,
            onHand: record.stockBalance.onHand,
            reserved: record.stockBalance.reserved,
            damaged: record.stockBalance.damaged,
            quarantined: record.stockBalance.quarantined,
            available: calculateAvailableStock({
              onHand: record.stockBalance.onHand,
              reserved: record.stockBalance.reserved,
              damaged: record.stockBalance.damaged,
              quarantined: record.stockBalance.quarantined,
            }),
            lowStockThreshold: record.stockBalance.lowStockThreshold,
            reorderPoint: record.stockBalance.reorderPoint,
            version: record.stockBalance.version,
            createdAt: record.stockBalance.createdAt,
            updatedAt: record.stockBalance.updatedAt,
            warehouse: record.stockBalance.warehouse,
            variant: record.stockBalance.variant,
          }
        : undefined,
    };
  }
}
