import { describe, it, expect, beforeEach, spyOn } from 'bun:test';
import * as authzModule from '@/shared/authz';
import { POST as reserveRoute } from '@/app/api/v1/inventory/reserve/route';
import { POST as releaseRoute } from '@/app/api/v1/inventory/release/route';
import { POST as commitRoute } from '@/app/api/v1/inventory/commit/route';
import { GET as getMovementsRoute } from '@/app/api/v1/inventory/movements/route';
import { InventoryService } from '@/features/inventory/services/inventory-service';
import { NextRequest } from 'next/server';

describe('Milestone 110: Overselling & Ledger Reconciliation API Integration Tests', () => {
  const sellerActor = {
    userId: 'usr-seller-001',
    roles: ['SELLER_ADMIN'],
    permissions: ['*'],
    sellerId: 'sel_tech_001',
  };

  const mockStockBalance = {
    id: 'stb_dhk_001',
    warehouseId: 'wh_dhk_001',
    variantId: 'var_001',
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
  };

  const mockMovements = [
    {
      id: 'mov_intake_001',
      stockBalanceId: 'stb_dhk_001',
      warehouseId: 'wh_dhk_001',
      variantId: 'var_001',
      movementType: 'RECEIVE',
      quantityDelta: 10,
      onHandAfter: 10,
      reservedAfter: 0,
      availableAfter: 10,
      sourceType: 'PURCHASE_ORDER',
      sourceId: 'PO-001',
      createdAt: new Date(),
    },
    {
      id: 'mov_reserve_001',
      stockBalanceId: 'stb_dhk_001',
      warehouseId: 'wh_dhk_001',
      variantId: 'var_001',
      movementType: 'RESERVE',
      quantityDelta: -2,
      onHandAfter: 10,
      reservedAfter: 2,
      availableAfter: 8,
      sourceType: 'CHECKOUT_RESERVATION',
      sourceId: 'res_001',
      createdAt: new Date(),
    },
  ];

  beforeEach(() => {
    spyOn(authzModule, 'authenticateRequest').mockReturnValue(sellerActor as any);

    InventoryService.prototype.reserveStock = async (input: any) => {
      return {
        reservation: {
          id: 'res_001',
          stockBalanceId: mockStockBalance.id,
          quantity: input.quantity,
          status: 'ACTIVE',
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        } as any,
        balance: {
          ...mockStockBalance,
          reserved: input.quantity,
          available: mockStockBalance.onHand - input.quantity,
        } as any,
      };
    };

    InventoryService.prototype.commitReservation = async (input: any) => {
      return {
        reservation: {
          id: input.reservationId,
          status: 'COMMITTED',
          orderId: input.orderId,
        } as any,
        balance: {
          ...mockStockBalance,
          onHand: 8,
          reserved: 0,
          available: 8,
        } as any,
      };
    };

    InventoryService.prototype.releaseReservation = async (input: any) => {
      return {
        reservation: {
          id: input.reservationId,
          status: 'RELEASED',
        } as any,
        balance: {
          ...mockStockBalance,
          reserved: 0,
          available: 10,
        } as any,
      };
    };

    InventoryService.prototype.listPaginatedMovements = async () => {
      return {
        items: mockMovements as any,
        total: mockMovements.length,
        page: 1,
        limit: 20,
        totalPages: 1,
      };
    };
  });

  it('POST /api/v1/inventory/reserve atomically locks stock for checkout', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/inventory/reserve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        warehouseId: 'wh_dhk_001',
        variantId: 'var_001',
        quantity: 2,
        cartId: 'crt_001',
      }),
    });

    const res = await reserveRoute(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.balance.reserved).toBe(2);
    expect(body.data.balance.available).toBe(8);
  });

  it('POST /api/v1/inventory/commit permanently commits reservation and decrements onHand', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/inventory/commit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reservationId: 'res_001',
        orderId: 'ORD-999',
      }),
    });

    const res = await commitRoute(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.reservation.status).toBe('COMMITTED');
    expect(body.data.balance.onHand).toBe(8);
  });

  it('POST /api/v1/inventory/release returns locked units back to available stock', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/inventory/release', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reservationId: 'res_001',
        reason: 'User cancelled cart checkout',
      }),
    });

    const res = await releaseRoute(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.reservation.status).toBe('RELEASED');
    expect(body.data.balance.available).toBe(10);
  });

  it('GET /api/v1/inventory/movements provides an auditable immutable ledger', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/inventory/movements', {
      method: 'GET',
    });

    const res = await getMovementsRoute(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.items.length).toBe(2);
    expect(body.data.items[0].movementType).toBe('RECEIVE');
    expect(body.data.items[1].movementType).toBe('RESERVE');
  });
});
