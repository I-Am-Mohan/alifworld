import { describe, expect, it, beforeEach } from 'bun:test';
import { InventoryService } from '@/features/inventory/services/inventory-service';
import { StockBalanceRepository } from '@/features/inventory/repositories/stock-balance-repository';
import { StockReservationRepository } from '@/features/inventory/repositories/stock-reservation-repository';
import { StockMovementRepository } from '@/features/inventory/repositories/stock-movement-repository';
import { WarehouseRepository } from '@/features/inventory/repositories/warehouse-repository';
import { StockBalanceModel, calculateAvailableStock } from '@/features/inventory/types';
import { NotFoundError } from '@/shared/errors/app-error';

class MockWarehouseRepo extends WarehouseRepository {
  public async findById(id: string): Promise<any> {
    return {
      id,
      name: 'Dhaka Tech Hub',
      code: 'DHK-HUB-01',
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

  public async findMany(options?: {
    warehouseId?: string;
    variantId?: string;
    sellerId?: string;
    lowStockOnly?: boolean;
  }): Promise<StockBalanceModel[]> {
    let result = Array.from(this.balances.values());

    if (options?.warehouseId) {
      result = result.filter((b) => b.warehouseId === options.warehouseId);
    }
    if (options?.lowStockOnly) {
      result = result.filter((b) => b.available <= b.lowStockThreshold);
    }

    return result;
  }

  public async updateThresholds(
    id: string,
    lowStockThreshold: number,
    reorderPoint: number
  ): Promise<StockBalanceModel> {
    const current = this.balances.get(id);
    if (!current) throw new NotFoundError(`Stock balance ${id} not found`);

    const updated: StockBalanceModel = {
      ...current,
      lowStockThreshold,
      reorderPoint,
      version: current.version + 1,
      updatedAt: new Date(),
    };

    this.balances.set(id, updated);
    return updated;
  }
}

class MockReservationRepo extends StockReservationRepository {}
class MockMovementRepo extends StockMovementRepository {}

describe('Milestone 106 - Low-Stock Thresholds & Reorder Recommendations Unit Tests', () => {
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

    // Seed test stock balances
    balanceRepo.balances.set('stb_wh_001_var_001', {
      id: 'stb_wh_001_var_001',
      warehouseId: 'wh_001',
      variantId: 'var_001',
      onHand: 4,
      reserved: 2,
      damaged: 0,
      quarantined: 0,
      available: 2,
      lowStockThreshold: 10,
      reorderPoint: 20,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    balanceRepo.balances.set('stb_wh_001_var_002', {
      id: 'stb_wh_001_var_002',
      warehouseId: 'wh_001',
      variantId: 'var_002',
      onHand: 100,
      reserved: 5,
      damaged: 0,
      quarantined: 0,
      available: 95,
      lowStockThreshold: 10,
      reorderPoint: 20,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it('should list items currently triggering low stock alerts (available <= lowStockThreshold)', async () => {
    const alerts = await inventoryService.listLowStockAlerts({ warehouseId: 'wh_001' });

    expect(alerts.length).toBe(1);
    expect(alerts[0].id).toBe('stb_wh_001_var_001');
    expect(alerts[0].available).toBe(2);
    expect(alerts[0].lowStockThreshold).toBe(10);
  });

  it('should update stock balance thresholds and recalculate low stock state', async () => {
    const updated = await inventoryService.updateStockThresholds({
      stockBalanceId: 'stb_wh_001_var_002',
      lowStockThreshold: 100,
      reorderPoint: 150,
    });

    expect(updated.lowStockThreshold).toBe(100);
    expect(updated.reorderPoint).toBe(150);

    const alerts = await inventoryService.listLowStockAlerts({ warehouseId: 'wh_001' });
    expect(alerts.length).toBe(2);
  });

  it('should generate calculated reorder recommendations with correct urgency classification', async () => {
    const recs = await inventoryService.getReorderRecommendations({ warehouseId: 'wh_001' });

    expect(recs.length).toBe(1);
    expect(recs[0].stockBalance.id).toBe('stb_wh_001_var_001');
    expect(recs[0].currentAvailable).toBe(2);
    expect(recs[0].reorderPoint).toBe(20);
    // Recommended qty = Math.max(reorderPoint * 2 - available, reorderPoint) = 40 - 2 = 38
    expect(recs[0].recommendedReorderQuantity).toBe(38);
    expect(recs[0].urgency).toBe('HIGH');
  });
});
