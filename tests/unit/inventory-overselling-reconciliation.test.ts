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
// Thread-Safe Simulated In-Memory Database with OCC
// ---------------------------------------------------------------------------

class MockOCCStockBalanceRepository extends StockBalanceRepository {
  public balances = new Map<string, StockBalanceModel>();

  public async findById(id: string): Promise<StockBalanceModel | null> {
    const bal = this.balances.get(id);
    return bal ? { ...bal } : null;
  }

  public async findByWarehouseAndVariant(
    warehouseId: string,
    variantId: string
  ): Promise<StockBalanceModel | null> {
    for (const bal of this.balances.values()) {
      if (bal.warehouseId === warehouseId && bal.variantId === variantId) {
        return { ...bal };
      }
    }
    return null;
  }

  public async getOrCreate(warehouseId: string, variantId: string): Promise<StockBalanceModel> {
    const existing = await this.findByWarehouseAndVariant(warehouseId, variantId);
    if (existing) return existing;

    const id = `stb_${warehouseId}_${variantId}`;
    const newBal: StockBalanceModel = {
      id,
      warehouseId,
      variantId,
      onHand: 0,
      reserved: 0,
      damaged: 0,
      quarantined: 0,
      available: 0,
      lowStockThreshold: 10,
      reorderPoint: 20,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.balances.set(id, newBal);
    return { ...newBal };
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
    if (!current) throw new NotFoundError(`Stock balance '${id}' not found.`);

    // OCC Check
    if (current.version !== expectedVersion) {
      throw new ConflictError(
        `OCC conflict on '${id}'. Expected version ${expectedVersion}, found ${current.version}.`
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

    if (nextAvailable < 0) {
      throw new ConflictError('Available stock cannot be negative (overselling prevented)');
    }

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
    return { ...updated };
  }
}

class MockThreadSafeReservationRepository extends StockReservationRepository {
  public reservations = new Map<string, StockReservationModel>();

  public async findById(id: string): Promise<StockReservationModel | null> {
    const res = this.reservations.get(id);
    return res ? { ...res } : null;
  }

  public async findExistingActiveReservation(params: any): Promise<StockReservationModel | null> {
    if (params.cartId) {
      for (const res of this.reservations.values()) {
        if (
          res.cartId === params.cartId &&
          res.stockBalanceId === params.stockBalanceId &&
          res.status === ReservationStatus.ACTIVE
        ) {
          return { ...res };
        }
      }
    }
    return null;
  }

  public async create(input: any): Promise<StockReservationModel> {
    const id = `res_${Math.random().toString(36).substring(2, 9)}`;
    const expiresAt = new Date(Date.now() + (input.ttlMinutes ?? 15) * 60 * 1000);
    const res: StockReservationModel = {
      id,
      stockBalanceId: input.stockBalanceId,
      quantity: input.quantity,
      cartId: input.cartId ?? null,
      orderId: input.orderId ?? null,
      status: ReservationStatus.ACTIVE,
      expiresAt,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.reservations.set(id, res);
    return { ...res };
  }

  public async release(id: string, expectedVersion: number): Promise<StockReservationModel> {
    const res = this.reservations.get(id);
    if (!res) throw new NotFoundError(`Reservation '${id}' not found.`);
    if (res.version !== expectedVersion) {
      throw new ConflictError(`OCC conflict releasing reservation '${id}'.`);
    }
    const updated: StockReservationModel = {
      ...res,
      status: ReservationStatus.RELEASED,
      version: res.version + 1,
      updatedAt: new Date(),
    };
    this.reservations.set(id, updated);
    return { ...updated };
  }

  public async commit(id: string, expectedVersion: number, orderId: string): Promise<StockReservationModel> {
    const res = this.reservations.get(id);
    if (!res) throw new NotFoundError(`Reservation '${id}' not found.`);
    if (res.version !== expectedVersion) {
      throw new ConflictError(`OCC conflict committing reservation '${id}'.`);
    }
    const updated: StockReservationModel = {
      ...res,
      status: ReservationStatus.COMMITTED,
      orderId,
      version: res.version + 1,
      updatedAt: new Date(),
    };
    this.reservations.set(id, updated);
    return { ...updated };
  }

  public async expire(id: string, expectedVersion: number): Promise<StockReservationModel> {
    const res = this.reservations.get(id);
    if (!res) throw new NotFoundError(`Reservation '${id}' not found.`);
    const updated: StockReservationModel = {
      ...res,
      status: ReservationStatus.EXPIRED,
      version: res.version + 1,
      updatedAt: new Date(),
    };
    this.reservations.set(id, updated);
    return { ...updated };
  }

  public async findExpiredActiveReservations(cutoff: Date): Promise<StockReservationModel[]> {
    const result: StockReservationModel[] = [];
    for (const res of this.reservations.values()) {
      if (res.status === ReservationStatus.ACTIVE && new Date(res.expiresAt) <= cutoff) {
        result.push({ ...res });
      }
    }
    return result;
  }
}

class MockLedgerMovementRepository extends StockMovementRepository {
  public ledger: StockMovementModel[] = [];

  public async record(input: any): Promise<StockMovementModel> {
    const mvt: StockMovementModel = {
      id: `mov_${this.ledger.length + 1}_${Date.now()}`,
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
    this.ledger.push(mvt);
    return mvt;
  }

  public async list(): Promise<StockMovementModel[]> {
    return [...this.ledger];
  }
}

class MockOCCWarehouseRepository extends WarehouseRepository {
  public async findById(id: string): Promise<any> {
    return {
      id,
      name: 'Dhaka Central Hub',
      code: 'DHK-HUB-01',
      division: 'DHAKA',
      district: 'Dhaka',
      isPlatformHub: true,
      isActive: true,
      version: 1,
    };
  }
}

// ---------------------------------------------------------------------------
// Milestone 110 Test Suite
// ---------------------------------------------------------------------------

describe('Milestone 110: Overselling, Race-Condition, and Inventory Reconciliation Tests', () => {
  let inventoryService: InventoryService;
  let balanceRepo: MockOCCStockBalanceRepository;
  let reservationRepo: MockThreadSafeReservationRepository;
  let movementRepo: MockLedgerMovementRepository;
  let warehouseRepo: MockOCCWarehouseRepository;

  const warehouseId = 'wh_dhaka_01';
  const variantId = 'var_walton_s8';
  const stockBalanceId = 'stb_wh_dhaka_01_var_walton_s8';

  beforeEach(() => {
    balanceRepo = new MockOCCStockBalanceRepository();
    reservationRepo = new MockThreadSafeReservationRepository();
    movementRepo = new MockLedgerMovementRepository();
    warehouseRepo = new MockOCCWarehouseRepository();

    inventoryService = new InventoryService(
      balanceRepo,
      reservationRepo,
      movementRepo,
      warehouseRepo
    );

    // Initial stock setup: 10 units onHand, 0 reserved, 10 available
    balanceRepo.balances.set(stockBalanceId, {
      id: stockBalanceId,
      warehouseId,
      variantId,
      onHand: 10,
      reserved: 0,
      damaged: 0,
      quarantined: 0,
      available: 10,
      lowStockThreshold: 2,
      reorderPoint: 5,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  describe('1. High-Concurrency Flash Sale Overselling Protection', () => {
    it('prevents overselling when 50 concurrent buyers race for the last 10 units', async () => {
      // 50 concurrent buyers each attempting to reserve 1 unit simultaneously
      const buyerAttempts = Array.from({ length: 50 }, (_, i) => ({
        warehouseId,
        variantId,
        quantity: 1,
        cartId: `cart_buyer_${i + 1}`,
      }));

      // Fire all reservation requests in parallel
      const results = await Promise.allSettled(
        buyerAttempts.map((req) => inventoryService.reserveStock(req))
      );

      const successfulReservations = results.filter((r) => r.status === 'fulfilled');
      const rejectedReservations = results.filter((r) => r.status === 'rejected');

      // Assert exactly 10 reservations succeeded
      expect(successfulReservations.length).toBe(10);
      // Assert exactly 40 were rejected
      expect(rejectedReservations.length).toBe(40);

      // Verify the final balance state in repository
      const finalBalance = await balanceRepo.findById(stockBalanceId);
      expect(finalBalance).not.toBeNull();
      expect(finalBalance?.onHand).toBe(10);
      expect(finalBalance?.reserved).toBe(10);
      expect(finalBalance?.available).toBe(0); // Available must never be negative!

      // Core Invariant check: Available = OnHand - Reserved - Damaged - Quarantined >= 0
      const calculatedAvail =
        finalBalance!.onHand -
        finalBalance!.reserved -
        finalBalance!.damaged -
        finalBalance!.quarantined;
      expect(calculatedAvail).toBe(0);
      expect(finalBalance?.available).toBe(calculatedAvail);
    });

    it('rejects any reservation exceeding available balance in a single batch', async () => {
      // Attempting to reserve 15 units when only 10 are available
      expect(
        inventoryService.reserveStock({
          warehouseId,
          variantId,
          quantity: 15,
          cartId: 'cart_greedy_buyer',
        })
      ).rejects.toThrow(ConflictError);

      const balance = await balanceRepo.findById(stockBalanceId);
      expect(balance?.available).toBe(10);
      expect(balance?.reserved).toBe(0);
    });
  });

  describe('2. Race Condition on Release, Expiry, and Commit', () => {
    it('prevents double-release and double-commit through OCC and idempotency', async () => {
      // 1. Reserve 5 units
      const { reservation } = await inventoryService.reserveStock({
        warehouseId,
        variantId,
        quantity: 5,
        cartId: 'cart_race_01',
      });

      // 2. Commit the reservation
      const { reservation: committed, balance: committedBal } =
        await inventoryService.commitReservation({
          reservationId: reservation.id,
          orderId: 'ord_success_99',
        });

      expect(committed.status).toBe(ReservationStatus.COMMITTED);
      expect(committedBal.onHand).toBe(5);
      expect(committedBal.reserved).toBe(0);
      expect(committedBal.available).toBe(5);

      // 3. Attempt to release an already committed reservation (must throw ConflictError)
      expect(
        inventoryService.releaseReservation({
          reservationId: reservation.id,
          reason: 'Late release attempt after payment',
        })
      ).rejects.toThrow(ConflictError);

      // 4. Repeated commit of the same reservation succeeds idempotently
      const idempotentCommit = await inventoryService.commitReservation({
        reservationId: reservation.id,
        orderId: 'ord_success_99',
      });
      expect(idempotentCommit.reservation.status).toBe(ReservationStatus.COMMITTED);
      expect(idempotentCommit.balance.onHand).toBe(5);
    });
  });

  describe('3. Immutable Movement Ledger Reconciliation & Audit Verification', () => {
    it('reconciles complete inventory lifecycle with zero ledger discrepancies', async () => {
      // Lifecycle Step 1: Initial PO Intake of 50 units
      const { balance: balAfterIntake } = await inventoryService.receiveStock({
        warehouseId,
        variantId,
        quantity: 50,
        sourceType: SourceType.PURCHASE_ORDER,
        sourceId: 'PO-2026-AUDIT-01',
        reason: 'Bulk stock arrival',
      });
      expect(balAfterIntake.onHand).toBe(60); // 10 + 50
      expect(balAfterIntake.available).toBe(60);

      // Lifecycle Step 2: Customer checkout reservation of 10 units
      const { reservation } = await inventoryService.reserveStock({
        warehouseId,
        variantId,
        quantity: 10,
        cartId: 'cart_audit_session',
      });

      // Lifecycle Step 3: Payment confirmation & order commitment
      await inventoryService.commitReservation({
        reservationId: reservation.id,
        orderId: 'ORD-2026-RECON-01',
      });

      // Lifecycle Step 4: Quality damage audit adjustment (-2 units)
      await inventoryService.adjustStock(
        {
          stockBalanceId,
          movementType: MovementType.DAMAGE,
          quantityDelta: -2,
          reason: 'Dropped box during aisle restocking',
        },
        'usr_auditor_01'
      );

      // Lifecycle Step 5: RMA Customer return intake (+2 units into quarantine)
      await inventoryService.processRmaReturnIntake(
        {
          rmaNumber: 'RMA-AUDIT-001',
          orderId: 'ORD-2026-RECON-01',
          warehouseId,
          variantId,
          quantity: 2,
          initialDisposition: 'QUARANTINE_INSPECTION',
          customerReason: 'Product packaging inspection request',
        },
        'usr_returns_clerk'
      );

      // Lifecycle Step 6: Quarantine QC inspection passes (+2 released to available)
      await inventoryService.inspectQuarantinedReturn(
        {
          rmaNumber: 'RMA-AUDIT-001',
          stockBalanceId,
          quantity: 2,
          inspectionResult: 'PASSED_RESTOCK',
          inspectionNotes: 'Seals verified intact',
        },
        'usr_qc_inspector'
      );

      // Ledger Reconciliation Verification:
      const movements = await movementRepo.list();
      expect(movements.length).toBeGreaterThanOrEqual(6);

      // Verify every movement has valid audit attributes
      for (const mvt of movements) {
        expect(mvt.id).toBeDefined();
        expect(mvt.stockBalanceId).toBe(stockBalanceId);
        expect(mvt.warehouseId).toBe(warehouseId);
        expect(mvt.variantId).toBe(variantId);
        expect(mvt.movementType).toBeDefined();
        expect(mvt.quantityDelta).toBeDefined();
        expect(mvt.onHandAfter).toBeGreaterThanOrEqual(0);
        expect(mvt.availableAfter).toBeGreaterThanOrEqual(0);
        expect(mvt.createdAt).toBeInstanceOf(Date);
      }

      // Mathematical Ledger Invariant Verification:
      // Final balance from repository:
      const finalBal = await balanceRepo.findById(stockBalanceId);
      expect(finalBal).not.toBeNull();

      // OnHand = Available + Reserved + Damaged + Quarantined
      expect(finalBal!.onHand).toBe(
        finalBal!.available + finalBal!.reserved + finalBal!.damaged + finalBal!.quarantined
      );

      // OnHand: 10 (initial) + 50 (intake) - 10 (commit) - 2 (damage) + 2 (return) = 50
      expect(finalBal?.onHand).toBe(50);
      expect(finalBal?.damaged).toBe(2);
      expect(finalBal?.reserved).toBe(0);
      expect(finalBal?.quarantined).toBe(0);
      expect(finalBal?.available).toBe(48); // 50 - 2 = 48
    });
  });
});
