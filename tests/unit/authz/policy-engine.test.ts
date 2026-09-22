/**
 * Comprehensive Unit Tests: Server-Side Authorization Policy Engine (Milestone 042)
 * 
 * Verifies:
 * 1. UserPolicy: Self-ownership, privilege escalation prevention, admin actions
 * 2. SellerPolicy: Multi-tenant store isolation, cross-tenant denial, SuperAdmin bypass
 * 3. CatalogPolicy: Public storefront reads, draft/archive privacy, merchant tenant scoping
 * 4. OrderPolicy: Customer order privacy, seller fulfillment group scoping, cancellation gates
 * 5. WalletPolicy: Wallet privacy, double-entry ledger posting, Gate-05 maker-checker dual authorization
 * 6. RolePolicy: Role delegation barriers, SuperAdmin escalation prevention, tenant scoping
 * 7. PolicyEngine: Lifecycle suspension check, fallback permission evaluation, audit trail integration
 * 
 * Invariants: ADR-0003, ADR-0006, ADR-0021, ADR-0022, ADR-0023, Milestone 042
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import {
  PolicyEngine,
  ActorContext,
  ResourceContext,
  UserPolicy,
  SellerPolicy,
  CatalogPolicy,
  OrderPolicy,
  WalletPolicy,
  RolePolicy,
} from '@/shared/authz';
import { AuthorizationError, ComplianceGateError } from '@/shared/errors/app-error';
import { SystemRoleCode } from '@/features/identity/types';

// Mock Audit Service capturing emitted events
class MockAuditService {
  public loggedEntries: any[] = [];

  async log(entry: any): Promise<void> {
    this.loggedEntries.push(entry);
  }
}

describe('Authorization Policy Engine Suite (Milestone 042)', () => {
  let mockAuditService: MockAuditService;
  let engine: PolicyEngine;

  beforeEach(() => {
    mockAuditService = new MockAuditService();
    engine = new PolicyEngine(mockAuditService as any);
  });

  // ── 1. UserPolicy Tests ──────────────────────────────────────────────────

  describe('UserPolicy (Self-Ownership & Privilege Escalation)', () => {
    const userPolicy = new UserPolicy();

    it('allows a user to read and update their own profile', () => {
      const actor: ActorContext = {
        userId: 'usr_customer_01',
        roles: [SystemRoleCode.CUSTOMER],
        permissions: [],
      };
      const resource: ResourceContext = {
        type: 'USER',
        id: 'usr_customer_01',
      };

      const readDec = userPolicy.evaluate(actor, 'read', resource);
      expect(readDec.granted).toBe(true);
      expect(readDec.code).toBe('GRANTED');

      const updateDec = userPolicy.evaluate(actor, 'update', resource);
      expect(updateDec.granted).toBe(true);
    });

    it('blocks a user from updating another user profile without users:write', () => {
      const actor: ActorContext = {
        userId: 'usr_customer_01',
        roles: [SystemRoleCode.CUSTOMER],
        permissions: [],
      };
      const resource: ResourceContext = {
        type: 'USER',
        id: 'usr_customer_02',
      };

      const dec = userPolicy.evaluate(actor, 'update', resource);
      expect(dec.granted).toBe(false);
      expect(dec.code).toBe('FORBIDDEN');
    });

    it('blocks a standard admin from modifying or suspending a Super Admin (Privilege Escalation)', () => {
      const adminActor: ActorContext = {
        userId: 'usr_admin_01',
        roles: [SystemRoleCode.ADMIN],
        permissions: ['users:write', 'users:suspend', 'users:delete'],
      };
      const superAdminResource: ResourceContext = {
        type: 'USER',
        id: 'usr_superadmin_01',
        data: { roles: [SystemRoleCode.SUPER_ADMIN] },
      };

      const updateDec = userPolicy.evaluate(adminActor, 'update', superAdminResource);
      expect(updateDec.granted).toBe(false);
      expect(updateDec.code).toBe('PRIVILEGE_ESCALATION');

      const suspendDec = userPolicy.evaluate(adminActor, 'suspend', superAdminResource);
      expect(suspendDec.granted).toBe(false);
      expect(suspendDec.code).toBe('PRIVILEGE_ESCALATION');
    });

    it('prevents a user from suspending or deleting their own account', () => {
      const actor: ActorContext = {
        userId: 'usr_admin_01',
        roles: [SystemRoleCode.ADMIN],
        permissions: ['users:suspend', 'users:delete'],
      };
      const selfResource: ResourceContext = {
        type: 'USER',
        id: 'usr_admin_01',
      };

      expect(userPolicy.evaluate(actor, 'suspend', selfResource).granted).toBe(false);
      expect(userPolicy.evaluate(actor, 'delete', selfResource).granted).toBe(false);
    });
  });

  // ── 2. SellerPolicy Tests ────────────────────────────────────────────────

  describe('SellerPolicy (Multi-Tenant Isolation)', () => {
    const sellerPolicy = new SellerPolicy();
    const STORE_DHAKA = 'sel_dhaka_01';
    const STORE_CTG = 'sel_ctg_02';

    it('grants Super Administrator global access across all seller tenants', () => {
      const superAdmin: ActorContext = {
        userId: 'usr_superadmin_01',
        roles: [SystemRoleCode.SUPER_ADMIN],
        permissions: [],
      };

      const dec = sellerPolicy.evaluate(superAdmin, 'manage', { type: 'SELLER', id: STORE_DHAKA });
      expect(dec.granted).toBe(true);
      expect(dec.code).toBe('GRANTED');
    });

    it('permits a Store Owner to manage their own store', () => {
      const sellerOwner: ActorContext = {
        userId: 'usr_seller_dhaka',
        roles: [SystemRoleCode.SELLER_OWNER],
        permissions: ['seller:profile:manage'],
        sellerId: STORE_DHAKA,
      };

      const dec = sellerPolicy.evaluate(sellerOwner, 'manage', { type: 'SELLER', id: STORE_DHAKA });
      expect(dec.granted).toBe(true);
    });

    it('strictly denies cross-tenant access between different merchants (TENANT_VIOLATION)', () => {
      const sellerDhaka: ActorContext = {
        userId: 'usr_seller_dhaka',
        roles: [SystemRoleCode.SELLER_OWNER],
        permissions: ['seller:profile:manage'],
        sellerId: STORE_DHAKA,
      };

      const dec = sellerPolicy.evaluate(sellerDhaka, 'manage', { type: 'SELLER', id: STORE_CTG });
      expect(dec.granted).toBe(false);
      expect(dec.code).toBe('TENANT_VIOLATION');
      expect(dec.reason).toContain('Cross-tenant access violation');
    });

    it('prohibits customers from managing merchant settings', () => {
      const customer: ActorContext = {
        userId: 'usr_customer_01',
        roles: [SystemRoleCode.CUSTOMER],
        permissions: [],
      };

      const dec = sellerPolicy.evaluate(customer, 'manage', { type: 'SELLER', id: STORE_DHAKA });
      expect(dec.granted).toBe(false);
    });
  });

  // ── 3. CatalogPolicy Tests ───────────────────────────────────────────────

  describe('CatalogPolicy (Storefront Browsing & Merchant Authoring)', () => {
    const catalogPolicy = new CatalogPolicy();
    const STORE_DHAKA = 'sel_dhaka_01';
    const STORE_CTG = 'sel_ctg_02';

    it('allows public access to published products', () => {
      const anonymousActor: ActorContext = {
        userId: 'anonymous',
        roles: [],
        permissions: [],
      };

      const publishedProduct: ResourceContext = {
        type: 'PRODUCT',
        id: 'prd_01',
        status: 'PUBLISHED',
      };

      const dec = catalogPolicy.evaluate(anonymousActor, 'read', publishedProduct);
      expect(dec.granted).toBe(true);
    });

    it('hides draft products from public, but allows access to store owner', () => {
      const customerActor: ActorContext = {
        userId: 'usr_customer_01',
        roles: [SystemRoleCode.CUSTOMER],
        permissions: [],
      };
      const merchantActor: ActorContext = {
        userId: 'usr_seller_01',
        roles: [SystemRoleCode.SELLER_OWNER],
        permissions: [],
        sellerId: STORE_DHAKA,
      };

      const draftProduct: ResourceContext = {
        type: 'PRODUCT',
        id: 'prd_draft_01',
        status: 'DRAFT',
        sellerId: STORE_DHAKA,
      };

      // Customer denied
      expect(catalogPolicy.evaluate(customerActor, 'read', draftProduct).granted).toBe(false);

      // Merchant owner granted
      expect(catalogPolicy.evaluate(merchantActor, 'read', draftProduct).granted).toBe(true);
    });

    it('blocks merchant from creating or updating products in another store (TENANT_VIOLATION)', () => {
      const merchantDhaka: ActorContext = {
        userId: 'usr_seller_dhaka',
        roles: [SystemRoleCode.SELLER_OWNER],
        permissions: ['catalog:write'],
        sellerId: STORE_DHAKA,
      };

      const ctgProduct: ResourceContext = {
        type: 'PRODUCT',
        id: 'prd_ctg_01',
        sellerId: STORE_CTG,
      };

      const dec = catalogPolicy.evaluate(merchantDhaka, 'update', ctgProduct);
      expect(dec.granted).toBe(false);
      expect(dec.code).toBe('TENANT_VIOLATION');
    });
  });

  // ── 4. OrderPolicy Tests ─────────────────────────────────────────────────

  describe('OrderPolicy (Customer Privacy & Fulfillment Tenancy)', () => {
    const orderPolicy = new OrderPolicy();
    const CUSTOMER_A = 'usr_cust_a';
    const CUSTOMER_B = 'usr_cust_b';
    const STORE_A = 'sel_store_a';
    const STORE_B = 'sel_store_b';

    it('allows a customer to view their own order, blocks viewing another customer order', () => {
      const custA: ActorContext = {
        userId: CUSTOMER_A,
        roles: [SystemRoleCode.CUSTOMER],
        permissions: ['orders:read'],
      };

      const orderA: ResourceContext = {
        type: 'ORDER',
        id: 'ord_001',
        ownerId: CUSTOMER_A,
      };

      const orderB: ResourceContext = {
        type: 'ORDER',
        id: 'ord_002',
        ownerId: CUSTOMER_B,
      };

      expect(orderPolicy.evaluate(custA, 'read', orderA).granted).toBe(true);

      const deniedDec = orderPolicy.evaluate(custA, 'read', orderB);
      expect(deniedDec.granted).toBe(false);
      expect(deniedDec.code).toBe('OWNERSHIP_VIOLATION');
    });

    it('allows seller to view orders in their fulfillment group, blocks cross-merchant inspection', () => {
      const sellerA: ActorContext = {
        userId: 'usr_seller_a',
        roles: [SystemRoleCode.SELLER_OWNER],
        permissions: ['orders:read'],
        sellerId: STORE_A,
      };

      const orderInStoreA: ResourceContext = {
        type: 'ORDER',
        id: 'ord_01',
        sellerId: STORE_A,
      };

      const orderInStoreB: ResourceContext = {
        type: 'ORDER',
        id: 'ord_02',
        sellerId: STORE_B,
      };

      expect(orderPolicy.evaluate(sellerA, 'read', orderInStoreA).granted).toBe(true);

      const crossDec = orderPolicy.evaluate(sellerA, 'read', orderInStoreB);
      expect(crossDec.granted).toBe(false);
      expect(crossDec.code).toBe('TENANT_VIOLATION');
    });

    it('allows customer to cancel own PENDING order, blocks cancellation of SHIPPED order', () => {
      const custA: ActorContext = {
        userId: CUSTOMER_A,
        roles: [SystemRoleCode.CUSTOMER],
        permissions: [],
      };

      const pendingOrder: ResourceContext = {
        type: 'ORDER',
        id: 'ord_01',
        ownerId: CUSTOMER_A,
        status: 'PENDING',
      };

      const shippedOrder: ResourceContext = {
        type: 'ORDER',
        id: 'ord_02',
        ownerId: CUSTOMER_A,
        status: 'SHIPPED',
      };

      expect(orderPolicy.evaluate(custA, 'cancel', pendingOrder).granted).toBe(true);
      expect(orderPolicy.evaluate(custA, 'cancel', shippedOrder).granted).toBe(false);
    });
  });

  // ── 5. WalletPolicy & Maker-Checker Tests ────────────────────────────────

  describe('WalletPolicy (Customer Privacy & Gate-05 Maker-Checker)', () => {
    const walletPolicy = new WalletPolicy();

    it('allows customer to read own wallet, prevents reading others', () => {
      const cust: ActorContext = {
        userId: 'usr_cust_01',
        roles: [SystemRoleCode.CUSTOMER],
        permissions: [],
      };

      const ownWallet: ResourceContext = { type: 'WALLET', ownerId: 'usr_cust_01' };
      const otherWallet: ResourceContext = { type: 'WALLET', ownerId: 'usr_cust_02' };

      expect(walletPolicy.evaluate(cust, 'read', ownWallet).granted).toBe(true);

      const dec = walletPolicy.evaluate(cust, 'read', otherWallet);
      expect(dec.granted).toBe(false);
      expect(dec.code).toBe('OWNERSHIP_VIOLATION');
    });

    it('enforces Gate-05: High-value payout requires distinct maker and checker', () => {
      const financeAdmin: ActorContext = {
        userId: 'usr_finance_maker',
        roles: [SystemRoleCode.ADMIN],
        permissions: ['finance:payout', 'finance:adjust'],
      };

      // 60,000 BDT = 6,000,000 Poisha (> 5,000,000 threshold)
      const highValuePayoutWithoutChecker: ResourceContext = {
        type: 'WALLET',
        data: {
          amountPoisha: 6000000n,
          makerId: 'usr_finance_maker',
          checkerId: null, // missing checker
        },
      };

      const decMissingChecker = walletPolicy.evaluate(financeAdmin, 'payout', highValuePayoutWithoutChecker);
      expect(decMissingChecker.granted).toBe(false);
      expect(decMissingChecker.code).toBe('MAKER_CHECKER_REQUIRED');

      // Self-approval attempt (checker === maker)
      const selfApprovalPayout: ResourceContext = {
        type: 'WALLET',
        data: {
          amountPoisha: 6000000n,
          makerId: 'usr_finance_maker',
          checkerId: 'usr_finance_maker', // same person!
        },
      };

      const decSelfApproval = walletPolicy.evaluate(financeAdmin, 'payout', selfApprovalPayout);
      expect(decSelfApproval.granted).toBe(false);
      expect(decSelfApproval.code).toBe('MAKER_CHECKER_REQUIRED');

      // Valid dual authorization with distinct checker
      const authorizedPayout: ResourceContext = {
        type: 'WALLET',
        data: {
          amountPoisha: 6000000n,
          makerId: 'usr_finance_maker',
          checkerId: 'usr_finance_checker_02', // distinct operator!
        },
      };

      const decAuthorized = walletPolicy.evaluate(financeAdmin, 'payout', authorizedPayout);
      expect(decAuthorized.granted).toBe(true);
      expect(decAuthorized.code).toBe('GRANTED');
    });
  });

  // ── 6. RolePolicy Tests ──────────────────────────────────────────────────

  describe('RolePolicy (Privilege Escalation & Seller Scoping)', () => {
    const rolePolicy = new RolePolicy();

    it('blocks regular admin from assigning SUPER_ADMIN role (Privilege Escalation)', () => {
      const admin: ActorContext = {
        userId: 'usr_admin',
        roles: [SystemRoleCode.ADMIN],
        permissions: ['roles:assign'],
      };

      const superAdminAssignment: ResourceContext = {
        type: 'ROLE',
        data: { roleCode: 'SUPER_ADMIN' },
      };

      const dec = rolePolicy.evaluate(admin, 'assign', superAdminAssignment);
      expect(dec.granted).toBe(false);
      expect(dec.code).toBe('PRIVILEGE_ESCALATION');
    });

    it('enforces sellerId requirement when assigning seller roles', () => {
      const superAdmin: ActorContext = {
        userId: 'usr_superadmin',
        roles: [SystemRoleCode.SUPER_ADMIN],
        permissions: [],
      };

      const missingSellerIdAssignment: ResourceContext = {
        type: 'ROLE',
        data: { roleCode: 'SELLER_OWNER', sellerId: null },
      };

      const dec = rolePolicy.evaluate(superAdmin, 'assign', missingSellerIdAssignment);
      expect(dec.granted).toBe(false);
      expect(dec.code).toBe('TENANT_VIOLATION');
    });
  });

  // ── 7. PolicyEngine Central Orchestration & Audit Tests ─────────────────

  describe('PolicyEngine Orchestration & Audit', () => {
    it('immediately blocks suspended user from performing any operations', async () => {
      const suspendedActor: ActorContext = {
        userId: 'usr_suspended_01',
        roles: [SystemRoleCode.CUSTOMER],
        permissions: ['catalog:read', 'orders:read'],
        status: 'SUSPENDED',
      };

      const resource: ResourceContext = { type: 'PRODUCT', id: 'prd_01', status: 'PUBLISHED' };

      const dec = await engine.evaluate(suspendedActor, 'read', resource);
      expect(dec.granted).toBe(false);
      expect(dec.code).toBe('ACCOUNT_SUSPENDED');

      // assert() must throw AuthorizationError
      await expect(engine.assert(suspendedActor, 'read', resource)).rejects.toThrow(AuthorizationError);
    });

    it('assert() logs an immutable audit event on authorization failure', async () => {
      const customer: ActorContext = {
        userId: 'usr_cust_01',
        roles: [SystemRoleCode.CUSTOMER],
        permissions: [],
        status: 'ACTIVE',
      };

      const crossOrder: ResourceContext = {
        type: 'ORDER',
        id: 'ord_foreign_01',
        ownerId: 'usr_cust_other',
      };

      await expect(engine.assert(customer, 'read', crossOrder)).rejects.toThrow(AuthorizationError);

      // Verify audit was logged
      expect(mockAuditService.loggedEntries.length).toBe(1);
      const audit = mockAuditService.loggedEntries[0];
      expect(audit.actorId).toBe('usr_cust_01');
      expect(audit.action).toBe('AUTHZ_DENIED');
      expect(audit.resource).toBe('ORDER');
      expect(audit.metadata.code).toBe('OWNERSHIP_VIOLATION');
    });

    it('assert() throws ComplianceGateError when maker-checker threshold is breached', async () => {
      const financeAdmin: ActorContext = {
        userId: 'usr_maker',
        roles: [SystemRoleCode.ADMIN],
        permissions: ['finance:adjust'],
        status: 'ACTIVE',
      };

      const highValueAdjustment: ResourceContext = {
        type: 'WALLET',
        data: {
          amountPoisha: 10000000n, // 100,000 BDT
          makerId: 'usr_maker',
          checkerId: null,
        },
      };

      await expect(engine.assert(financeAdmin, 'adjust', highValueAdjustment)).rejects.toThrow(ComplianceGateError);

      const audit = mockAuditService.loggedEntries.find((e) => e.action === 'AUTHZ_MAKER_CHECKER_REQUIRED');
      expect(audit).toBeDefined();
      expect(audit.resource).toBe('WALLET');
    });

    it('can() returns clean boolean decisions', async () => {
      const superAdmin: ActorContext = {
        userId: 'usr_superadmin',
        roles: [SystemRoleCode.SUPER_ADMIN],
        permissions: [],
        status: 'ACTIVE',
      };

      const customer: ActorContext = {
        userId: 'usr_cust',
        roles: [SystemRoleCode.CUSTOMER],
        permissions: [],
        status: 'ACTIVE',
      };

      expect(await engine.can(superAdmin, 'manage', { type: 'SELLER', id: 'sel_01' })).toBe(true);
      expect(await engine.can(customer, 'manage', { type: 'SELLER', id: 'sel_01' })).toBe(false);
    });
  });
});
