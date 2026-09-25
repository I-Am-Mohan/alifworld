import { describe, it, expect } from 'bun:test';
import { StockMovementRepository } from '@/features/inventory/repositories/stock-movement-repository';
import { InventoryPolicy } from '@/shared/authz/policies/inventory.policy';
import { ActorContext } from '@/shared/authz/authz.types';
import { MovementType, SourceType } from '@/features/inventory/types';

describe('Milestone 103: Immutable Stock Movement Ledger Unit Tests', () => {
  const adminActor: ActorContext = {
    userId: 'usr-admin-001',
    roles: ['ADMIN'],
    permissions: ['*'],
    sellerId: null,
  };

  const sellerActorA: ActorContext = {
    userId: 'usr-seller-a',
    roles: ['SELLER_OWNER'],
    permissions: ['inventory:read'],
    sellerId: 'sel-store-aaaa-1111',
  };

  describe('1. Ledger Immutability & Method Guarantees', () => {
    it('verifies StockMovementRepository exposes zero mutation methods (update/delete)', () => {
      const repo = new StockMovementRepository() as any;
      expect(repo.update).toBeUndefined();
      expect(repo.delete).toBeUndefined();
      expect(repo.softDelete).toBeUndefined();
    });

    it('records an append-only stock movement entry with exact snapshot values', async () => {
      const mockPrisma: any = {
        stockMovementLedger: {
          create: async (args: any) => ({
            id: 'sm_001',
            ...args.data,
            createdAt: new Date('2026-09-26T12:00:00Z'),
          }),
        },
      };

      const repo = new StockMovementRepository(mockPrisma);

      const movement = await repo.record({
        stockBalanceId: 'sb_100',
        warehouseId: 'wh_dhk_01',
        variantId: 'var_500',
        movementType: MovementType.RECEIVE,
        quantityDelta: 50,
        onHandAfter: 150,
        reservedAfter: 20,
        availableAfter: 130,
        sourceType: SourceType.PURCHASE_ORDER,
        sourceId: 'po_9988',
        actorId: 'usr-admin-001',
        reason: 'Initial stock intake',
      });

      expect(movement.id).toContain('mov_');
      expect(movement.movementType).toBe('RECEIVE');
      expect(movement.quantityDelta).toBe(50);
      expect(movement.onHandAfter).toBe(150);
      expect(movement.reservedAfter).toBe(20);
      expect(movement.availableAfter).toBe(130);
      expect(movement.sourceType).toBe('PURCHASE_ORDER');
    });
  });

  describe('2. Ledger Pagination & Tenant Scoping', () => {
    it('queries paginated movement records with seller tenant filtering', async () => {
      const mockMovements = [
        {
          id: 'sm_001',
          stockBalanceId: 'sb_100',
          warehouseId: 'wh_dhk_01',
          variantId: 'var_500',
          movementType: 'RECEIVE',
          quantityDelta: 50,
          onHandAfter: 150,
          reservedAfter: 20,
          availableAfter: 130,
          sourceType: 'PURCHASE_ORDER',
          sourceId: 'po_9988',
          actorId: 'usr-admin-001',
          reason: 'Initial stock intake',
          createdAt: new Date('2026-09-26T12:00:00Z'),
        },
      ];

      let passedWhere: any = null;

      const mockPrisma: any = {
        stockMovementLedger: {
          findMany: async (args: any) => {
            passedWhere = args.where;
            return mockMovements;
          },
          count: async () => 1,
        },
      };

      const repo = new StockMovementRepository(mockPrisma);
      const result = await repo.listPaginated({
        sellerId: 'sel-store-aaaa-1111',
        page: 1,
        limit: 20,
      });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(passedWhere.variant.product.sellerId).toBe('sel-store-aaaa-1111');
    });

    it('enforces InventoryPolicy read restrictions for seller movement ledger queries', () => {
      expect(InventoryPolicy.canReadInventory(adminActor, { sellerId: 'sel-store-aaaa-1111' })).toBe(true);
      expect(InventoryPolicy.canReadInventory(sellerActorA, { sellerId: 'sel-store-aaaa-1111' })).toBe(true);
      expect(InventoryPolicy.canReadInventory(sellerActorA, { sellerId: 'sel-store-bbbb-2222' })).toBe(false);
    });
  });
});
