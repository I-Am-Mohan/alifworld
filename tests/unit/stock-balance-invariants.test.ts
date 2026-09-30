import { describe, it, expect, beforeEach } from 'bun:test';
import { calculateAvailableStock } from '@/features/inventory/types';
import { InventoryPolicy } from '@/shared/authz/policies/inventory.policy';
import { ActorContext } from '@/shared/authz/authz.types';
import { InventoryService } from '@/features/inventory/services/inventory-service';
import {
  ConflictError,
  ValidationError,
  NotFoundError,
  AuthorizationError,
} from '@/shared/errors/app-error';

describe('Milestone 102: Stock Balance Invariants & Inventory Service Unit Tests', () => {
  const adminActor: ActorContext = {
    userId: 'usr-admin-001',
    roles: ['ADMIN'],
    permissions: ['*'],
    sellerId: null,
  };

  const sellerActorA: ActorContext = {
    userId: 'usr-seller-a',
    roles: ['SELLER_OWNER'],
    permissions: ['inventory:read', 'inventory:write'],
    sellerId: 'sel-store-aaaa-1111',
  };

  const sellerActorB: ActorContext = {
    userId: 'usr-seller-b',
    roles: ['SELLER_OWNER'],
    permissions: ['inventory:read', 'inventory:write'],
    sellerId: 'sel-store-bbbb-2222',
  };

  const customerActor: ActorContext = {
    userId: 'usr-customer-001',
    roles: ['CUSTOMER'],
    permissions: [],
    sellerId: null,
  };

  describe('1. Pure Available Stock Invariant Calculation', () => {
    it('calculates Available = OnHand - Reserved - Damaged - Quarantined correctly', () => {
      const available = calculateAvailableStock({
        onHand: 100,
        reserved: 20,
        damaged: 5,
        quarantined: 15,
      });

      expect(available).toBe(60); // 100 - 20 - 5 - 15 = 60
    });

    it('clamps Available to 0 if subtraction yields negative value', () => {
      const available = calculateAvailableStock({
        onHand: 10,
        reserved: 10,
        damaged: 5,
        quarantined: 5,
      });

      expect(available).toBe(0); // Math.max(0, -10) = 0
    });
  });

  describe('2. InventoryPolicy Authorization & Scoping', () => {
    it('allows ADMIN to read and manage all inventory stock balances', () => {
      expect(
        InventoryPolicy.canReadInventory(adminActor, { sellerId: 'sel-store-aaaa-1111' })
      ).toBe(true);
      expect(
        InventoryPolicy.canManageInventory(adminActor, { sellerId: 'sel-store-aaaa-1111' })
      ).toBe(true);
    });

    it('allows SELLER to read and manage stock balances for own seller store', () => {
      expect(
        InventoryPolicy.canReadInventory(sellerActorA, { sellerId: 'sel-store-aaaa-1111' })
      ).toBe(true);
      expect(
        InventoryPolicy.canManageInventory(sellerActorA, { sellerId: 'sel-store-aaaa-1111' })
      ).toBe(true);
    });

    it('prohibits SELLER from managing inventory for another seller tenant', () => {
      expect(
        InventoryPolicy.canManageInventory(sellerActorA, { sellerId: 'sel-store-bbbb-2222' })
      ).toBe(false);
    });

    it('prohibits CUSTOMER from reading or managing inventory', () => {
      expect(InventoryPolicy.canReadInventory(customerActor)).toBe(false);
      expect(InventoryPolicy.canManageInventory(customerActor)).toBe(false);
    });
  });

  describe('3. InventoryService Stock Intake & Adjustments', () => {
    let mockBalanceRepo: any;
    let mockWarehouseRepo: any;
    let mockMovementRepo: any;
    let mockReservationRepo: any;
    let service: InventoryService;

    const mockWarehouse = {
      id: 'wh-dhk-01',
      sellerId: 'sel-store-aaaa-1111',
      name: 'Dhaka Central Facility',
      code: 'DHK-HUB-01',
      division: 'DHAKA',
      district: 'Dhaka',
      addressLine: 'Tejgaon Area',
      isPlatformHub: true,
      isActive: true,
      version: 1,
    };

    const mockStockBalance = {
      id: 'sb-001',
      warehouseId: 'wh-dhk-01',
      variantId: 'var-100',
      onHand: 50,
      reserved: 10,
      damaged: 2,
      quarantined: 3,
      available: 35, // 50 - 10 - 2 - 3 = 35
      lowStockThreshold: 5,
      reorderPoint: 10,
      version: 1,
      warehouse: mockWarehouse,
      variant: {
        id: 'var-100',
        sku: 'SKU-SHIRT-M',
        title: 'Shirt Medium',
        product: {
          id: 'prod-500',
          title: 'Cotton Shirt',
          sellerId: 'sel-store-aaaa-1111',
        },
      },
    };

    beforeEach(() => {
      mockWarehouseRepo = {
        findById: async (id: string) => (id === 'wh-dhk-01' ? mockWarehouse : null),
      };

      mockBalanceRepo = {
        findById: async (id: string) => (id === 'sb-001' ? mockStockBalance : null),
        findByWarehouseAndVariant: async (wId: string, vId: string) =>
          wId === 'wh-dhk-01' && vId === 'var-100' ? mockStockBalance : null,
        getOrCreate: async (wId: string, vId: string) => mockStockBalance,
        atomicUpdate: async (id: string, expectedVersion: number, deltas: any) => {
          if (expectedVersion !== mockStockBalance.version) {
            throw new ConflictError('Optimistic concurrency conflict');
          }
          const onHand = mockStockBalance.onHand + (deltas.onHandDelta ?? 0);
          const reserved = mockStockBalance.reserved + (deltas.reservedDelta ?? 0);
          const damaged = mockStockBalance.damaged + (deltas.damagedDelta ?? 0);
          const quarantined = mockStockBalance.quarantined + (deltas.quarantinedDelta ?? 0);

          if (onHand < 0 || reserved < 0 || damaged < 0 || quarantined < 0) {
            throw new ConflictError('Negative stock balance invariant violation');
          }

          const available = onHand - reserved - damaged - quarantined;
          if (available < 0) {
            throw new ConflictError('Insufficient available stock');
          }

          return {
            ...mockStockBalance,
            onHand,
            reserved,
            damaged,
            quarantined,
            available,
            version: expectedVersion + 1,
          };
        },
        findMany: async () => [mockStockBalance],
      };

      mockMovementRepo = {
        record: async (data: any) => ({ id: 'mov-001', ...data, createdAt: new Date() }),
        list: async () => [],
      };

      mockReservationRepo = {
        create: async () => {},
        findById: async () => null,
      };

      service = new InventoryService(
        mockBalanceRepo as any,
        mockReservationRepo as any,
        mockMovementRepo as any,
        mockWarehouseRepo as any
      );
    });

    it('receives stock intake and increases onHand and available stock', async () => {
      const result = await service.receiveStock(
        {
          warehouseId: 'wh-dhk-01',
          variantId: 'var-100',
          quantity: 20,
          sourceType: 'PURCHASE_ORDER',
          sourceId: 'po-9988',
          reason: 'Initial stock load',
        },
        adminActor.userId
      );

      expect(result.balance.onHand).toBe(70); // 50 + 20
      expect(result.balance.available).toBe(55); // 35 + 20
    });

    it('transfers stock to quarantine reducing available inventory', async () => {
      const result = await service.quarantineStock(
        {
          stockBalanceId: 'sb-001',
          action: 'QUARANTINE',
          quantity: 10,
          reason: 'Quality inspection on arrival',
        },
        adminActor.userId
      );

      expect(result.balance.quarantined).toBe(13); // 3 + 10
      expect(result.balance.available).toBe(25); // 35 - 10
    });

    it('releases quarantined stock back to available stock', async () => {
      const result = await service.quarantineStock(
        {
          stockBalanceId: 'sb-001',
          action: 'RELEASE_TO_AVAILABLE',
          quantity: 2,
          reason: 'Inspection passed',
        },
        adminActor.userId
      );

      expect(result.balance.quarantined).toBe(1); // 3 - 2
      expect(result.balance.available).toBe(37); // 35 + 2
    });

    it('prevents releasing more quarantined stock than currently quarantined', async () => {
      expect(
        service.quarantineStock(
          {
            stockBalanceId: 'sb-001',
            action: 'RELEASE_TO_AVAILABLE',
            quantity: 50, // Only 3 quarantined
            reason: 'Excess release test',
          },
          adminActor.userId
        )
      ).rejects.toThrow(ConflictError);
    });
  });
});
