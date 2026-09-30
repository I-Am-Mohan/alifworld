import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
afterEach(() => mock.restore());
import * as authzModule from '@/shared/authz';
import { POST as releaseRoute } from '@/app/api/v1/inventory/release/route';
import { POST as commitRoute } from '@/app/api/v1/inventory/commit/route';
import { POST as expireStaleRoute } from '@/app/api/v1/inventory/expire-stale/route';
import { POST as compensateRoute } from '@/app/api/v1/inventory/compensate/route';
import { InventoryService } from '@/features/inventory/services/inventory-service';
import { NextRequest } from 'next/server';

describe('Milestone 105: Reservation Lifecycle & Compensation REST API Integration Tests', () => {
  const adminActor = {
    userId: 'usr-admin-001',
    roles: ['ADMIN'],
    permissions: ['*'],
    sellerId: null,
  };

  const mockStockBalance = {
    id: 'stb_dhk_001',
    warehouseId: 'wh_dhk_001',
    variantId: 'var_001',
    onHand: 100,
    reserved: 10,
    damaged: 0,
    quarantined: 0,
    available: 90,
    lowStockThreshold: 10,
    reorderPoint: 20,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockReservation = {
    id: 'res_123456',
    stockBalanceId: 'stb_dhk_001',
    quantity: 10,
    status: 'ACTIVE',
    cartId: 'crt_999',
    orderId: null,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    spyOn(authzModule, 'authenticateRequest').mockReturnValue(adminActor as any);

    InventoryService.prototype.releaseReservation = async (input: any) => ({
      reservation: { ...mockReservation, status: 'RELEASED' } as any,
      balance: { ...mockStockBalance, reserved: 0, available: 100 } as any,
    });

    InventoryService.prototype.commitReservation = async (input: any) => ({
      reservation: { ...mockReservation, status: 'COMMITTED', orderId: input.orderId } as any,
      balance: { ...mockStockBalance, onHand: 90, reserved: 0, available: 90 } as any,
    });

    InventoryService.prototype.expireStaleReservations = async () => 3;

    InventoryService.prototype.compensateInventory = async (input: any) => ({
      balance: { ...mockStockBalance, onHand: mockStockBalance.onHand + input.quantity } as any,
      movement: {
        id: 'mov_comp_001',
        movementType: 'RETURN',
        quantityDelta: input.quantity,
      } as any,
    });
  });

  it('POST /api/v1/inventory/release should release stock reservation', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/inventory/release', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reservationId: 'res_123456',
        reason: 'User abandoned cart session',
      }),
    });

    const res = await releaseRoute(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.reservation.status).toBe('RELEASED');
    expect(body.data.balance.reserved).toBe(0);
  });

  it('POST /api/v1/inventory/commit should commit stock reservation', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/inventory/commit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reservationId: 'res_123456',
        orderId: 'ord_999888',
      }),
    });

    const res = await commitRoute(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.reservation.status).toBe('COMMITTED');
    expect(body.data.reservation.orderId).toBe('ord_999888');
  });

  it('POST /api/v1/inventory/expire-stale should trigger automated TTL sweep', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/inventory/expire-stale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const res = await expireStaleRoute(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.expiredCount).toBe(3);
  });

  it('POST /api/v1/inventory/compensate should execute compensating inventory operation', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/inventory/compensate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        warehouseId: 'wh_dhk_001',
        variantId: 'var_001',
        quantity: 5,
        orderId: 'ord_cancelled_01',
        reason: 'Order cancelled due to out-of-stock component',
      }),
    });

    const res = await compensateRoute(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.movement.movementType).toBe('RETURN');
    expect(body.data.movement.quantityDelta).toBe(5);
  });
});
