import { describe, expect, it, beforeEach } from 'bun:test';
import { InventoryService } from '@/features/inventory/services/inventory-service';
import { StockBalanceRepository } from '@/features/inventory/repositories/stock-balance-repository';
import { StockReservationRepository } from '@/features/inventory/repositories/stock-reservation-repository';
import { StockMovementRepository } from '@/features/inventory/repositories/stock-movement-repository';
import { WarehouseRepository } from '@/features/inventory/repositories/warehouse-repository';
import { StockBalanceModel, calculateAvailableStock } from '@/features/inventory/types';
import { ConflictError, NotFoundError, ValidationError } from '@/shared/errors/app-error';

class MockWarehouseRepo extends WarehouseRepository {
  public async findById(id: string): Promise<any> {
    return {
      id,
      name: 'Warehouse Facility',
      code: 'WH-001',
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
    const mvt = {
      id: `mvt_${Math.random().toString(36).substring(2, 8)}`,
      ...input,
      createdAt: new Date(),
    };
    this.movements.push(mvt);
    return mvt;
  }
}

describe('Milestone 107 - Stock Transfers & Maker-Checker Approvals Unit Tests', () => {
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

    // Seed stock balances
    balanceRepo.balances.set('stb_wh_001_var_001', {
      id: 'stb_wh_001_var_001',
      warehouseId: 'wh_001',
      variantId: 'var_001',
      onHand: 50,
      reserved: 0,
      damaged: 0,
      quarantined: 0,
      available: 50,
      lowStockThreshold: 10,
      reorderPoint: 20,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it('should initiate stock transfer, deduct source stock, and receive it at destination', async () => {
    // 1. Initiate transfer of 20 units from wh_001 to wh_002
    const { transfer, sourceBalance } = await inventoryService.transferStock(
      {
        fromWarehouseId: 'wh_001',
        toWarehouseId: 'wh_002',
        variantId: 'var_001',
        quantity: 20,
        reason: 'Store replenishment',
      },
      'usr_maker_001'
    );

    expect(transfer.status).toBe('IN_TRANSIT');
    expect(sourceBalance.onHand).toBe(30);

    // 2. Receive transfer at destination
    const { transfer: completed, destBalance } = await inventoryService.receiveStockTransfer(
      {
        transferId: transfer.id,
      },
      'usr_receiver_002'
    );

    expect(completed.status).toBe('COMPLETED');
    expect(destBalance.onHand).toBe(20);
    expect(destBalance.warehouseId).toBe('wh_002');
  });

  it('should throw ValidationError if source and destination warehouses are identical', async () => {
    expect(
      inventoryService.transferStock(
        {
          fromWarehouseId: 'wh_001',
          toWarehouseId: 'wh_001',
          variantId: 'var_001',
          quantity: 5,
        },
        'usr_maker_001'
      )
    ).rejects.toThrow(ValidationError);
  });

  it('should auto-approve small physical count variances (<= 10 units)', async () => {
    const { correction, balance } = await inventoryService.submitStockCountCorrection(
      {
        countSessionId: 'cnt_001',
        stockBalanceId: 'stb_wh_001_var_001',
        countedQuantity: 45, // Current onHand: 50, variance: -5
        reason: 'Minor stock count adjustment',
      },
      'usr_maker_001'
    );

    expect(correction.requiresApproval).toBe(false);
    expect(correction.status).toBe('APPROVED');
    expect(balance?.onHand).toBe(45);
  });

  it('should flag high physical count variances (> 10 units) for Maker-Checker Dual Approval', async () => {
    const { correction } = await inventoryService.submitStockCountCorrection(
      {
        countSessionId: 'cnt_001',
        stockBalanceId: 'stb_wh_001_var_001',
        countedQuantity: 30, // Current onHand: 50, variance: -20 (> 10 units)
        reason: 'Significant damage write-off',
      },
      'usr_maker_001'
    );

    expect(correction.requiresApproval).toBe(true);
    expect(correction.status).toBe('PENDING_APPROVAL');
    // Balance not yet updated
    expect(balanceRepo.balances.get('stb_wh_001_var_001')?.onHand).toBe(50);
  });

  it('should enforce Maker-Checker invariant: Submitter (Maker) CANNOT approve their own correction', async () => {
    const { correction } = await inventoryService.submitStockCountCorrection(
      {
        countSessionId: 'cnt_001',
        stockBalanceId: 'stb_wh_001_var_001',
        countedQuantity: 30,
        reason: 'Significant damage write-off',
      },
      'usr_maker_001'
    );

    // Attempt approval by same user (usr_maker_001)
    expect(
      inventoryService.approveStockCountCorrection(
        {
          correctionId: correction.id,
          approved: true,
        },
        'usr_maker_001'
      )
    ).rejects.toThrow(ConflictError);
  });

  it('should allow separate Admin (Checker) to approve pending high-variance correction', async () => {
    const { correction } = await inventoryService.submitStockCountCorrection(
      {
        countSessionId: 'cnt_001',
        stockBalanceId: 'stb_wh_001_var_001',
        countedQuantity: 30,
        reason: 'Significant damage write-off',
      },
      'usr_maker_001'
    );

    // Approval by separate checker (usr_checker_admin_002)
    const { correction: approved, balance } = await inventoryService.approveStockCountCorrection(
      {
        correctionId: correction.id,
        approved: true,
      },
      'usr_checker_admin_002'
    );

    expect(approved.status).toBe('APPROVED');
    expect(approved.approvedBy).toBe('usr_checker_admin_002');
    expect(balance?.onHand).toBe(30);
  });
});
