import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
afterEach(() => mock.restore());
import * as authzModule from '@/shared/authz';
import { POST as initiateTransferRoute } from '@/app/api/v1/inventory/transfers/route';
import { POST as receiveTransferRoute } from '@/app/api/v1/inventory/transfers/receive/route';
import { POST as initiateCountRoute } from '@/app/api/v1/inventory/counts/route';
import { POST as submitCorrectionRoute } from '@/app/api/v1/inventory/counts/corrections/submit/route';
import { POST as approveCorrectionRoute } from '@/app/api/v1/inventory/counts/corrections/approve/route';
import { InventoryService } from '@/features/inventory/services/inventory-service';
import { NextRequest } from 'next/server';

describe('Milestone 107: Stock Transfers & Dual Approvals REST API Integration Tests', () => {
  const adminActor = {
    userId: 'usr-admin-002',
    roles: ['ADMIN'],
    permissions: ['*'],
    sellerId: null,
  };

  const mockTransfer = {
    id: 'trf_123456',
    fromWarehouseId: 'wh_001',
    toWarehouseId: 'wh_002',
    variantId: 'var_001',
    quantity: 15,
    status: 'IN_TRANSIT',
    reason: 'Store rebalance',
    initiatedBy: 'usr-admin-001',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCorrection = {
    id: 'cor_123456',
    countSessionId: 'cnt_001',
    stockBalanceId: 'stb_001',
    currentOnHand: 50,
    countedQuantity: 30,
    variance: -20,
    reason: 'Physical count damage write-off',
    requiresApproval: true,
    status: 'PENDING_APPROVAL',
    submittedBy: 'usr-admin-001',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    spyOn(authzModule, 'authenticateRequest').mockReturnValue(adminActor as any);

    InventoryService.prototype.transferStock = async () => ({
      transfer: mockTransfer as any,
      sourceBalance: { id: 'stb_001', onHand: 35 } as any,
    });

    InventoryService.prototype.receiveStockTransfer = async () => ({
      transfer: { ...mockTransfer, status: 'COMPLETED' } as any,
      destBalance: { id: 'stb_002', onHand: 15 } as any,
    });

    InventoryService.prototype.initiateStockCountSession = async (input: any) => ({
      sessionId: 'cnt_new_001',
      warehouseId: input.warehouseId,
      title: input.title,
      createdAt: new Date().toISOString(),
    });

    InventoryService.prototype.submitStockCountCorrection = async () => ({
      correction: mockCorrection as any,
    });

    InventoryService.prototype.approveStockCountCorrection = async () => ({
      correction: { ...mockCorrection, status: 'APPROVED', approvedBy: adminActor.userId } as any,
      balance: { id: 'stb_001', onHand: 30 } as any,
    });
  });

  it('POST /api/v1/inventory/transfers should initiate stock transfer', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/inventory/transfers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fromWarehouseId: 'wh_001',
        toWarehouseId: 'wh_002',
        variantId: 'var_001',
        quantity: 15,
        reason: 'Store rebalance',
      }),
    });

    const res = await initiateTransferRoute(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.transfer.status).toBe('IN_TRANSIT');
  });

  it('POST /api/v1/inventory/transfers/receive should receive stock transfer', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/inventory/transfers/receive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transferId: 'trf_123456',
      }),
    });

    const res = await receiveTransferRoute(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.transfer.status).toBe('COMPLETED');
  });

  it('POST /api/v1/inventory/counts should initiate physical count session', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/inventory/counts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        warehouseId: 'wh_001',
        title: 'Q3 Physical Inventory Audit',
      }),
    });

    const res = await initiateCountRoute(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.sessionId).toBe('cnt_new_001');
  });

  it('POST /api/v1/inventory/counts/corrections/submit should submit count variance', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/v1/inventory/counts/corrections/submit',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          countSessionId: 'cnt_001',
          stockBalanceId: 'stb_001',
          countedQuantity: 30,
          reason: 'Physical count damage write-off',
        }),
      }
    );

    const res = await submitCorrectionRoute(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.correction.requiresApproval).toBe(true);
  });

  it('POST /api/v1/inventory/counts/corrections/approve should perform Maker-Checker approval', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/v1/inventory/counts/corrections/approve',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          correctionId: 'cor_123456',
          approved: true,
        }),
      }
    );

    const res = await approveCorrectionRoute(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.correction.status).toBe('APPROVED');
    expect(body.data.correction.approvedBy).toBe('usr-admin-002');
  });
});
