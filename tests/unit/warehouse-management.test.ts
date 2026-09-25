import { describe, it, expect, beforeEach } from 'bun:test';
import { WarehousePolicy } from '@/shared/authz/policies/warehouse.policy';
import { ActorContext } from '@/shared/authz/authz.types';
import { WarehouseService } from '@/features/inventory/services/warehouse-service';
import { CreateWarehouseSchema } from '@/features/inventory/validators';
import { ConflictError, AuthorizationError, NotFoundError } from '@/shared/errors/app-error';

describe('Milestone 101: Warehouse & Fulfillment Location Management Unit Tests', () => {
  const adminActor: ActorContext = {
    userId: 'usr-admin-001',
    roles: ['ADMIN'],
    permissions: ['*'],
    sellerId: null,
  };

  const sellerActorA: ActorContext = {
    userId: 'usr-seller-a',
    roles: ['SELLER'],
    permissions: ['seller:write'],
    sellerId: 'sel-store-aaaa-1111',
  };

  const sellerActorB: ActorContext = {
    userId: 'usr-seller-b',
    roles: ['SELLER'],
    permissions: ['seller:write'],
    sellerId: 'sel-store-bbbb-2222',
  };

  const customerActor: ActorContext = {
    userId: 'usr-customer-001',
    roles: ['CUSTOMER'],
    permissions: [],
    sellerId: null,
  };

  describe('1. WarehousePolicy Authorization Rules', () => {
    it('allows ADMIN to create platform hubs and merchant warehouses', () => {
      expect(
        WarehousePolicy.canCreateWarehouse(adminActor, { isPlatformHub: true, sellerId: null })
      ).toBe(true);
      expect(
        WarehousePolicy.canCreateWarehouse(adminActor, { isPlatformHub: false, sellerId: 'sel-store-aaaa-1111' })
      ).toBe(true);
    });

    it('allows SELLER to create merchant warehouse for own store', () => {
      expect(
        WarehousePolicy.canCreateWarehouse(sellerActorA, { isPlatformHub: false, sellerId: 'sel-store-aaaa-1111' })
      ).toBe(true);
    });

    it('prohibits SELLER from creating platform hubs', () => {
      expect(
        WarehousePolicy.canCreateWarehouse(sellerActorA, { isPlatformHub: true, sellerId: 'sel-store-aaaa-1111' })
      ).toBe(false);
    });

    it('prohibits SELLER from creating warehouse for another sellerId', () => {
      expect(
        WarehousePolicy.canCreateWarehouse(sellerActorA, { isPlatformHub: false, sellerId: 'sel-store-bbbb-2222' })
      ).toBe(false);
    });

    it('prohibits CUSTOMER from creating warehouses', () => {
      expect(
        WarehousePolicy.canCreateWarehouse(customerActor, { isPlatformHub: false, sellerId: null })
      ).toBe(false);
    });

    it('allows SELLER to update and delete own warehouse but prohibits updating another seller warehouse', () => {
      const ownResource = { sellerId: 'sel-store-aaaa-1111', isPlatformHub: false };
      const otherResource = { sellerId: 'sel-store-bbbb-2222', isPlatformHub: false };

      expect(WarehousePolicy.canUpdateWarehouse(sellerActorA, ownResource)).toBe(true);
      expect(WarehousePolicy.canUpdateWarehouse(sellerActorA, otherResource)).toBe(false);
      expect(WarehousePolicy.canDeleteWarehouse(sellerActorA, ownResource)).toBe(true);
      expect(WarehousePolicy.canDeleteWarehouse(sellerActorA, otherResource)).toBe(false);
    });
  });

  describe('2. Bangladesh Division & Warehouse Code Zod Validation', () => {
    it('successfully parses valid Bangladesh administrative division and warehouse code', () => {
      const validPayload = {
        name: 'Dhaka Central Hub',
        code: 'DHK-HUB-01',
        division: 'DHAKA',
        district: 'Dhaka',
        addressLine: '123 Tejgaon Industrial Area',
        isPlatformHub: true,
      };

      const parsed = CreateWarehouseSchema.parse(validPayload);
      expect(parsed.code).toBe('DHK-HUB-01');
      expect(parsed.division).toBe('DHAKA');
    });

    it('fails validation when division is not a valid Bangladesh administrative division', () => {
      const invalidPayload = {
        name: 'Invalid Division Hub',
        code: 'DHK-HUB-99',
        division: 'TOKYO', // Invalid division
        district: 'Dhaka',
        addressLine: '123 Test Street',
      };

      expect(() => CreateWarehouseSchema.parse(invalidPayload)).toThrow();
    });

    it('fails validation when warehouse code is not uppercase alphanumeric format', () => {
      const invalidCodePayload = {
        name: 'Bad Code Hub',
        code: 'dhk_hub_01!', // Invalid code format
        division: 'DHAKA',
        district: 'Dhaka',
        addressLine: '123 Test Street',
      };

      expect(() => CreateWarehouseSchema.parse(invalidCodePayload)).toThrow();
    });
  });

  describe('3. WarehouseService Domain Rules & Concurrency Controls', () => {
    let mockRepo: any;
    let service: WarehouseService;

    const mockWarehouse = {
      id: 'wh-001',
      sellerId: 'sel-store-aaaa-1111',
      name: 'Chittagong Port Depot',
      code: 'CTG-DEPOT-01',
      division: 'CHITTAGONG',
      district: 'Chittagong',
      addressLine: 'Port Road 12',
      isPlatformHub: false,
      isActive: true,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      mockRepo = {
        findByCode: async (code: string) => {
          if (code === 'CTG-DEPOT-01') return mockWarehouse;
          return null;
        },
        findById: async (id: string) => {
          if (id === 'wh-001') return mockWarehouse;
          return null;
        },
        create: async (data: any) => ({ id: 'wh-new', ...data, version: 1 }),
        update: async (id: string, expectedVersion: number, data: any) => {
          if (expectedVersion !== mockWarehouse.version) {
            throw new ConflictError('Optimistic concurrency conflict');
          }
          return { ...mockWarehouse, ...data, version: expectedVersion + 1 };
        },
        findMany: async () => [mockWarehouse],
        softDelete: async () => {},
      };

      service = new WarehouseService(mockRepo as any);
    });

    it('rejects duplicate warehouse code creation with ConflictError', async () => {
      expect(
        service.createWarehouse(
          {
            name: 'Duplicate Code Hub',
            code: 'CTG-DEPOT-01',
            division: 'CHITTAGONG',
            district: 'Chittagong',
            addressLine: 'Port Road 99',
          },
          adminActor
        )
      ).rejects.toThrow(ConflictError);
    });

    it('enforces optimistic concurrency version matching on update', async () => {
      expect(
        service.updateWarehouse(
          'wh-001',
          {
            version: 99, // Mismatched version (existing version is 1)
            name: 'Updated Name',
          },
          adminActor
        )
      ).rejects.toThrow(ConflictError);
    });

    it('prohibits seller from setting isPlatformHub: true on update', async () => {
      expect(
        service.updateWarehouse(
          'wh-001',
          {
            version: 1,
            isPlatformHub: true,
          },
          sellerActorA
        )
      ).rejects.toThrow(AuthorizationError);
    });
  });
});
