import { describe, it, expect, beforeEach } from 'bun:test';
import { InventoryService } from '@/features/inventory/services/inventory-service';
import { ConflictError, NotFoundError } from '@/shared/errors/app-error';
import { ReservationStatus } from '@/features/inventory/types';

describe('Milestone 104: Atomic Stock Reservation & Concurrency Protection Unit Tests', () => {
  let mockBalanceRepo: any;
  let mockReservationRepo: any;
  let mockMovementRepo: any;
  let mockWarehouseRepo: any;
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
    onHand: 10,
    reserved: 0,
    damaged: 0,
    quarantined: 0,
    available: 10,
    lowStockThreshold: 2,
    reorderPoint: 5,
    version: 1,
    warehouse: mockWarehouse,
    variant: {
      id: 'var-100',
      sku: 'SKU-LIMITED-EDITION',
      title: 'Limited Edition Sneakers',
      product: {
        id: 'prod-900',
        title: 'Sneakers',
        sellerId: 'sel-store-aaaa-1111',
      },
    },
  };

  const mockReservation = {
    id: 'res-1001',
    stockBalanceId: 'sb-001',
    quantity: 2,
    cartId: 'cart-session-abc',
    orderId: null,
    status: ReservationStatus.ACTIVE,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    stockBalance: mockStockBalance,
  };

  beforeEach(() => {
    mockWarehouseRepo = {
      findById: async (id: string) => (id === 'wh-dhk-01' ? mockWarehouse : null),
    };

    mockBalanceRepo = {
      findById: async (id: string) => (id === 'sb-001' ? mockStockBalance : null),
      findByWarehouseAndVariant: async (wId: string, vId: string) =>
        wId === 'wh-dhk-01' && vId === 'var-100' ? mockStockBalance : null,
      atomicUpdate: async (id: string, expectedVersion: number, deltas: any) => {
        const reserved = mockStockBalance.reserved + (deltas.reservedDelta ?? 0);
        const available = mockStockBalance.onHand - reserved;
        if (available < 0) {
          throw new ConflictError('Insufficient stock available');
        }
        return {
          ...mockStockBalance,
          reserved,
          available,
          version: expectedVersion + 1,
        };
      },
    };

    mockReservationRepo = {
      findExistingActiveReservation: async () => null,
      create: async (data: any) => ({
        id: 'res-new-01',
        ...data,
        status: ReservationStatus.ACTIVE,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      findById: async () => null,
    };

    mockMovementRepo = {
      record: async (data: any) => ({ id: 'mov-res-01', ...data, createdAt: new Date() }),
    };

    service = new InventoryService(
      mockBalanceRepo as any,
      mockReservationRepo as any,
      mockMovementRepo as any,
      mockWarehouseRepo as any
    );
  });

  describe('1. Atomic Reservation & Overselling Protection', () => {
    it('reserves available stock atomically for checkout and increments reserved count', async () => {
      const result = await service.reserveStock({
        warehouseId: 'wh-dhk-01',
        variantId: 'var-100',
        quantity: 2,
        cartId: 'cart-session-abc',
        ttlMinutes: 15,
      });

      expect(result.reservation).toBeDefined();
      expect(result.reservation.quantity).toBe(2);
      expect(result.balance.reserved).toBe(2);
      expect(result.balance.available).toBe(8); // 10 - 2 = 8
    });

    it('rejects reservation attempt with ConflictError when requested quantity exceeds available stock', async () => {
      expect(
        service.reserveStock({
          warehouseId: 'wh-dhk-01',
          variantId: 'var-100',
          quantity: 15, // Only 10 available!
          cartId: 'cart-session-excess',
        })
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('2. Idempotent Retry Handling', () => {
    it('returns existing active reservation idempotently when retried with same cart reference', async () => {
      mockReservationRepo.findExistingActiveReservation = async () => mockReservation;

      const result = await service.reserveStock({
        warehouseId: 'wh-dhk-01',
        variantId: 'var-100',
        quantity: 2,
        cartId: 'cart-session-abc',
      });

      expect(result.reservation.id).toBe('res-1001');
      expect(result.reservation.quantity).toBe(2);
    });
  });

  describe('3. Concurrency Protection & OCC Retry Loop', () => {
    it('retries atomic update up to 3 times on concurrency collision before succeeding', async () => {
      let attempts = 0;
      mockBalanceRepo.atomicUpdate = async (id: string, expectedVersion: number, deltas: any) => {
        attempts++;
        if (attempts === 1) {
          throw new ConflictError('Optimistic concurrency conflict');
        }
        return {
          ...mockStockBalance,
          reserved: 3,
          available: 7,
          version: expectedVersion + 1,
        };
      };

      const result = await service.reserveStock({
        warehouseId: 'wh-dhk-01',
        variantId: 'var-100',
        quantity: 3,
        cartId: 'cart-session-concurrency',
      });

      expect(attempts).toBe(2); // Failed on 1st attempt, succeeded on 2nd retry
      expect(result.balance.reserved).toBe(3);
    });
  });
});
