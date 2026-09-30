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

class MockWarehouseRepo extends WarehouseRepository {
  public async findById(id: string): Promise<any> {
    return {
      id,
      name: 'Dhaka Main Warehouse',
      code: 'DHK-MAIN-01',
      division: 'DHAKA',
      district: 'Dhaka',
      isPlatformHub: true,
      isActive: true,
      version: 1,
    };
  }
}

class MockStockBalanceRepo extends StockBalanceRepository {
  public balances = new Map<string, StockBalanceModel>();

  public async findById(id: string): Promise<StockBalanceModel | null> {
    return this.balances.get(id) ?? null;
  }

  public async findByWarehouseAndVariant(
    warehouseId: string,
    variantId: string
  ): Promise<StockBalanceModel | null> {
    for (const bal of this.balances.values()) {
      if (bal.warehouseId === warehouseId && bal.variantId === variantId) {
        return bal;
      }
    }
    return null;
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
      throw new ConflictError(`OCC conflict on stock balance '${id}'`);
    }

    const nextOnHand = current.onHand + (deltas.onHandDelta ?? 0);
    const nextReserved = current.reserved + (deltas.reservedDelta ?? 0);
    const nextDamaged = current.damaged + (deltas.damagedDelta ?? 0);
    const nextQuarantined = current.quarantined + (deltas.quarantinedDelta ?? 0);

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

class MockReservationRepo extends StockReservationRepository {
  public reservations = new Map<string, StockReservationModel>();

  public async findById(id: string): Promise<StockReservationModel | null> {
    return this.reservations.get(id) ?? null;
  }

  public async create(input: any): Promise<StockReservationModel> {
    const id = `res_${Math.random().toString(36).substring(2, 8)}`;
    const expiresAt = new Date(Date.now() + (input.ttlMinutes ?? 15) * 60 * 1000);
    const res: StockReservationModel = {
      id,
      stockBalanceId: input.stockBalanceId,
      quantity: input.quantity,
      status: ReservationStatus.ACTIVE,
      cartId: input.cartId ?? null,
      orderId: input.orderId ?? null,
      expiresAt,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.reservations.set(id, res);
    return res;
  }

  public async release(id: string, expectedVersion: number): Promise<StockReservationModel> {
    const res = this.reservations.get(id);
    if (!res) throw new NotFoundError(`Reservation ${id} not found`);
    const updated: StockReservationModel = {
      ...res,
      status: ReservationStatus.RELEASED,
      version: res.version + 1,
      updatedAt: new Date(),
    };
    this.reservations.set(id, updated);
    return updated;
  }

  public async commit(
    id: string,
    expectedVersion: number,
    orderId: string
  ): Promise<StockReservationModel> {
    const res = this.reservations.get(id);
    if (!res) throw new NotFoundError(`Reservation ${id} not found`);
    const updated: StockReservationModel = {
      ...res,
      status: ReservationStatus.COMMITTED,
      orderId,
      version: res.version + 1,
      updatedAt: new Date(),
    };
    this.reservations.set(id, updated);
    return updated;
  }

  public async expire(id: string, expectedVersion: number): Promise<StockReservationModel> {
    const res = this.reservations.get(id);
    if (!res) throw new NotFoundError(`Reservation ${id} not found`);
    const updated: StockReservationModel = {
      ...res,
      status: ReservationStatus.EXPIRED,
      version: res.version + 1,
      updatedAt: new Date(),
    };
    this.reservations.set(id, updated);
    return updated;
  }

  public async findExpiredActiveReservations(cutoff: Date): Promise<StockReservationModel[]> {
    const result: StockReservationModel[] = [];
    for (const res of this.reservations.values()) {
      if (res.status === ReservationStatus.ACTIVE && new Date(res.expiresAt) <= cutoff) {
        result.push(res);
      }
    }
    return result;
  }
}

class MockMovementRepo extends StockMovementRepository {
  public movements: StockMovementModel[] = [];

  public async record(input: any): Promise<StockMovementModel> {
    const movement: StockMovementModel = {
      id: `mvt_${Math.random().toString(36).substring(2, 8)}`,
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
      createdAt: new Date(),
    };
    this.movements.push(movement);
    return movement;
  }
}

describe('Milestone 105 - Reservation Lifecycle & Compensation Unit Tests', () => {
  let inventoryService: InventoryService;
  let balanceRepo: MockStockBalanceRepo;
  let reservationRepo: MockReservationRepo;
  let movementRepo: MockMovementRepo;

  beforeEach(async () => {
    const warehouseRepo = new MockWarehouseRepo();
    balanceRepo = new MockStockBalanceRepo();
    reservationRepo = new MockReservationRepo();
    movementRepo = new MockMovementRepo();

    inventoryService = new InventoryService(
      balanceRepo,
      reservationRepo,
      movementRepo,
      warehouseRepo
    );

    // Seed stock balance: 50 onHand, 0 reserved, 50 available
    balanceRepo.balances.set('stb_wh_001_var_001', {
      id: 'stb_wh_001_var_001',
      warehouseId: 'wh_001',
      variantId: 'var_001',
      onHand: 50,
      reserved: 0,
      damaged: 0,
      quarantined: 0,
      available: 50,
      lowStockThreshold: 5,
      reorderPoint: 10,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it('should reserve stock, release it, and handle re-release idempotently', async () => {
    // 1. Reserve 10 units
    const { reservation, balance: reservedBalance } = await inventoryService.reserveStock({
      warehouseId: 'wh_001',
      variantId: 'var_001',
      quantity: 10,
    });

    expect(reservedBalance.reserved).toBe(10);
    expect(reservedBalance.available).toBe(40);
    expect(reservation.status).toBe(ReservationStatus.ACTIVE);

    // 2. Release reservation
    const { reservation: released, balance: releasedBalance } =
      await inventoryService.releaseReservation({
        reservationId: reservation.id,
        reason: 'User cancelled cart',
      });

    expect(released.status).toBe(ReservationStatus.RELEASED);
    expect(releasedBalance.reserved).toBe(0);
    expect(releasedBalance.available).toBe(50);

    // 3. Re-release same reservation idempotently (should not throw)
    const idempotentResult = await inventoryService.releaseReservation({
      reservationId: reservation.id,
      reason: 'Retry release call',
    });

    expect(idempotentResult.reservation.status).toBe(ReservationStatus.RELEASED);
    expect(idempotentResult.balance.reserved).toBe(0);
  });

  it('should commit a reservation and handle re-commit idempotently', async () => {
    // 1. Reserve 15 units
    const { reservation } = await inventoryService.reserveStock({
      warehouseId: 'wh_001',
      variantId: 'var_001',
      quantity: 15,
    });

    // 2. Commit reservation
    const { reservation: committed, balance: committedBalance } =
      await inventoryService.commitReservation({
        reservationId: reservation.id,
        orderId: 'ord_123',
      });

    expect(committed.status).toBe(ReservationStatus.COMMITTED);
    expect(committedBalance.onHand).toBe(35);
    expect(committedBalance.reserved).toBe(0);
    expect(committedBalance.available).toBe(35);

    // 3. Re-commit same reservation idempotently
    const idempotentResult = await inventoryService.commitReservation({
      reservationId: reservation.id,
      orderId: 'ord_123',
    });

    expect(idempotentResult.reservation.status).toBe(ReservationStatus.COMMITTED);
    expect(idempotentResult.balance.onHand).toBe(35);
  });

  it('should run automated TTL expiry sweep and return locked stock to available', async () => {
    // 1. Reserve stock with 1 minute TTL
    const { reservation } = await inventoryService.reserveStock({
      warehouseId: 'wh_001',
      variantId: 'var_001',
      quantity: 20,
      ttlMinutes: 1,
    });

    expect(balanceRepo.balances.get('stb_wh_001_var_001')?.reserved).toBe(20);

    // 2. Run expiry sweep with future cutoff date
    const futureCutoff = new Date(Date.now() + 10 * 60 * 1000);
    const expiredCount = await inventoryService.expireStaleReservations(futureCutoff);

    expect(expiredCount).toBe(1);
    expect(balanceRepo.balances.get('stb_wh_001_var_001')?.reserved).toBe(0);
    expect(balanceRepo.balances.get('stb_wh_001_var_001')?.available).toBe(50);

    const expiredRes = await reservationRepo.findById(reservation.id);
    expect(expiredRes?.status).toBe(ReservationStatus.EXPIRED);
  });

  it('should execute compensating inventory transaction restoring stock for cancelled order', async () => {
    // Perform compensation for order return / cancellation
    const { balance, movement } = await inventoryService.compensateInventory({
      warehouseId: 'wh_001',
      variantId: 'var_001',
      quantity: 10,
      orderId: 'ord_cancelled_99',
      reason: 'Customer requested order cancellation post-payment',
    });

    expect(balance.onHand).toBe(60);
    expect(balance.available).toBe(60);
    expect(movement.movementType).toBe(MovementType.RETURN);
    expect(movement.quantityDelta).toBe(10);
    expect(movement.sourceType).toBe(SourceType.ORDER_FULFILLMENT);
  });
});
