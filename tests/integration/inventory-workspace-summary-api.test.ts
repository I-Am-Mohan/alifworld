import { describe, it, expect, beforeEach, spyOn } from 'bun:test';
import * as authzModule from '@/shared/authz';
import { GET as workspaceSummaryRoute } from '@/app/api/v1/inventory/workspace/summary/route';
import { InventoryService } from '@/features/inventory/services/inventory-service';
import { NextRequest } from 'next/server';

describe('Milestone 109: Inventory Workspace Summary REST API Integration Tests', () => {
  const sellerActor = {
    userId: 'usr-seller-001',
    roles: ['SELLER_ADMIN'],
    permissions: ['*'],
    sellerId: 'sel_tech_001',
  };

  const mockSummary = {
    totalSKUs: 5,
    totalOnHand: 500,
    totalReserved: 50,
    totalAvailable: 450,
    totalDamaged: 0,
    totalQuarantined: 0,
    lowStockCount: 1,
    activeReservationsCount: 10,
    pendingApprovalsCount: 0,
    inTransitTransfersCount: 1,
  };

  beforeEach(() => {
    spyOn(authzModule, 'authenticateRequest').mockReturnValue(sellerActor as any);

    InventoryService.prototype.getWorkspaceSummary = async (options?: any) => {
      if (options?.sellerId === sellerActor.sellerId) {
        return mockSummary as any;
      }
      return mockSummary as any;
    };
  });

  it('GET /api/v1/inventory/workspace/summary should return workspace summary metrics with seller scoping', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/inventory/workspace/summary', {
      method: 'GET',
    });

    const res = await workspaceSummaryRoute(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.totalSKUs).toBe(5);
    expect(body.data.totalOnHand).toBe(500);
    expect(body.data.totalAvailable).toBe(450);
  });
});
