import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
afterEach(() => mock.restore());
import * as authzModule from '@/shared/authz';
import { POST as returnIntakeRoute } from '@/app/api/v1/inventory/returns/intake/route';
import { POST as returnInspectRoute } from '@/app/api/v1/inventory/returns/inspect/route';
import { POST as returnRestockRoute } from '@/app/api/v1/inventory/returns/restock/route';
import { InventoryService } from '@/features/inventory/services/inventory-service';
import { NextRequest } from 'next/server';

describe('Milestone 108: Return Restocking & Quarantine Inspection REST API Integration Tests', () => {
  const sellerActor = {
    userId: 'usr-seller-001',
    roles: ['SELLER_ADMIN'],
    permissions: ['*'],
    sellerId: 'sel_tech_001',
  };

  const mockStockBalance = {
    id: 'stb_wh_001_var_001',
    warehouseId: 'wh_001',
    variantId: 'var_001',
    onHand: 15,
    reserved: 0,
    damaged: 0,
    quarantined: 0,
    available: 15,
    lowStockThreshold: 5,
    reorderPoint: 10,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRma = {
    id: 'rma_123456',
    rmaNumber: 'RMA-2026-001',
    orderId: 'ORD-999',
    warehouseId: 'wh_001',
    variantId: 'var_001',
    quantity: 3,
    disposition: 'QUARANTINE_INSPECTION',
    status: 'RECEIVED',
    receivedBy: 'usr-seller-001',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    spyOn(authzModule, 'authenticateRequest').mockReturnValue(sellerActor as any);

    InventoryService.prototype.processRmaReturnIntake = async () => ({
      rmaRecord: mockRma as any,
      balance: { ...mockStockBalance, quarantined: 3 } as any,
    });

    InventoryService.prototype.inspectQuarantinedReturn = async () => ({
      rmaRecord: { ...mockRma, status: 'RESTOCKED', inspectionResult: 'PASSED_RESTOCK' } as any,
      balance: { ...mockStockBalance, onHand: 18, available: 18 } as any,
    });

    InventoryService.prototype.restockReturnedItem = async () => ({
      balance: { ...mockStockBalance, onHand: 18, available: 18 } as any,
      movement: { id: 'mov_ret_001', movementType: 'RETURN', quantityDelta: 3 } as any,
    });
  });

  it('POST /api/v1/inventory/returns/intake should process RMA return intake', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/inventory/returns/intake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rmaNumber: 'RMA-2026-001',
        orderId: 'ORD-999',
        warehouseId: 'wh_001',
        variantId: 'var_001',
        quantity: 3,
        initialDisposition: 'QUARANTINE_INSPECTION',
      }),
    });

    const res = await returnIntakeRoute(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.rmaRecord.rmaNumber).toBe('RMA-2026-001');
    expect(body.data.balance.quarantined).toBe(3);
  });

  it('POST /api/v1/inventory/returns/inspect should record quality control inspection', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/inventory/returns/inspect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rmaNumber: 'RMA-2026-001',
        stockBalanceId: 'stb_wh_001_var_001',
        quantity: 3,
        inspectionResult: 'PASSED_RESTOCK',
        inspectionNotes: 'Unopened seal confirmed intact',
      }),
    });

    const res = await returnInspectRoute(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.rmaRecord.status).toBe('RESTOCKED');
  });

  it('POST /api/v1/inventory/returns/restock should restock returned items into available inventory', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/inventory/returns/restock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rmaNumber: 'RMA-2026-001',
        stockBalanceId: 'stb_wh_001_var_001',
        quantity: 3,
        reason: 'Direct restocking',
      }),
    });

    const res = await returnRestockRoute(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.movement.movementType).toBe('RETURN');
    expect(body.data.balance.available).toBe(18);
  });
});
