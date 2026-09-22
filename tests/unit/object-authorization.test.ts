/**
 * Unit Tests: Server-Side Object-Level Authorization & Ownership Verification
 * 
 * Tests ObjectAuthorizationService:
 * 1. OwnershipRelation classification (DIRECT_OWNER, TENANT_OWNER, TENANT_STAFF, ASSIGNED_ACTOR, PLATFORM_ADMIN, PLATFORM_SUPER_ADMIN, PUBLIC, NONE)
 * 2. Account lifecycle enforcement (SUSPENDED / DELETED accounts blocked)
 * 3. Super Administrator global bypass
 * 4. Customer order ownership, fulfillment group merchant isolation, rider route assignment, and cancellation invariants
 * 5. Customer profile self-ownership and anti-tampering privilege escalation barriers
 * 6. Product catalog public browsing vs merchant-isolated draft authoring
 * 7. Wallet double-entry isolation and Gate-05 Maker-Checker dual authorization
 * 8. Dynamic metadata resolver integration and NotFoundError dispatch
 * 
 * Invariants: ADR-0003, ADR-0006, ADR-0022, ADR-0023, Gate-05, Milestone 047
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import {
  ObjectAuthorizationService,
  defaultObjectAuthzService,
} from '@/shared/authz/object-authorization.service';
import { ActorContext, PolicyEngine } from '@/shared/authz';
import { SystemRoleCode } from '@/features/identity/types';
import { AuthorizationError, NotFoundError, ComplianceGateError } from '@/shared/errors/app-error';

describe('Object-Level Authorization & Ownership Verification Suite (Milestone 047)', () => {
  let service: ObjectAuthorizationService;

  beforeEach(() => {
    service = new ObjectAuthorizationService();
  });

  describe('1. OwnershipRelation Classification', () => {
    it('identifies PLATFORM_SUPER_ADMIN regardless of object details', () => {
      const actor: ActorContext = {
        userId: 'usr_super',
        roles: [SystemRoleCode.SUPER_ADMIN],
        permissions: ['*'],
      };
      const relation = service.classifyRelation(actor, {
        type: 'ORDER',
        id: 'ord_123',
        ownerId: 'usr_someone_else',
        sellerId: 'sel_someone_else',
      });
      expect(relation).toBe('PLATFORM_SUPER_ADMIN');
    });

    it('identifies DIRECT_OWNER when actor matches ownerId', () => {
      const actor: ActorContext = {
        userId: 'usr_customer_1',
        roles: [SystemRoleCode.CUSTOMER],
        permissions: ['orders:read'],
      };
      const relation = service.classifyRelation(actor, {
        type: 'ORDER',
        id: 'ord_123',
        ownerId: 'usr_customer_1',
      });
      expect(relation).toBe('DIRECT_OWNER');
    });

    it('identifies DIRECT_OWNER for user/customer resources when id matches actor userId', () => {
      const actor: ActorContext = {
        userId: 'usr_customer_1',
        roles: [SystemRoleCode.CUSTOMER],
        permissions: ['users:read'],
      };
      const relation = service.classifyRelation(actor, {
        type: 'CUSTOMER',
        id: 'usr_customer_1',
      });
      expect(relation).toBe('DIRECT_OWNER');
    });

    it('identifies TENANT_OWNER when actor is SELLER_OWNER and sellerId matches', () => {
      const actor: ActorContext = {
        userId: 'usr_merchant_1',
        roles: [SystemRoleCode.SELLER_OWNER],
        permissions: ['seller:profile:manage'],
        sellerId: 'sel_apex_store',
      };
      const relation = service.classifyRelation(actor, {
        type: 'PRODUCT',
        id: 'prd_shoe_1',
        sellerId: 'sel_apex_store',
      });
      expect(relation).toBe('TENANT_OWNER');
    });

    it('identifies TENANT_STAFF when actor is SELLER_STAFF and sellerId matches', () => {
      const actor: ActorContext = {
        userId: 'usr_staff_1',
        roles: [SystemRoleCode.SELLER_STAFF],
        permissions: ['seller:staff:read'],
        sellerId: 'sel_apex_store',
      };
      const relation = service.classifyRelation(actor, {
        type: 'ORDER',
        id: 'ord_123',
        sellerId: 'sel_apex_store',
      });
      expect(relation).toBe('TENANT_STAFF');
    });

    it('identifies ASSIGNED_ACTOR when actor matches assignedActorId (e.g. delivery rider)', () => {
      const actor: ActorContext = {
        userId: 'usr_rider_1',
        roles: [SystemRoleCode.RIDER],
        permissions: ['rider:location:update'],
      };
      const relation = service.classifyRelation(actor, {
        type: 'SHIPMENT',
        id: 'shp_123',
        assignedActorId: 'usr_rider_1',
      });
      expect(relation).toBe('ASSIGNED_ACTOR');
    });

    it('identifies PLATFORM_ADMIN when actor is ADMIN without direct ownership', () => {
      const actor: ActorContext = {
        userId: 'usr_admin_1',
        roles: [SystemRoleCode.ADMIN],
        permissions: ['orders:read'],
      };
      const relation = service.classifyRelation(actor, {
        type: 'ORDER',
        id: 'ord_123',
        ownerId: 'usr_customer_1',
      });
      expect(relation).toBe('PLATFORM_ADMIN');
    });

    it('identifies PUBLIC when object is marked isPublic: true', () => {
      const actor: ActorContext = {
        userId: 'usr_guest',
        roles: [SystemRoleCode.CUSTOMER],
        permissions: [],
      };
      const relation = service.classifyRelation(actor, {
        type: 'PRODUCT',
        id: 'prd_public_1',
        isPublic: true,
      });
      expect(relation).toBe('PUBLIC');
    });

    it('identifies NONE when actor has no affiliation or ownership', () => {
      const actor: ActorContext = {
        userId: 'usr_customer_attacker',
        roles: [SystemRoleCode.CUSTOMER],
        permissions: ['orders:read'],
      };
      const relation = service.classifyRelation(actor, {
        type: 'ORDER',
        id: 'ord_victim_1',
        ownerId: 'usr_customer_victim',
        sellerId: 'sel_store_1',
      });
      expect(relation).toBe('NONE');
    });
  });

  describe('2. Account Lifecycle Enforcement', () => {
    it('blocks suspended actors from accessing any object (ACCOUNT_SUSPENDED)', async () => {
      const suspendedActor: ActorContext = {
        userId: 'usr_suspended_1',
        roles: [SystemRoleCode.CUSTOMER],
        permissions: ['orders:read'],
        status: 'SUSPENDED',
      };

      const decision = await service.evaluate({
        action: 'read',
        actor: suspendedActor,
        object: {
          type: 'ORDER',
          id: 'ord_1',
          ownerId: 'usr_suspended_1',
        },
      });

      expect(decision.granted).toBe(false);
      expect(decision.code).toBe('ACCOUNT_SUSPENDED');
    });

    it('blocks soft-deleted actors from accessing any object (ACCOUNT_SUSPENDED)', async () => {
      const deletedActor: ActorContext = {
        userId: 'usr_deleted_1',
        roles: [SystemRoleCode.CUSTOMER],
        permissions: ['orders:read'],
        status: 'DELETED',
      };

      const decision = await service.evaluate({
        action: 'read',
        actor: deletedActor,
        object: {
          type: 'ORDER',
          id: 'ord_1',
          ownerId: 'usr_deleted_1',
        },
      });

      expect(decision.granted).toBe(false);
      expect(decision.code).toBe('ACCOUNT_SUSPENDED');
    });
  });

  describe('3. Customer Orders Object-Level Authorization', () => {
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

    it('allows a customer to read their own placed order', async () => {
      const decision = await service.evaluate({
        action: 'read',
        actor: customerAlice,
        object: {
          type: 'ORDER',
          id: 'ord_alice_1',
          ownerId: 'usr_alice',
          status: 'PENDING',
        },
      });

      expect(decision.granted).toBe(true);
      expect(decision.code).toBe('GRANTED');
      expect(decision.relation).toBe('DIRECT_OWNER');
    });

    it('strictly forbids a customer from reading another customer\'s order (OWNERSHIP_VIOLATION)', async () => {
      const decision = await service.evaluate({
        action: 'read',
        actor: customerBob,
        object: {
          type: 'ORDER',
          id: 'ord_alice_1',
          ownerId: 'usr_alice',
          status: 'PENDING',
        },
      });

      expect(decision.granted).toBe(false);
      expect(decision.code).toBe('OWNERSHIP_VIOLATION');
      expect(decision.relation).toBe('NONE');
    });

    it('allows a customer to cancel their own order in PENDING status', async () => {
      const decision = await service.evaluate({
        action: 'cancel',
        actor: customerAlice,
        object: {
          type: 'ORDER',
          id: 'ord_alice_1',
          ownerId: 'usr_alice',
          status: 'PENDING',
        },
      });

      expect(decision.granted).toBe(true);
      expect(decision.code).toBe('GRANTED');
    });

    it('blocks a customer from cancelling an order in DELIVERED or SHIPPED status', async () => {
      const decision = await service.evaluate({
        action: 'cancel',
        actor: customerAlice,
        object: {
          type: 'ORDER',
          id: 'ord_alice_1',
          ownerId: 'usr_alice',
          status: 'DELIVERED',
        },
      });

      expect(decision.granted).toBe(false);
      expect(decision.code).toBe('FORBIDDEN');
      expect(decision.reason).toContain("cannot be cancelled in 'DELIVERED'");
    });

    it('allows a merchant to view an order containing their fulfillment group', async () => {
      const sellerActor: ActorContext = {
        userId: 'usr_merchant_walton',
        roles: [SystemRoleCode.SELLER_OWNER],
        permissions: ['seller:read'],
        sellerId: 'sel_walton_store',
      };

      const decision = await service.evaluate({
        action: 'read',
        actor: sellerActor,
        object: {
          type: 'ORDER',
          id: 'ord_123',
          ownerId: 'usr_alice',
          sellerId: 'sel_walton_store',
        },
      });

      expect(decision.granted).toBe(true);
      expect(decision.code).toBe('GRANTED');
      expect(decision.relation).toBe('TENANT_OWNER');
    });

    it('blocks a merchant from viewing an order belonging exclusively to another merchant (TENANT_VIOLATION)', async () => {
      const sellerActor: ActorContext = {
        userId: 'usr_merchant_walton',
        roles: [SystemRoleCode.SELLER_OWNER],
        permissions: ['seller:read'],
        sellerId: 'sel_walton_store',
      };

      const decision = await service.evaluate({
        action: 'read',
        actor: sellerActor,
        object: {
          type: 'ORDER',
          id: 'ord_123',
          ownerId: 'usr_alice',
          sellerId: 'sel_apex_store', // Different merchant!
        },
      });

      expect(decision.granted).toBe(false);
      expect(decision.code).toBe('TENANT_VIOLATION');
    });
  });

  describe('4. Customer Profile & Privilege Escalation Barriers', () => {
    const customerActor: ActorContext = {
      userId: 'usr_customer_charlie',
      roles: [SystemRoleCode.CUSTOMER],
      permissions: ['catalog:read'],
    };

    it('allows customer to update own profile attributes (name, avatarUrl)', async () => {
      const decision = await service.evaluate({
        action: 'update',
        actor: customerActor,
        object: {
          type: 'CUSTOMER',
          id: 'usr_customer_charlie',
          ownerId: 'usr_customer_charlie',
          data: { name: 'Charlie Khan', avatarUrl: 'https://cdn.alifworld.com/pic.jpg' },
        },
      });

      expect(decision.granted).toBe(true);
      expect(decision.code).toBe('GRANTED');
    });

    it('strictly forbids customer from escalating privileges (modifying roles, status, balance)', async () => {
      const decision = await service.evaluate({
        action: 'update',
        actor: customerActor,
        object: {
          type: 'CUSTOMER',
          id: 'usr_customer_charlie',
          ownerId: 'usr_customer_charlie',
          data: { roles: [SystemRoleCode.SUPER_ADMIN], walletBalance: 1000000 },
        },
      });

      expect(decision.granted).toBe(false);
      expect(decision.code).toBe('PRIVILEGE_ESCALATION');
      expect(decision.reason).toContain('Customers cannot modify protected security fields');
    });

    it('blocks a customer from modifying another customer profile (OWNERSHIP_VIOLATION)', async () => {
      const decision = await service.evaluate({
        action: 'update',
        actor: customerActor,
        object: {
          type: 'CUSTOMER',
          id: 'usr_customer_other',
          ownerId: 'usr_customer_other',
          data: { name: 'Tampered Name' },
        },
      });

      expect(decision.granted).toBe(false);
      expect(decision.code).toBe('OWNERSHIP_VIOLATION');
    });
  });

  describe('5. Product Catalog & Draft Authoring Scoping', () => {
    it('allows public read for published products', async () => {
      const guestActor: ActorContext = {
        userId: 'usr_guest',
        roles: [],
        permissions: [],
      };

      const decision = await service.evaluate({
        action: 'read',
        actor: guestActor,
        object: {
          type: 'CATALOG',
          id: 'prd_walton_phone',
          sellerId: 'sel_walton',
          status: 'PUBLISHED',
          isPublic: true,
        },
      });

      expect(decision.granted).toBe(true);
      expect(decision.code).toBe('GRANTED');
    });

    it('hides unpublished draft products from unauthorized users', async () => {
      const customerActor: ActorContext = {
        userId: 'usr_customer_1',
        roles: [SystemRoleCode.CUSTOMER],
        permissions: ['catalog:read'],
      };

      const decision = await service.evaluate({
        action: 'read',
        actor: customerActor,
        object: {
          type: 'CATALOG',
          id: 'prd_draft_phone',
          sellerId: 'sel_walton',
          status: 'DRAFT',
          isPublic: false,
        },
      });

      expect(decision.granted).toBe(false);
      expect(decision.code).toBe('FORBIDDEN');
    });

    it('allows merchant owner to view their own draft products', async () => {
      const sellerActor: ActorContext = {
        userId: 'usr_walton_owner',
        roles: [SystemRoleCode.SELLER_OWNER],
        permissions: ['seller:read', 'catalog:write'],
        sellerId: 'sel_walton',
      };

      const decision = await service.evaluate({
        action: 'read',
        actor: sellerActor,
        object: {
          type: 'CATALOG',
          id: 'prd_draft_phone',
          sellerId: 'sel_walton',
          status: 'DRAFT',
        },
      });

      expect(decision.granted).toBe(true);
      expect(decision.code).toBe('GRANTED');
    });

    it('blocks merchant from updating catalog items belonging to a different store (TENANT_VIOLATION)', async () => {
      const sellerActor: ActorContext = {
        userId: 'usr_walton_owner',
        roles: [SystemRoleCode.SELLER_OWNER],
        permissions: ['catalog:write'],
        sellerId: 'sel_walton',
      };

      const decision = await service.evaluate({
        action: 'update',
        actor: sellerActor,
        object: {
          type: 'CATALOG',
          id: 'prd_apex_shoes',
          sellerId: 'sel_apex', // Foreign store
          status: 'ACTIVE',
        },
      });

      expect(decision.granted).toBe(false);
      expect(decision.code).toBe('TENANT_VIOLATION');
    });
  });

  describe('6. Financial Wallet & Gate-05 Maker-Checker Enforcement', () => {
    const financeOperator: ActorContext = {
      userId: 'usr_finance_maker',
      roles: [SystemRoleCode.ADMIN],
      permissions: ['finance:payout', 'finance:adjust'],
    };

    it('enforces Gate-05: High-value payout requires distinct maker and checker', async () => {
      // 60,000 BDT = 6,000,000 poisha (exceeds 5,000,000 threshold)
      const decision = await service.evaluate({
        action: 'payout',
        actor: financeOperator,
        object: {
          type: 'WALLET',
          id: 'wal_high_value',
          data: {
            amountPoisha: 6000000n,
            makerId: 'usr_finance_maker',
            // No checkerId provided!
          },
        },
      });

      expect(decision.granted).toBe(false);
      expect(decision.code).toBe('MAKER_CHECKER_REQUIRED');
    });

    it('rejects self-checking on high-value financial operations', async () => {
      const decision = await service.evaluate({
        action: 'payout',
        actor: financeOperator,
        object: {
          type: 'WALLET',
          id: 'wal_high_value',
          data: {
            amountPoisha: 6000000n,
            makerId: 'usr_finance_maker',
            checkerId: 'usr_finance_maker', // Same actor cannot self-approve!
          },
        },
      });

      expect(decision.granted).toBe(false);
      expect(decision.code).toBe('MAKER_CHECKER_REQUIRED');
    });

    it('approves high-value operation when distinct secondary checker is present', async () => {
      const decision = await service.evaluate({
        action: 'payout',
        actor: financeOperator,
        object: {
          type: 'WALLET',
          id: 'wal_high_value',
          data: {
            amountPoisha: 6000000n,
            makerId: 'usr_finance_maker',
            checkerId: 'usr_finance_checker_distinct',
          },
        },
      });

      expect(decision.granted).toBe(true);
      expect(decision.code).toBe('GRANTED');
    });
  });

  describe('7. Dynamic Resolvers & Error Handling', () => {
    it('supports custom resolver registration and evaluation', async () => {
      service.registerResolver('CUSTOM_ASSET', async (id: string) => {
        if (id === 'asset_42') {
          return {
            type: 'CUSTOM_ASSET',
            id: 'asset_42',
            ownerId: 'usr_alice',
            status: 'ACTIVE',
          };
        }
        return null;
      });

      const aliceActor: ActorContext = {
        userId: 'usr_alice',
        roles: [SystemRoleCode.CUSTOMER],
        permissions: ['users:read'],
      };

      const resolved = await service.resolve('CUSTOM_ASSET', 'asset_42');
      expect(resolved).not.toBeNull();
      expect(resolved?.ownerId).toBe('usr_alice');

      // Non-existent entity returns null
      const missing = await service.resolve('CUSTOM_ASSET', 'asset_999');
      expect(missing).toBeNull();
    });

    it('resolveAndAssert throws NotFoundError for unknown object identifiers', async () => {
      const aliceActor: ActorContext = {
        userId: 'usr_alice',
        roles: [SystemRoleCode.CUSTOMER],
        permissions: ['orders:read'],
      };

      expect(
        service.resolveAndAssert(aliceActor, 'read', 'ORDER', 'non_existent_id')
      ).rejects.toThrow(NotFoundError);
    });

    it('assert throws AuthorizationError with diagnostic details on violation', async () => {
      const attacker: ActorContext = {
        userId: 'usr_attacker',
        roles: [SystemRoleCode.CUSTOMER],
        permissions: ['orders:read'],
      };

      try {
        await service.assert({
          action: 'read',
          actor: attacker,
          object: {
            type: 'ORDER',
            id: 'ord_victim',
            ownerId: 'usr_victim',
          },
        });
        expect(true).toBe(false); // Should not reach here
      } catch (err: any) {
        expect(err instanceof AuthorizationError).toBe(true);
        expect(err.details?.code).toBe('OWNERSHIP_VIOLATION');
      }
    });
  });
});
