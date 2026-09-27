import { describe, expect, it, beforeEach } from 'bun:test';
import { InventoryService } from '@/features/inventory/services/inventory-service';
import { StockBalanceRepository } from '@/features/inventory/repositories/stock-balance-repository';
import { StockReservationRepository } from '@/features/inventory/repositories/stock-reservation-repository';
import { StockMovementRepository } from '@/features/inventory/repositories/stock-movement-repository';
import { WarehouseRepository } from '@/features/inventory/repositories/warehouse-repository';
import { StockBalanceModel } from '@/features/inventory/types';

class MockWarehouseRepo extends WarehouseRepository {}
class MockStockBalanceRepo extends StockBalanceRepository {
  public balances: StockBalanceModel[] = [
    {
      id: 'stb_001',
      warehouseId: 'wh_001',
      variantId: 'var_001',
      onHand: 100,
      reserved: 20,
      damaged: 5,
      quarantined: 5,
      available: 70,
      lowStockThreshold: 10,
      reorderPoint: 20,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'stb_002',
      warehouseId: 'wh_001',
      variantId: 'var_002',
      onHand: 4,
      reserved: 0,
      damaged: 0,
      quarantined: 0,
      available: 4,
      lowStockThreshold: 10,
      reorderPoint: 20,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  public async findMany(options?: { sellerId?: string }): Promise<StockBalanceModel[]> {
    return this.balances;
  }
}

class MockReservationRepo extends StockReservationRepository {}
class MockMovementRepo extends StockMovementRepository {}

describe('Milestone 109 - Inventory Workspace Summary Unit Tests', () => {
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
  });

  it('should calculate accurate inventory workspace totals and alert metrics', async () => {
    const summary = await inventoryService.getWorkspaceSummary();

    expect(summary.totalSKUs).toBe(2);
    expect(summary.totalOnHand).toBe(104);
    expect(summary.totalReserved).toBe(20);
    expect(summary.totalAvailable).toBe(74);
    expect(summary.totalDamaged).toBe(5);
    expect(summary.totalQuarantined).toBe(5);
    expect(summary.lowStockCount).toBe(1); // stb_002 available (4) <= threshold (10)
  });
});
