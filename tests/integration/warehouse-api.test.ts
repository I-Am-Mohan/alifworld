import { describe, it, expect, beforeEach, spyOn } from 'bun:test';
import * as authzModule from '@/shared/authz';
import { POST as createWarehouseRoute, GET as listWarehousesRoute } from '@/app/api/v1/warehouses/route';
import { GET as getWarehouseRoute, PUT as updateWarehouseRoute, DELETE as deleteWarehouseRoute } from '@/app/api/v1/warehouses/[id]/route';
import { WarehouseService } from '@/features/inventory/services/warehouse-service';
import { NextRequest } from 'next/server';

describe('Milestone 101: Warehouse & Fulfillment Locations API Integration Tests', () => {
  const adminActor = {
    userId: 'usr-admin-001',
    roles: ['ADMIN'],
    permissions: ['*'],
    sellerId: null,
  };

  const mockWarehouse = {
    id: 'wh_dhk_001',
    sellerId: null,
    name: 'Dhaka Central Platform Hub',
    code: 'DHK-HUB-01',
    division: 'DHAKA',
    district: 'Dhaka',
    upazila: 'Tejgaon',
    addressLine: '100 Tejgaon Industrial Area',
    postalCode: '1208',
    isPlatformHub: true,
    isActive: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    // Mock authenticateRequest
    spyOn(authzModule, 'authenticateRequest').mockReturnValue(adminActor as any);

    // Spy or mock WarehouseService methods for route handler testing
    WarehouseService.prototype.createWarehouse = async (input: any) => ({
      id: 'wh_created_123',
      sellerId: input.sellerId ?? null,
      name: input.name,
      code: input.code,
      division: input.division,
      district: input.district,
      upazila: input.upazila ?? null,
      addressLine: input.addressLine,
      postalCode: input.postalCode ?? null,
      isPlatformHub: input.isPlatformHub ?? false,
      isActive: input.isActive ?? true,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    WarehouseService.prototype.listWarehouses = async () => [mockWarehouse];
    WarehouseService.prototype.getWarehouse = async (id: string) => {
      if (id === 'wh_dhk_001') return mockWarehouse;
      throw new Error(`Warehouse '${id}' not found`);
    };
    WarehouseService.prototype.updateWarehouse = async (id: string, input: any) => ({
      ...mockWarehouse,
      name: input.name ?? mockWarehouse.name,
      version: input.version + 1,
    });
    WarehouseService.prototype.deleteWarehouse = async () => {};
  });

  it('POST /api/v1/warehouses creates warehouse and returns HTTP 201 Created', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/warehouses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer admin-token',
      },
      body: JSON.stringify({
        name: 'Sylhet Regional Depot',
        code: 'SYL-DEPOT-01',
        division: 'SYLHET',
        district: 'Sylhet',
        addressLine: 'Zindabazar Commercial Area',
        isPlatformHub: false,
      }),
    });

    // Mock authenticateRequest if needed, or pass test request
    const res = await createWarehouseRoute(req);
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.code).toBe('SYL-DEPOT-01');
    expect(json.data.division).toBe('SYLHET');
  });

  it('POST /api/v1/warehouses returns HTTP 422 for invalid division name', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/warehouses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer admin-token',
      },
      body: JSON.stringify({
        name: 'Bad Division Hub',
        code: 'BAD-DIV-01',
        division: 'INVALID_DIVISION',
        district: 'Dhaka',
        addressLine: '123 Main St',
      }),
    });

    const res = await createWarehouseRoute(req);
    expect(res.status).toBe(422);

    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('GET /api/v1/warehouses returns HTTP 200 with list of fulfillment hubs', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/warehouses?division=DHAKA');
    const res = await listWarehousesRoute(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toBeArray();
    expect(json.data[0].code).toBe('DHK-HUB-01');
  });

  it('GET /api/v1/warehouses/[id] returns HTTP 200 for existing warehouse', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/warehouses/wh_dhk_001');
    const res = await getWarehouseRoute(req, { params: Promise.resolve({ id: 'wh_dhk_001' }) });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.id).toBe('wh_dhk_001');
  });

  it('PUT /api/v1/warehouses/[id] updates warehouse and increments version', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/warehouses/wh_dhk_001', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer admin-token',
      },
      body: JSON.stringify({
        version: 1,
        name: 'Dhaka Mega Central Hub',
      }),
    });

    const res = await updateWarehouseRoute(req, { params: Promise.resolve({ id: 'wh_dhk_001' }) });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.name).toBe('Dhaka Mega Central Hub');
    expect(json.data.version).toBe(2);
  });

  it('DELETE /api/v1/warehouses/[id] returns HTTP 200 soft deletion confirmation', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/warehouses/wh_dhk_001', {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer admin-token',
      },
    });

    const res = await deleteWarehouseRoute(req, { params: Promise.resolve({ id: 'wh_dhk_001' }) });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
  });
});
