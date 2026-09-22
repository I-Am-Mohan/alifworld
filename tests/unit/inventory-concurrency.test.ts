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
  calculateAvailableStock,
} from '@/features/inventory/types';
import { ConflictError, NotFoundError } from '@/shared/errors/app-error';

// ---------------------------------------------------------------------------
// Concurrency-Aware Test Doubles
// ---------------------------------------------------------------------------

class ConcurrentStockBalanceRepository extends StockBalanceRepository {
  public balances = new Map<string, StockBalanceModel>();
  public lock = false;

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

  public setInitialBalance(balance: StockBalanceModel) {
    this.balances.set(balance.id, { ...balance });
  }

  /**
   * Simulates transactional atomic update with optimistic concurrency control (OCC).
   * Verifies that the row version matches expectedVersion, exactly like PostgreSQL
   * `UPDATE stock_balances SET ... WHERE id = $1 AND version = $2`.
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
    const current = this.balances.get(id);
    if (!current) throw new NotFoundError(`Stock balance '${id}' not found.`);

    // OCC Check: In PostgreSQL, if version mismatch occurs, 0 rows are updated
    if (current.version !== expectedVersion) {
      throw new ConflictError(
        `Optimistic concurrency conflict on stock balance '${id}'. Expected version ${expectedVersion}, but found ${current.version}.`
      );
    }

    const nextOnHand = current.onHand + (deltas.onHandDelta ?? 0);
    const nextReserved = current.reserved + (deltas.reservedDelta ?? 0);
    const nextDamaged = current.damaged + (deltas.damagedDelta ?? 0);
    const nextQuarantined = current.quarantined + (deltas.quarantinedDelta ?? 0);

    if (nextOnHand < 0) throw new ConflictError('OnHand stock cannot be negative');
    if (nextReserved < 0) throw new ConflictError('Reserved stock cannot be negative');

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

class ConcurrentReservationRepository extends StockReservationRepository {
  public reservations = new Map<string, StockReservationModel>();

  public async create(data: any): Promise<StockReservationModel> {
    const id = `res_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const model: StockReservationModel = {
      id,
      stockBalanceId: data.stockBalanceId,
      quantity: data.quantity,
      cartId: data.cartId,
      orderId: data.orderId,
      status: ReservationStatus.ACTIVE,
      expiresAt: new Date(Date.now() + (data.ttlMinutes ?? 15) * 60 * 1000),
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.reservations.set(id, model);
    return model;
  }
}

class ConcurrentMovementRepository extends StockMovementRepository {
  public async record(input: any): Promise<StockMovementModel> {
    return {
      id: `mov_${Date.now()}`,
      ...input,
      createdAt: new Date(),
    };
  }
}

class ConcurrentWarehouseRepository extends WarehouseRepository {
  public async findById(id: string): Promise<any> {
    return {
      id,
      code: 'DHK-HUB-01',
      name: 'Dhaka Central Hub',
      division: 'DHAKA',
      district: 'Dhaka',
      isPlatformHub: true,
      isActive: true,
      version: 1,
    };
  }
}

// ---------------------------------------------------------------------------
// Test Suite: Concurrency Race on the Final Unit
// ---------------------------------------------------------------------------

describe('Inventory Concurrency: Racing on the Last Unit', () => {
  let balanceRepo: ConcurrentStockBalanceRepository;
  let reservationRepo: ConcurrentReservationRepository;
  let movementRepo: ConcurrentMovementRepository;
  let warehouseRepo: ConcurrentWarehouseRepository;
  let service: InventoryService;

  const warehouseId = 'whs_dhaka_central';
  const variantId = 'var_walton_last_unit';
  const balanceId = 'stb_last_unit';

  beforeEach(() => {
    balanceRepo = new ConcurrentStockBalanceRepository();
    reservationRepo = new ConcurrentReservationRepository();
    movementRepo = new ConcurrentMovementRepository();
    warehouseRepo = new ConcurrentWarehouseRepository();

    // Exactly 1 physical unit on-hand, 0 reserved, 0 damaged -> exactly 1 unit available!
    balanceRepo.setInitialBalance({
      id: balanceId,
      warehouseId,
      variantId,
      onHand: 1,
      reserved: 0,
      damaged: 0,
      quarantined: 0,
      available: 1,
      lowStockThreshold: 1,
      reorderPoint: 5,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    service = new InventoryService(
      balanceRepo,
      reservationRepo,
      movementRepo,
      warehouseRepo
    );
  });

  it('prevents overselling when two buyers race concurrently for the same final unit', async () => {
    // Both buyers attempt to reserve the 1 remaining unit at the exact same moment
    const buyerA = service.reserveStock({
      warehouseId,
      variantId,
      quantity: 1,
      ttlMinutes: 15,
      cartId: 'cart_buyer_alpha',
    });

    const buyerB = service.reserveStock({
      warehouseId,
      variantId,
      quantity: 1,
      ttlMinutes: 15,
      cartId: 'cart_buyer_beta',
    });

    const results = await Promise.allSettled([buyerA, buyerB]);

    // Exactly ONE buyer must succeed, and exactly ONE buyer must be rejected
    const successful = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(successful.length).toBe(1);
    expect(rejected.length).toBe(1);

    // The rejected buyer must receive a ConflictError
    const rejectionReason = (rejected[0] as PromiseRejectedResult).reason;
    expect(rejectionReason instanceof ConflictError).toBe(true);

    // Verify the stock balance after the race
    const finalBalance = await balanceRepo.findById(balanceId);
    expect(finalBalance).not.toBeNull();
    expect(finalBalance!.onHand).toBe(1);
    expect(finalBalance!.reserved).toBe(1); // Locked by the winner
    expect(finalBalance!.available).toBe(0); // Available must NEVER drop below 0
    expect(finalBalance!.version).toBe(2); // Incremented exactly once
  });

  it('subsequent attempts after the last unit is reserved are immediately rejected for lack of stock', async () => {
    // Winner reserves the last unit
    await service.reserveStock({
      warehouseId,
      variantId,
      quantity: 1,
      ttlMinutes: 15,
      cartId: 'cart_buyer_winner',
    });

    // Third buyer arrives when available is 0
    expect(
      service.reserveStock({
        warehouseId,
        variantId,
        quantity: 1,
        ttlMinutes: 15,
        cartId: 'cart_buyer_late',
      })
    ).rejects.toThrow(ConflictError);

    const finalBalance = await balanceRepo.findById(balanceId);
    expect(finalBalance!.available).toBe(0);
    expect(finalBalance!.reserved).toBe(1);
  });
});
