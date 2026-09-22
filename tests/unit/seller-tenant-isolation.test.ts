import { describe, expect, it, mock } from 'bun:test';
import { SellerSettingsService } from '@/features/seller/services/seller-settings-service';
import { SellerService } from '@/features/seller/services/seller-service';
import { SellerStatus, CourierProvider } from '@/features/seller/types';
import { AuthorizationError, ConflictError } from '@/shared/errors/app-error';
import { prisma } from '@/shared/database/prisma';

describe('Seller Tenant Isolation: Settings Service', () => {
  const mockSellerTenantA = {
    id: 'sel_tenant_a',
    name: 'Tenant A Store',
    slug: 'tenant-a-store',
    ownerUserId: 'usr_owner_tenant_a',
    status: SellerStatus.VERIFIED,
    version: 1,
  };

  const mockSellerTenantB = {
    id: 'sel_tenant_b',
    name: 'Tenant B Store',
    slug: 'tenant-b-store',
    ownerUserId: 'usr_owner_tenant_b',
    status: SellerStatus.VERIFIED,
    version: 1,
  };

  it('allows owner of Tenant A to update Tenant A store settings', async () => {
    let settingsUpdated = false;
    const mockSettingsRepo: any = {
      upsertSettings: mock(async (sellerId: string, data: any) => {
        settingsUpdated = true;
        return {
          id: 'set_tenant_a',
          sellerId,
          vacationMode: data.vacationMode ?? false,
          defaultCourier: 'PATHAO',
          version: 2,
        };
      }),
    };

    const mockSellerRepo: any = {
      findById: mock(async (id: string) => {
        if (id === 'sel_tenant_a') return mockSellerTenantA;
        if (id === 'sel_tenant_b') return mockSellerTenantB;
        return null;
      }),
    };

    const mockRoleAssignmentRepo: any = {
      hasRole: mock(async () => false),
    };

    (prisma as any).auditLog = {
      create: mock(async () => ({ id: 'aud_01' })),
    };

    const service = new SellerSettingsService(mockSettingsRepo, mockSellerRepo, mockRoleAssignmentRepo);

    const result = await service.updateSettings('usr_owner_tenant_a', {
      sellerId: 'sel_tenant_a',
      vacationMode: false,
      defaultCourier: CourierProvider.PATHAO,
      version: 1,
    });

    expect(settingsUpdated).toBe(true);
    expect(result.id).toBe('set_tenant_a');
  });

  it('strictly blocks owner of Tenant A from updating Tenant B store settings', async () => {
    const mockSettingsRepo: any = {
      upsertSettings: mock(async () => {}),
    };

    const mockSellerRepo: any = {
      findById: mock(async (id: string) => {
        if (id === 'sel_tenant_b') return mockSellerTenantB;
        return null;
      }),
    };

    const mockRoleAssignmentRepo: any = {
      hasRole: mock(async () => false),
    };

    const service = new SellerSettingsService(mockSettingsRepo, mockSellerRepo, mockRoleAssignmentRepo);

    expect(
      service.updateSettings('usr_owner_tenant_a', {
        sellerId: 'sel_tenant_b',
        vacationMode: true,
        version: 1,
      })
    ).rejects.toThrow(AuthorizationError);
  });

  it('allows Super Admin to update settings across tenants', async () => {
    let settingsUpdated = false;
    const mockSettingsRepo: any = {
      upsertSettings: mock(async (sellerId: string, data: any) => {
        settingsUpdated = true;
        return {
          id: 'set_tenant_b',
          sellerId,
          vacationMode: true,
          defaultCourier: 'STEADFAST',
          version: 2,
        };
      }),
    };

    const mockSellerRepo: any = {
      findById: mock(async () => mockSellerTenantB),
    };

    const mockRoleAssignmentRepo: any = {
      hasRole: mock(async (userId: string, roleCode: string) => {
        return userId === 'usr_super_admin' && roleCode === 'SUPER_ADMIN';
      }),
    };

    (prisma as any).auditLog = {
      create: mock(async () => ({ id: 'aud_admin' })),
    };

    const service = new SellerSettingsService(mockSettingsRepo, mockSellerRepo, mockRoleAssignmentRepo);

    const result = await service.updateSettings('usr_super_admin', {
      sellerId: 'sel_tenant_b',
      vacationMode: true,
      version: 1,
    });

    expect(settingsUpdated).toBe(true);
    expect(result.vacationMode).toBe(true);
  });
});

describe('Seller Concurrency & Identity Uniqueness', () => {
  it('prevents registering a store when slug is already taken', async () => {
    const mockSellerRepo: any = {
      findBySlug: mock(async () => ({ id: 'sel_existing' })),
      findByOwnerUserId: mock(async () => null),
    };

    const service = new SellerService(
      mockSellerRepo,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any
    );

    expect(
      service.registerSeller('usr_new_owner', {
        businessName: 'Existing Store Name',
        slug: 'existing-store',
      })
    ).rejects.toThrow(ConflictError);
  });

  it('prevents a single user from registering duplicate seller accounts', async () => {
    const mockSellerRepo: any = {
      findBySlug: mock(async () => null),
      findByOwnerUserId: mock(async () => ({ id: 'sel_store_01' })),
    };

    const service = new SellerService(
      mockSellerRepo,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any
    );

    expect(
      service.registerSeller('usr_already_has_store', {
        businessName: 'Second Store Attempt',
        slug: 'second-store',
      })
    ).rejects.toThrow(ConflictError);
  });
});
