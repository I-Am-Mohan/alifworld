import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
afterEach(() => mock.restore());
import * as authzModule from '@/shared/authz';
import { GET as listBalancesRoute } from '@/app/api/v1/inventory/balances/route';
import { GET as getBalanceRoute } from '@/app/api/v1/inventory/balances/[id]/route';
import { POST as intakeRoute } from '@/app/api/v1/inventory/intake/route';
import { POST as adjustRoute } from '@/app/api/v1/inventory/adjust/route';
import { POST as quarantineRoute } from '@/app/api/v1/inventory/quarantine/route';
import { InventoryService } from '@/features/inventory/services/inventory-service';
import { NextRequest } from 'next/server';

describe('Milestone 102: Stock Balances & Inventory API Integration Tests', () => {
  const adminActor = {
    userId: 'usr-admin-001',
    roles: ['ADMIN'],
    permissions: ['*'],
    sellerId: null,
  };

  const mockStockBalance = {
    id: 'sb_dhk_001',
    warehouseId: 'wh_dhk_001',
    variantId: 'var_001',
    onHand: 100,
    reserved: 20,
    damaged: 5,
    quarantined: 10,
    available: 65,
    lowStockThreshold: 10,
    reorderPoint: 20,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    warehouse: {
      id: 'wh_dhk_001',
      sellerId: null,
      name: 'Dhaka Platform Hub',
    },
    variant: {
      id: 'var_001',
      sku: 'SKU-SHIRT-BLUE-L',
      title: 'Blue L',
      product: {
        id: 'prod_001',
        title: 'Premium T-Shirt',
        sellerId: 'sel-store-aaaa-1111',
      },
    },
  };

  beforeEach(() => {
    spyOn(authzModule, 'authenticateRequest').mockReturnValue(adminActor as any);

    InventoryService.prototype.listBalances = async () => [mockStockBalance as any];
    InventoryService.prototype.receiveStock = async (input: any) => ({
      balance: {
        ...mockStockBalance,
        onHand: mockStockBalance.onHand + input.quantity,
        available: mockStockBalance.available + input.quantity,
      } as any,
      movement: {
        id: 'mov_intake_01',
        movementType: 'RECEIVE',
        quantityDelta: input.quantity,
      } as any,
    });
    InventoryService.prototype.adjustStock = async (input: any) => ({
      balance: {
        ...mockStockBalance,
        onHand: mockStockBalance.onHand + input.quantityDelta,
      } as any,
      movement: {
        id: 'mov_adjust_01',
        movementType: input.movementType,
        quantityDelta: input.quantityDelta,
      } as any,
    });
    InventoryService.prototype.quarantineStock = async (input: any) => ({
      balance: {
        ...mockStockBalance,
        quarantined: mockStockBalance.quarantined + input.quantity,
        available: mockStockBalance.available - input.quantity,
      } as any,
      movement: {
        id: 'mov_quarantine_01',
        movementType: 'ADJUST',
        quantityDelta: -input.quantity,
      } as any,
    });
  });

  it('GET /api/v1/inventory/balances returns HTTP 200 with stock balances list', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/v1/inventory/balances?warehouseId=wh_dhk_001'
    );
    const res = await listBalancesRoute(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toBeArray();
    expect(json.data[0].available).toBe(65);
  });

  it('GET /api/v1/inventory/balances/[id] returns HTTP 200 for existing balance ID', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/inventory/balances/sb_dhk_001');
    const res = await getBalanceRoute(req, { params: Promise.resolve({ id: 'sb_dhk_001' }) });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.id).toBe('sb_dhk_001');
  });

  it('POST /api/v1/inventory/intake receives stock and returns HTTP 201 Created', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/inventory/intake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        warehouseId: 'wh_dhk_001',
        variantId: 'var_001',
        quantity: 50,
        sourceType: 'PURCHASE_ORDER',
        sourceId: 'PO-2026-001',
        reason: 'New stock intake',
      }),
    });

    const res = await intakeRoute(req);
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.balance.onHand).toBe(150);
  });

  it('POST /api/v1/inventory/adjust adjusts stock and returns HTTP 200 OK', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/inventory/adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stockBalanceId: 'sb_dhk_001',
        movementType: 'ADJUST',
        quantityDelta: 10,
        reason: 'Physical count audit correction',
      }),
    });

    const res = await adjustRoute(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it('POST /api/v1/inventory/quarantine transfers stock to quarantine and returns HTTP 200 OK', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/inventory/quarantine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stockBalanceId: 'sb_dhk_001',
        action: 'QUARANTINE',
        quantity: 5,
        reason: 'Quality audit hold',
      }),
    });

    const res = await quarantineRoute(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
  });
});
