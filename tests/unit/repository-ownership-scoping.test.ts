/**
 * Unit Tests: Repository-Level Ownership Scoping & Invariant Assertion
 * 
 * Verifies BaseRepository, CartRepository, and OrderRepository ownership assertions:
 * 1. assertOwnership() utility behavior
 * 2. buildOwnerWhere() query scoping
 * 3. BaseRepository.assertEntityOwnership() & assertEntityTenant()
 * 4. BaseRepository.buildActorScopedWhere() multi-role query partitioning
 * 5. CartRepository.assertCartOwnership()
 * 6. OrderRepository.assertOrderAccess() across Customer, Seller, Rider, and Admin
 * 
 * Invariants: ADR-0003, ADR-0006, ADR-0022, ADR-0023, Milestone 043, Milestone 047
 */

import { describe, it, expect } from 'bun:test';
import {
  assertOwnership,
  buildOwnerWhere,
  assertSellerScope,
  buildSellerWhere,
  BaseRepository,
} from '@/shared/database/base-repository';
import { CartRepository } from '@/repositories/cart.repository';
import { OrderRepository } from '@/repositories/order.repository';
import { ActorContext } from '@/shared/authz/authz.types';
import { SystemRoleCode } from '@/features/identity/types';
import { AuthorizationError } from '@/shared/errors/app-error';

// Concrete subclass of BaseRepository for testing protected methods
class TestRepository extends BaseRepository {
  public testWhereOwnerScope<T extends object>(ownerId: string, criteria?: T, ownerField?: string) {
    return this.whereOwnerScope(ownerId, criteria, ownerField);
  }

  public testAssertEntityOwnership(entity: any, actor: ActorContext, options?: any) {
    return this.assertEntityOwnership(entity, actor, options);
  }

  public testAssertEntityTenant(entity: any, actor: ActorContext, options?: any) {
    return this.assertEntityTenant(entity, actor, options);
  }

  public testBuildActorScopedWhere(actor: ActorContext, options?: any, criteria?: any) {
    return this.buildActorScopedWhere(actor, options, criteria);
  }
}

describe('Repository Ownership Scoping & Assertion Suite (Milestone 047)', () => {
  const repo = new TestRepository();
  const cartRepo = new CartRepository();
  const orderRepo = new OrderRepository();

  describe('1. assertOwnership() Function', () => {
    it('succeeds silently when entity owner matches authorized user', () => {
      expect(() => assertOwnership('usr_alice', 'usr_alice')).not.toThrow();
    });

    it('throws AuthorizationError with OWNERSHIP_VIOLATION when owner does not match', () => {
      try {
        assertOwnership('usr_alice', 'usr_bob');
        expect(true).toBe(false);
      } catch (err: any) {
        expect(err instanceof AuthorizationError).toBe(true);
        expect(err.details?.code).toBe('OWNERSHIP_VIOLATION');
        expect(err.details?.authorizedUserId).toBe('usr_bob');
        expect(err.details?.entityOwnerId).toBe('usr_alice');
      }
    });

    it('throws AuthorizationError when entity owner is null or undefined', () => {
      expect(() => assertOwnership(null, 'usr_bob')).toThrow(AuthorizationError);
      expect(() => assertOwnership(undefined, 'usr_bob')).toThrow(AuthorizationError);
    });
  });

  describe('2. buildOwnerWhere() Query Construction', () => {
    it('scopes query to userId and deletedAt: null by default', () => {
      const where = buildOwnerWhere('usr_customer_1');
      expect(where.deletedAt).toBeNull();
      expect(where.userId).toBe('usr_customer_1');
    });

    it('supports custom owner field name such as customerId', () => {
      const where = buildOwnerWhere('usr_customer_1', { status: 'PENDING' }, 'customerId');
      expect(where.deletedAt).toBeNull();
      expect(where.customerId).toBe('usr_customer_1');
      expect(where.status).toBe('PENDING');
    });
  });

  describe('3. BaseRepository Entity Assertions & Scoping', () => {
    const customerAlice: ActorContext = {
      userId: 'usr_alice',
      roles: [SystemRoleCode.CUSTOMER],
      permissions: ['orders:read'],
    };

    const customerBob: ActorContext = {
      userId: 'usr_bob',
      roles: [SystemRoleCode.CUSTOMER],
      permissions: ['orders:read'],
    };

    const superAdmin: ActorContext = {
      userId: 'usr_super',
      roles: [SystemRoleCode.SUPER_ADMIN],
      permissions: ['*'],
    };

    it('assertEntityOwnership permits direct owner', () => {
      expect(() =>
        repo.testAssertEntityOwnership({ id: 'res_1', userId: 'usr_alice' }, customerAlice)
      ).not.toThrow();
    });

    it('assertEntityOwnership grants Super Admin bypass', () => {
      expect(() =>
        repo.testAssertEntityOwnership({ id: 'res_1', userId: 'usr_alice' }, superAdmin)
      ).not.toThrow();
    });

    it('assertEntityOwnership denies non-owner customer with OWNERSHIP_VIOLATION', () => {
      expect(() =>
        repo.testAssertEntityOwnership({ id: 'res_1', userId: 'usr_alice' }, customerBob)
      ).toThrow(AuthorizationError);
    });

    it('assertEntityTenant permits matching merchant sellerId', () => {
      const sellerActor: ActorContext = {
        userId: 'usr_seller_1',
        roles: [SystemRoleCode.SELLER_OWNER],
        permissions: ['seller:read'],
        sellerId: 'sel_store_apex',
      };

      expect(() =>
        repo.testAssertEntityTenant({ id: 'itm_1', sellerId: 'sel_store_apex' }, sellerActor)
      ).not.toThrow();
    });

    it('assertEntityTenant denies foreign merchant with TENANT_VIOLATION', () => {
      const sellerActor: ActorContext = {
        userId: 'usr_seller_1',
        roles: [SystemRoleCode.SELLER_OWNER],
        permissions: ['seller:read'],
        sellerId: 'sel_store_apex',
      };

      try {
        repo.testAssertEntityTenant({ id: 'itm_1', sellerId: 'sel_store_walton' }, sellerActor);
        expect(true).toBe(false);
      } catch (err: any) {
        expect(err instanceof AuthorizationError).toBe(true);
        expect(err.details?.code).toBe('TENANT_VIOLATION');
      }
    });

    it('buildActorScopedWhere automatically adjusts criteria for SuperAdmin, Seller, and Customer', () => {
      const sellerActor: ActorContext = {
        userId: 'usr_seller_1',
        roles: [SystemRoleCode.SELLER_OWNER],
        permissions: ['seller:read'],
        sellerId: 'sel_store_apex',
      };

      const superWhere = repo.testBuildActorScopedWhere(superAdmin, {}, { active: true });
      expect(superWhere.deletedAt).toBeNull();
      expect(superWhere.userId).toBeUndefined();
      expect(superWhere.sellerId).toBeUndefined();

      const sellerWhere = repo.testBuildActorScopedWhere(sellerActor, {}, { active: true });
      expect(sellerWhere.deletedAt).toBeNull();
      expect(sellerWhere.sellerId).toBe('sel_store_apex');

      const customerWhere = repo.testBuildActorScopedWhere(customerAlice, {}, { active: true });
      expect(customerWhere.deletedAt).toBeNull();
      expect(customerWhere.userId).toBe('usr_alice');
    });
  });

  describe('4. CartRepository Ownership Assertion', () => {
    const customerAlice: ActorContext = {
      userId: 'usr_alice',
      roles: [SystemRoleCode.CUSTOMER],
      permissions: ['orders:read'],
    };

    const customerBob: ActorContext = {
      userId: 'usr_bob',
      roles: [SystemRoleCode.CUSTOMER],
      permissions: ['orders:read'],
    };

    it('assertCartOwnership succeeds when cart belongs to actor', () => {
      const cart = { id: 'crt_1', userId: 'usr_alice' };
      expect(() => cartRepo.assertCartOwnership(cart, customerAlice)).not.toThrow();
    });

    it('assertCartOwnership throws OWNERSHIP_VIOLATION when cart belongs to another user', () => {
      const cart = { id: 'crt_1', userId: 'usr_alice' };
      try {
        cartRepo.assertCartOwnership(cart, customerBob);
        expect(true).toBe(false);
      } catch (err: any) {
        expect(err instanceof AuthorizationError).toBe(true);
        expect(err.details?.code).toBe('OWNERSHIP_VIOLATION');
      }
    });
  });

  describe('5. OrderRepository Access Assertions Across Roles', () => {
    const customerAlice: ActorContext = {
      userId: 'usr_alice',
      roles: [SystemRoleCode.CUSTOMER],
      permissions: ['orders:read'],
    };

    const customerBob: ActorContext = {
      userId: 'usr_bob',
      roles: [SystemRoleCode.CUSTOMER],
      permissions: ['orders:read'],
    };

    const sellerWalton: ActorContext = {
      userId: 'usr_walton_owner',
      roles: [SystemRoleCode.SELLER_OWNER],
      permissions: ['seller:read'],
      sellerId: 'sel_walton',
    };

    const sellerApex: ActorContext = {
      userId: 'usr_apex_owner',
      roles: [SystemRoleCode.SELLER_OWNER],
      permissions: ['seller:read'],
      sellerId: 'sel_apex',
    };

    const assignedRider: ActorContext = {
      userId: 'usr_rider_assigned',
      roles: [SystemRoleCode.RIDER],
      permissions: ['rider:location:update'],
    };

    const unassignedRider: ActorContext = {
      userId: 'usr_rider_unassigned',
      roles: [SystemRoleCode.RIDER],
      permissions: ['rider:location:update'],
    };

    const platformAdmin: ActorContext = {
      userId: 'usr_admin',
      roles: [SystemRoleCode.ADMIN],
      permissions: ['orders:read'],
    };

    const mockOrder = {
      id: 'ord_123',
      customerId: 'usr_alice',
      fulfillmentGroups: [
        {
          id: 'sfg_walton',
          sellerId: 'sel_walton',
          shipments: [
            {
              id: 'shp_1',
              riderId: 'usr_rider_assigned',
            },
          ],
        },
      ],
    };

    it('allows customer to access own order', () => {
      expect(() => orderRepo.assertOrderAccess(mockOrder, customerAlice)).not.toThrow();
    });

    it('denies customer from accessing another customer\'s order (OWNERSHIP_VIOLATION)', () => {
      expect(() => orderRepo.assertOrderAccess(mockOrder, customerBob)).toThrow(AuthorizationError);
    });

    it('allows seller to access order containing their fulfillment group', () => {
      expect(() => orderRepo.assertOrderAccess(mockOrder, sellerWalton)).not.toThrow();
    });

    it('denies seller from accessing order of another merchant (TENANT_VIOLATION)', () => {
      try {
        orderRepo.assertOrderAccess(mockOrder, sellerApex);
        expect(true).toBe(false);
      } catch (err: any) {
        expect(err instanceof AuthorizationError).toBe(true);
        expect(err.details?.code).toBe('TENANT_VIOLATION');
      }
    });

    it('allows assigned rider to access order', () => {
      expect(() => orderRepo.assertOrderAccess(mockOrder, assignedRider)).not.toThrow();
    });

    it('denies unassigned rider from accessing order (OWNERSHIP_VIOLATION)', () => {
      try {
        orderRepo.assertOrderAccess(mockOrder, unassignedRider);
        expect(true).toBe(false);
      } catch (err: any) {
        expect(err instanceof AuthorizationError).toBe(true);
        expect(err.details?.code).toBe('OWNERSHIP_VIOLATION');
      }
    });

    it('allows platform administrator global inspection', () => {
      expect(() => orderRepo.assertOrderAccess(mockOrder, platformAdmin)).not.toThrow();
    });
  });
});
