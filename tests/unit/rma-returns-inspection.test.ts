import { describe, expect, it, beforeEach } from 'bun:test';
import { InventoryService } from '@/features/inventory/services/inventory-service';
import { StockBalanceRepository } from '@/features/inventory/repositories/stock-balance-repository';
import { StockReservationRepository } from '@/features/inventory/repositories/stock-reservation-repository';
import { StockMovementRepository } from '@/features/inventory/repositories/stock-movement-repository';
import { WarehouseRepository } from '@/features/inventory/repositories/warehouse-repository';
import { StockBalanceModel, calculateAvailableStock } from '@/features/inventory/types';
import { ConflictError, NotFoundError } from '@/shared/errors/app-error';

class MockWarehouseRepo extends WarehouseRepository {
  public async findById(id: string): Promise<any> {
    return {
      id,
      name: 'Banani Depot',
      code: 'DHK-DTH-01',
      division: 'DHAKA',
      district: 'Dhaka',
      isPlatformHub: false,
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
    return newBal;
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
    if (!current) throw new NotFoundError(`Stock balance ${id} not found`);

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

class MockReservationRepo extends StockReservationRepository {}
class MockMovementRepo extends StockMovementRepository {
  public movements: any[] = [];
  public async record(input: any): Promise<any> {
    const mvt = { id: `mvt_${Math.random().toString(36).substring(2, 8)}`, ...input, createdAt: new Date() };
    this.movements.push(mvt);
    return mvt;
  }
}

describe('Milestone 108 - Return Restocking, Inspection, and Quarantine Unit Tests', () => {
  let inventoryService: InventoryService;
  let balanceRepo: MockStockBalanceRepo;

  beforeEach(() => {
    const warehouseRepo = new MockWarehouseRepo();
    balanceRepo = new MockStockBalanceRepo();
    const reservationRepo = new MockReservationRepo();
    const movementRepo = new MockMovementRepo();

    inventoryService = new InventoryService(
      balanceRepo,
      reservationRepo,
      movementRepo,
      warehouseRepo
    );

    balanceRepo.balances.set('stb_wh_001_var_001', {
      id: 'stb_wh_001_var_001',
      warehouseId: 'wh_001',
      variantId: 'var_001',
      onHand: 10,
      reserved: 0,
      damaged: 0,
      quarantined: 0,
      available: 10,
      lowStockThreshold: 5,
      reorderPoint: 10,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it('should receive RMA return with QUARANTINE_INSPECTION disposition and increment quarantined stock', async () => {
    const { rmaRecord, balance } = await inventoryService.processRmaReturnIntake(
      {
        rmaNumber: 'RMA-999-01',
        orderId: 'ORD-101',
        warehouseId: 'wh_001',
        variantId: 'var_001',
        quantity: 5,
        initialDisposition: 'QUARANTINE_INSPECTION',
        customerReason: 'Customer reported box packaging dent',
      },
      'usr_intake_001'
    );

    expect(rmaRecord.status).toBe('RECEIVED');
    expect(balance.quarantined).toBe(5);
    expect(balance.available).toBe(10); // Available stock unchanged while in quarantine
  });

  it('should inspect quarantined returned items and restock passed items into available inventory', async () => {
    // 1. Process intake to quarantine 5 units
    await inventoryService.processRmaReturnIntake(
      {
        rmaNumber: 'RMA-999-02',
        orderId: 'ORD-102',
        warehouseId: 'wh_001',
        variantId: 'var_001',
        quantity: 5,
        initialDisposition: 'QUARANTINE_INSPECTION',
      },
      'usr_intake_001'
    );

    // 2. Perform QC inspection: PASSED_RESTOCK
    const { balance } = await inventoryService.inspectQuarantinedReturn(
      {
        rmaNumber: 'RMA-999-02',
        stockBalanceId: 'stb_wh_001_var_001',
        quantity: 5,
        inspectionResult: 'PASSED_RESTOCK',
        inspectionNotes: 'Unopened seal verified pristine',
      },
      'usr_inspector_001'
    );

    expect(balance.quarantined).toBe(0);
    expect(balance.onHand).toBe(15);
    expect(balance.available).toBe(15);
  });

  it('should move failed quarantine inspection items to damaged balance', async () => {
    // 1. Process intake to quarantine 3 units
    await inventoryService.processRmaReturnIntake(
      {
        rmaNumber: 'RMA-999-03',
        orderId: 'ORD-103',
        warehouseId: 'wh_001',
        variantId: 'var_001',
        quantity: 3,
        initialDisposition: 'QUARANTINE_INSPECTION',
      },
      'usr_intake_001'
    );

    // 2. Perform QC inspection: FAILED_DAMAGED
    const { balance } = await inventoryService.inspectQuarantinedReturn(
      {
        rmaNumber: 'RMA-999-03',
        stockBalanceId: 'stb_wh_001_var_001',
        quantity: 3,
        inspectionResult: 'FAILED_DAMAGED',
        inspectionNotes: 'Internal water exposure damage detected',
      },
      'usr_inspector_001'
    );

    expect(balance.quarantined).toBe(0);
    expect(balance.damaged).toBe(3);
  });

  it('should directly restock pristine returned merchandise into available inventory', async () => {
    const { balance, movement } = await inventoryService.restockReturnedItem(
      {
        rmaNumber: 'RMA-999-04',
        stockBalanceId: 'stb_wh_001_var_001',
        quantity: 4,
        reason: 'Direct customer seal-intact return restock',
      },
      'usr_restocker_001'
    );

    expect(balance.onHand).toBe(14);
    expect(balance.available).toBe(14);
    expect(movement.movementType).toBe('RETURN');
  });
});
