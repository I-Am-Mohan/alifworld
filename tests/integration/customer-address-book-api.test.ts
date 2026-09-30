import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
afterEach(() => mock.restore());
import * as authzModule from '@/shared/authz/guard.helper';
import {
  GET as listAddressesRoute,
  POST as createAddressRoute,
} from '@/app/api/v1/customer/addresses/route';
import {
  GET as getAddressRoute,
  PUT as updateAddressRoute,
  PATCH as setDefaultAddressRoute,
  DELETE as deleteAddressRoute,
} from '@/app/api/v1/customer/addresses/[id]/route';
import { CustomerAddressService } from '@/features/customer/address-service';
import { NextRequest } from 'next/server';

describe('Milestone 122: Customer Address Book REST API Integration Tests', () => {
  const customerActor = {
    userId: 'usr-customer-001',
    roles: ['CUSTOMER'],
    permissions: [],
    sellerId: null,
  };

  const mockAddress = {
    id: 'addr_101',
    userId: 'usr-customer-001',
    label: 'Home',
    recipientName: 'Rahim Ahmed',
    recipientPhone: '+8801711223344',
    divisionCode: 'DHAKA',
    districtId: 'dhaka',
    addressLine: 'Road 11, Banani',
    postalCode: '1213',
    isDefault: true,
    version: 1,
  };

  beforeEach(() => {
    spyOn(authzModule, 'authenticateRequest').mockReturnValue(customerActor as any);

    spyOn(CustomerAddressService.prototype, 'list').mockResolvedValue([mockAddress as any]);
    spyOn(CustomerAddressService.prototype, 'getById').mockResolvedValue(mockAddress as any);
    spyOn(CustomerAddressService.prototype, 'create').mockResolvedValue(mockAddress as any);
    spyOn(CustomerAddressService.prototype, 'update').mockResolvedValue({
      ...mockAddress,
      label: 'Updated Home',
      version: 2,
    } as any);
    spyOn(CustomerAddressService.prototype, 'setDefault').mockResolvedValue({
      ...mockAddress,
      isDefault: true,
    } as any);
    spyOn(CustomerAddressService.prototype, 'remove').mockResolvedValue(true);
  });

  it('GET /api/v1/customer/addresses lists saved customer addresses', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/customer/addresses', {
      method: 'GET',
    });
    const res = await listAddressesRoute(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.length).toBe(1);
    expect(body.data[0].label).toBe('Home');
  });

  it('GET /api/v1/customer/addresses/[id] returns individual address details', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/customer/addresses/addr_101', {
      method: 'GET',
    });
    const res = await getAddressRoute(req, { params: Promise.resolve({ id: 'addr_101' }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.id).toBe('addr_101');
  });

  it('POST /api/v1/customer/addresses creates address with Bangladesh geo hierarchy', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/customer/addresses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        label: 'Home',
        recipientName: 'Rahim Ahmed',
        recipientPhone: '+8801711223344',
        divisionCode: 'DHAKA',
        districtId: 'dhaka',
        addressLine: 'Road 11, Banani',
        postalCode: '1213',
        isDefault: true,
      }),
    });

    const res = await createAddressRoute(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.id).toBe('addr_101');
  });

  it('PUT /api/v1/customer/addresses/[id] updates address with OCC version', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/customer/addresses/addr_101', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        label: 'Updated Home',
        version: 1,
      }),
    });

    const res = await updateAddressRoute(req, { params: Promise.resolve({ id: 'addr_101' }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.label).toBe('Updated Home');
    expect(body.data.version).toBe(2);
  });

  it('PATCH /api/v1/customer/addresses/[id] sets address as default', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/customer/addresses/addr_101', {
      method: 'PATCH',
    });
    const res = await setDefaultAddressRoute(req, { params: Promise.resolve({ id: 'addr_101' }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.isDefault).toBe(true);
  });

  it('DELETE /api/v1/customer/addresses/[id] soft-deletes address', async () => {
    const req = new NextRequest('http://localhost:3000/api/v1/customer/addresses/addr_101', {
      method: 'DELETE',
    });
    const res = await deleteAddressRoute(req, { params: Promise.resolve({ id: 'addr_101' }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.deleted).toBe(true);
  });
});
