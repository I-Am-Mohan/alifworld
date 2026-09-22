import { describe, expect, it, beforeEach } from 'bun:test';
import { InventoryService } from '@/features/inventory/services/inventory-service';
import { StockBalanceRepository } from '@/features/inventory/repositories/stock-balance-repository';
import { StockReservationRepository } from '@/features/inventory/repositories/stock-reservation-repository';
import { StockMovementRepository } from '@/features/inventory/repositories/stock-movement-repository';
import { WarehouseRepository } from '@/features/inventory/repositories/warehouse-repository';
import {
  StockBalanceModel,
  StockReservationModel,
  StockMovementModel,
  ReservationStatus,
  MovementType,
  SourceType,
  calculateAvailableStock,
} from '@/features/inventory/types';
import { ConflictError, NotFoundError } from '@/shared/errors/app-error';

// ---------------------------------------------------------------------------
// In-Memory Test Doubles
// ---------------------------------------------------------------------------

class MockWarehouseRepository extends WarehouseRepository {
  public async findById(id: string): Promise<any> {
    if (id === 'whs_invalid') return null;
    return {
      id,
      name: 'Dhaka Central Hub',
      code: 'DHK-HUB-01',
      division: 'DHAKA',
      district: 'Dhaka',
      isPlatformHub: true,
      isActive: id !== 'whs_inactive',
      version: 1,
    };
  }
}

class MockStockBalanceRepository extends StockBalanceRepository {
  public balances = new Map<string, StockBalanceModel>();

  public async findById(id: string): Promise<StockBalanceModel | null> {
    return this.balances.get(id) ?? null;
  }

  public async findByWarehouseAndVariant(warehouseId: string, variantId: string): Promise<StockBalanceModel | null> {
    for (const bal of this.balances.values()) {
      if (bal.warehouseId === warehouseId && bal.variantId === variantId) {
        return bal;
      }
    }
    return null;
  }

  public async getOrCreate(warehouseId: string, variantId: string): Promise<StockBalanceModel> {
    const existing = await this.findByWarehouseAndVariant(warehouseId, variantId);
    if (existing) return existing;

    const id = `stb_${warehouseId}_${variantId}`;
    const newBalance: StockBalanceModel = {
      id,
      warehouseId,
      variantId,
      onHand: 0,
      reserved: 0,
      damaged: 0,
      quarantined: 0,
      available: 0,
      lowStockThreshold: 5,
      reorderPoint: 10,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.balances.set(id, newBalance);
    return newBalance;
  }

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
    const current = this.balances.get(id);
    if (!current) throw new NotFoundError(`Balance ${id} not found`);

    if (current.version !== expectedVersion) {
      throw new ConflictError(
        `OCC conflict on stock balance '${id}'. Expected version ${expectedVersion}, but found ${current.version}.`
      );
    }

    const nextOnHand = current.onHand + (deltas.onHandDelta ?? 0);
    const nextReserved = current.reserved + (deltas.reservedDelta ?? 0);
    const nextDamaged = current.damaged + (deltas.damagedDelta ?? 0);
    const nextQuarantined = current.quarantined + (deltas.quarantinedDelta ?? 0);

    if (nextOnHand < 0) throw new ConflictError('OnHand cannot be negative');
    if (nextReserved < 0) throw new ConflictError('Reserved cannot be negative');

    const nextAvailable = calculateAvailableStock({
      onHand: nextOnHand,
      reserved: nextReserved,
      damaged: nextDamaged,
      quarantined: nextQuarantined,
    });

    const updated: StockBalanceModel = {
      ...current,
      onHand: nextOnHand,
      reserved: nextReserved,
      damaged: nextDamaged,
      quarantined: nextQuarantined,
      available: nextAvailable,
      version: current.version + 1,
      updatedAt: new Date(),
    };

    this.balances.set(id, updated);
    return updated;
  }
}

class MockStockReservationRepository extends StockReservationRepository {
  public reservations = new Map<string, StockReservationModel>();

  public async findById(id: string): Promise<StockReservationModel | null> {
    return this.reservations.get(id) ?? null;
  }

  public async create(data: {
    stockBalanceId: string;
    quantity: number;
    cartId?: string | null;
    orderId?: string | null;
    ttlMinutes?: number;
  }): Promise<StockReservationModel> {
    const id = `res_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const expiresAt = new Date(Date.now() + (data.ttlMinutes ?? 15) * 60 * 1000);

    const model: StockReservationModel = {
      id,
      stockBalanceId: data.stockBalanceId,
      quantity: data.quantity,
      status: ReservationStatus.ACTIVE,
      cartId: data.cartId,
      orderId: data.orderId,
      expiresAt,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.reservations.set(id, model);
    return model;
  }

  public async commit(id: string, expectedVersion: number, orderId?: string): Promise<StockReservationModel> {
    const res = this.reservations.get(id);
    if (!res) throw new NotFoundError(`Reservation ${id} not found`);
    if (res.version !== expectedVersion) throw new ConflictError('OCC conflict on reservation');
    if (res.status !== ReservationStatus.ACTIVE) throw new ConflictError(`Cannot commit in status ${res.status}`);

    const updated: StockReservationModel = {
      ...res,
      status: ReservationStatus.COMMITTED,
      orderId: orderId ?? res.orderId,
      committedAt: new Date(),
      version: res.version + 1,
      updatedAt: new Date(),
    };
    this.reservations.set(id, updated);
    return updated;
  }

  public async release(id: string, expectedVersion: number): Promise<StockReservationModel> {
    const res = this.reservations.get(id);
    if (!res) throw new NotFoundError(`Reservation ${id} not found`);
    if (res.version !== expectedVersion) throw new ConflictError('OCC conflict on reservation');
    if (res.status !== ReservationStatus.ACTIVE) throw new ConflictError(`Cannot release in status ${res.status}`);

    const updated: StockReservationModel = {
      ...res,
      status: ReservationStatus.RELEASED,
      releasedAt: new Date(),
      version: res.version + 1,
      updatedAt: new Date(),
    };
    this.reservations.set(id, updated);
    return updated;
  }

  public async expire(id: string, expectedVersion: number): Promise<StockReservationModel> {
    const res = this.reservations.get(id);
    if (!res) throw new NotFoundError(`Reservation ${id} not found`);
    if (res.version !== expectedVersion) throw new ConflictError('OCC conflict on reservation');

    const updated: StockReservationModel = {
      ...res,
      status: ReservationStatus.EXPIRED,
      version: res.version + 1,
      updatedAt: new Date(),
    };
    this.reservations.set(id, updated);
    return updated;
  }

  public async findExpiredActiveReservations(cutoffDate: Date = new Date()): Promise<StockReservationModel[]> {
    const list: StockReservationModel[] = [];
    for (const res of this.reservations.values()) {
      if (res.status === ReservationStatus.ACTIVE && res.expiresAt <= cutoffDate) {
        list.push(res);
      }
    }
    return list;
  }
}

class MockStockMovementRepository extends StockMovementRepository {
  public movements: StockMovementModel[] = [];

  public async record(input: any): Promise<StockMovementModel> {
    const mov: StockMovementModel = {
      id: `mov_${Date.now()}`,
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
      actorId: input.actorId,
      reason: input.reason,
      createdAt: new Date(),
    };
    this.movements.push(mov);
    return mov;
  }
}

// ---------------------------------------------------------------------------
// Test Suite: Reservation & Inventory Lifecycle
// ---------------------------------------------------------------------------

describe('Inventory Reservation & Stock Lifecycle', () => {
  let balanceRepo: MockStockBalanceRepository;
  let reservationRepo: MockStockReservationRepository;
  let movementRepo: MockStockMovementRepository;
  let warehouseRepo: MockWarehouseRepository;
  let service: InventoryService;

  const warehouseId = 'whs_dhaka_01';
  const variantId = 'var_walton_phone_blue';

  beforeEach(() => {
    balanceRepo = new MockStockBalanceRepository();
    reservationRepo = new MockStockReservationRepository();
    movementRepo = new MockStockMovementRepository();
    warehouseRepo = new MockWarehouseRepository();

    service = new InventoryService(
      balanceRepo,
      reservationRepo,
      movementRepo,
      warehouseRepo
    );
  });

  it('receives incoming stock and computes available stock', async () => {
    const result = await service.receiveStock({
      warehouseId,
      variantId,
      quantity: 50,
      sourceType: SourceType.PURCHASE_ORDER,
      sourceId: 'PO-2026-001',
      reason: 'Factory delivery',
    });

    expect(result.balance.onHand).toBe(50);
    expect(result.balance.reserved).toBe(0);
    expect(result.balance.available).toBe(50);
    expect(movementRepo.movements.length).toBe(1);
    expect(movementRepo.movements[0].movementType).toBe(MovementType.RECEIVE);
    expect(movementRepo.movements[0].quantityDelta).toBe(50);
  });

  it('reserves available stock with deterministic TTL and decrements available', async () => {
    // First intake 10 units
    await service.receiveStock({
      warehouseId,
      variantId,
      quantity: 10,
      sourceType: SourceType.PURCHASE_ORDER,
      sourceId: 'PO-001',
    });

    // Reserve 4 units
    const { reservation, balance } = await service.reserveStock({
      warehouseId,
      variantId,
      quantity: 4,
      cartId: 'crt_buyer_123',
      ttlMinutes: 15,
    });

    expect(reservation.status).toBe(ReservationStatus.ACTIVE);
    expect(reservation.quantity).toBe(4);
    expect(balance.onHand).toBe(10);
    expect(balance.reserved).toBe(4);
    expect(balance.available).toBe(6); // 10 - 4 = 6
  });

  it('strictly rejects reservation when requested quantity exceeds available stock', async () => {
    await service.receiveStock({
      warehouseId,
      variantId,
      quantity: 5,
      sourceType: SourceType.PURCHASE_ORDER,
      sourceId: 'PO-001',
    });

    // Requesting 6 when only 5 available
    expect(
      service.reserveStock({
        warehouseId,
        variantId,
        quantity: 6,
        ttlMinutes: 15,
        cartId: 'crt_buyer_greedy',
      })
    ).rejects.toThrow(ConflictError);
  });

  it('releases an active reservation and restores available stock', async () => {
    await service.receiveStock({
      warehouseId,
      variantId,
      quantity: 10,
      sourceType: SourceType.PURCHASE_ORDER,
      sourceId: 'PO-001',
    });

    const { reservation } = await service.reserveStock({
      warehouseId,
      variantId,
      quantity: 3,
      ttlMinutes: 15,
      cartId: 'crt_abandoned',
    });

    // Release reservation
    const { reservation: released, balance: restoredBalance } = await service.releaseReservation({
      reservationId: reservation.id,
      reason: 'Customer abandoned cart',
    });

    expect(released.status).toBe(ReservationStatus.RELEASED);
    expect(restoredBalance.onHand).toBe(10);
    expect(restoredBalance.reserved).toBe(0);
    expect(restoredBalance.available).toBe(10);
  });

  it('commits a reservation upon order placement and decrements physical on-hand', async () => {
    await service.receiveStock({
      warehouseId,
      variantId,
      quantity: 20,
      sourceType: SourceType.PURCHASE_ORDER,
      sourceId: 'PO-001',
    });

    const { reservation } = await service.reserveStock({
      warehouseId,
      variantId,
      quantity: 5,
      ttlMinutes: 15,
      cartId: 'crt_purchased',
    });

    // Commit reservation upon payment confirmation
    const { reservation: committed, balance: postOrderBalance } = await service.commitReservation({
      reservationId: reservation.id,
      orderId: 'ord_success_999',
    });

    expect(committed.status).toBe(ReservationStatus.COMMITTED);
    expect(postOrderBalance.onHand).toBe(15); // Physical on-hand decremented from 20 to 15
    expect(postOrderBalance.reserved).toBe(0); // Reserved decremented from 5 to 0
    expect(postOrderBalance.available).toBe(15); // Available = 15 - 0 = 15
  });

  it('automatically sweeps and expires stale reservations past TTL cutoff', async () => {
    await service.receiveStock({
      warehouseId,
      variantId,
      quantity: 10,
      sourceType: SourceType.PURCHASE_ORDER,
      sourceId: 'PO-001',
    });

    const { reservation } = await service.reserveStock({
      warehouseId,
      variantId,
      quantity: 4,
      cartId: 'crt_stale',
      ttlMinutes: 15,
    });

    // Balance currently has reserved: 4, available: 6
    const midBalance = await service.getBalance(warehouseId, variantId);
    expect(midBalance?.available).toBe(6);

    // Simulate clock advancing 16 minutes into the future
    const futureTime = new Date(Date.now() + 16 * 60 * 1000);
    const expiredCount = await service.expireStaleReservations(futureTime);

    expect(expiredCount).toBe(1);

    // After sweep, locked units must be restored
    const finalBalance = await service.getBalance(warehouseId, variantId);
    expect(finalBalance?.onHand).toBe(10);
    expect(finalBalance?.reserved).toBe(0);
    expect(finalBalance?.available).toBe(10); // Fully restored!
  });
});
