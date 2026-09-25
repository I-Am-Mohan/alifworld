import { describe, it, expect, beforeEach, spyOn } from 'bun:test';
import * as authzModule from '@/shared/authz';
import { GET as getMovementsRoute } from '@/app/api/v1/inventory/movements/route';
import { InventoryService } from '@/features/inventory/services/inventory-service';
import { NextRequest } from 'next/server';

describe('Milestone 103: Stock Movement Ledger API Integration Tests', () => {
  const adminActor = {
    userId: 'usr-admin-001',
    roles: ['ADMIN'],
    permissions: ['*'],
    sellerId: null,
  };

  const mockMovement = {
    id: 'sm_dhk_1001',
    stockBalanceId: 'sb_dhk_001',
    warehouseId: 'wh_dhk_001',
    variantId: 'var_001',
    movementType: 'RECEIVE',
    quantityDelta: 100,
    onHandAfter: 100,
    reservedAfter: 0,
    availableAfter: 100,
    sourceType: 'PURCHASE_ORDER',
    sourceId: 'PO-2026-99',
    actorId: 'usr-admin-001',
    reason: 'Initial warehouse stock intake',
    createdAt: new Date('2026-09-26T10:00:00Z'),
  };

  beforeEach(() => {
    spyOn(authzModule, 'authenticateRequest').mockReturnValue(adminActor as any);

    InventoryService.prototype.listPaginatedMovements = async () => ({
      items: [mockMovement as any],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
  });

  it('GET /api/v1/inventory/movements returns HTTP 200 with paginated stock movement ledger', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/inventory/movements?warehouseId=wh_dhk_001&page=1&limit=20');
    const res = await getMovementsRoute(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.items).toBeArray();
    expect(json.data.items[0].id).toBe('sm_dhk_1001');
    expect(json.data.items[0].movementType).toBe('RECEIVE');
    expect(json.data.items[0].quantityDelta).toBe(100);
    expect(json.data.total).toBe(1);
  });
});
