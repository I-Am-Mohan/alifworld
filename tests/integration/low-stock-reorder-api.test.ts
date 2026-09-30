import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
afterEach(() => mock.restore());
import * as authzModule from '@/shared/authz';
import { GET as lowStockAlertsRoute } from '@/app/api/v1/inventory/alerts/low-stock/route';
import { PUT as updateThresholdsRoute } from '@/app/api/v1/inventory/balances/[id]/thresholds/route';
import { GET as reorderRecsRoute } from '@/app/api/v1/inventory/reorder-recommendations/route';
import { InventoryService } from '@/features/inventory/services/inventory-service';
import { NextRequest } from 'next/server';

describe('Milestone 106: Low-Stock Alerts & Reorder Views REST API Integration Tests', () => {
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
  };

  const mockReorderRec = {
    stockBalance: mockStockBalance,
    currentAvailable: 2,
    reorderPoint: 20,
    lowStockThreshold: 10,
    recommendedReorderQuantity: 38,
    urgency: 'HIGH',
  };

  beforeEach(() => {
    spyOn(authzModule, 'authenticateRequest').mockReturnValue(sellerActor as any);

    InventoryService.prototype.listLowStockAlerts = async () => [mockStockBalance as any];

    InventoryService.prototype.updateStockThresholds = async (input: any) =>
      ({
        ...mockStockBalance,
        lowStockThreshold: input.lowStockThreshold,
        reorderPoint: input.reorderPoint,
      }) as any;

    InventoryService.prototype.getReorderRecommendations = async () => [mockReorderRec as any];
  });

  it('GET /api/v1/inventory/alerts/low-stock should return low stock balances', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/inventory/alerts/low-stock', {
      method: 'GET',
    });

    const res = await lowStockAlertsRoute(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.length).toBe(1);
    expect(body.data[0].available).toBe(2);
  });

  it('PUT /api/v1/inventory/balances/[id]/thresholds should update thresholds', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/v1/inventory/balances/stb_wh_001_var_001/thresholds',
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lowStockThreshold: 15,
          reorderPoint: 30,
        }),
      }
    );

    const res = await updateThresholdsRoute(req, {
      params: Promise.resolve({ id: 'stb_wh_001_var_001' }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.lowStockThreshold).toBe(15);
    expect(body.data.reorderPoint).toBe(30);
  });

  it('GET /api/v1/inventory/reorder-recommendations should return reorder recommendations', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/inventory/reorder-recommendations', {
      method: 'GET',
    });

    const res = await reorderRecsRoute(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.length).toBe(1);
    expect(body.data[0].recommendedReorderQuantity).toBe(38);
    expect(body.data[0].urgency).toBe('HIGH');
  });
});
