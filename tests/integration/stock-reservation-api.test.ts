import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
afterEach(() => mock.restore());
import * as authzModule from '@/shared/authz';
import { POST as reserveRoute } from '@/app/api/v1/inventory/reserve/route';
import { InventoryService } from '@/features/inventory/services/inventory-service';
import { NextRequest } from 'next/server';

describe('Milestone 104: Atomic Stock Reservation API Integration Tests', () => {
  const customerActor = {
    userId: 'usr-customer-001',
    roles: ['CUSTOMER'],
    permissions: [],
    sellerId: null,
  };

  const mockStockBalance = {
    id: 'sb_dhk_001',
    warehouseId: 'wh_dhk_001',
    variantId: 'var_001',
    onHand: 50,
    reserved: 5,
    damaged: 0,
    quarantined: 0,
    available: 45,
    version: 1,
  };

  const mockReservation = {
    id: 'res_dhk_1001',
    stockBalanceId: 'sb_dhk_001',
    quantity: 2,
    cartId: 'cart_12345',
    status: 'ACTIVE',
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    version: 1,
  };

  beforeEach(() => {
    spyOn(authzModule, 'authenticateRequest').mockReturnValue(customerActor as any);

    InventoryService.prototype.reserveStock = async (input: any) => ({
      reservation: { ...mockReservation, quantity: input.quantity } as any,
      balance: {
        ...mockStockBalance,
        reserved: mockStockBalance.reserved + input.quantity,
        available: mockStockBalance.available - input.quantity,
      } as any,
    });
  });

  it('POST /api/v1/inventory/reserve reserves stock atomically and returns HTTP 201 Created', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/inventory/reserve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        warehouseId: 'wh_dhk_001',
        variantId: 'var_001',
        quantity: 2,
        cartId: 'cart_12345',
        ttlMinutes: 15,
      }),
    });

    const res = await reserveRoute(req);
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.reservation.id).toBe('res_dhk_1001');
    expect(json.data.balance.reserved).toBe(7);
  });

  it('POST /api/v1/inventory/reserve returns HTTP 422 for missing required fields', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/inventory/reserve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quantity: 2, // Missing warehouseId and variantId
      }),
    });

    const res = await reserveRoute(req);
    expect(res.status).toBe(422);

    const json = await res.json();
    expect(json.success).toBe(false);
  });
});
