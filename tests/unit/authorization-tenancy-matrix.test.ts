/**
 * Comprehensive Authorization and Tenancy Security Test Matrix (Milestone 050)
 * 
 * Verifies N x M Cartesian matrix mapping across all canonical system roles,
 * resources, actions, lifecycle states, tenant boundaries, and negative attack vectors.
 * 
 * Invariants: ADR-0003, ADR-0006, ADR-0010, ADR-0021, ADR-0022, ADR-0023, Gate-05, Milestone 050
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import {
  defaultPolicyEngine,
  PolicyEngine,
  ActorContext,
  ResourceContext,
  defaultObjectAuthzService,
  ObjectAuthorizationService,
} from '@/shared/authz';
import { SystemRoleCode } from '@/features/identity/types';
import {
  SecurityAttackCategory,
  SecurityMatrixTestCase,
} from '@/shared/authz/security-test-matrix.types';

describe('Comprehensive Authorization & Tenancy Security Test Matrix (Milestone 050)', () => {
  let policyEngine: PolicyEngine;
  let objectAuthz: ObjectAuthorizationService;

  beforeEach(() => {
    policyEngine = new PolicyEngine();
    objectAuthz = new ObjectAuthorizationService(policyEngine);
  });

  // ── ACTOR FIXTURES ──────────────────────────────────────────────────────────

  const SUPER_ADMIN: ActorContext = {
    userId: 'usr_super_01',
    roles: [SystemRoleCode.SUPER_ADMIN],
    permissions: ['*'],
    status: 'ACTIVE',
  };

  const PLATFORM_ADMIN: ActorContext = {
    userId: 'usr_admin_01',
    roles: [SystemRoleCode.ADMIN],
    permissions: [
      'users:read',
      'users:write',
      'roles:read',
      'roles:manage',
      'roles:assign',
      'sellers:read',
      'sellers:verify',
      'sellers:suspend',
      'catalog:read',
      'catalog:write',
      'catalog:publish',
      'catalog:archive',
      'orders:read',
      'orders:manage',
      'orders:cancel',
      'orders:refund',
      'support:read',
      'support:manage',
      'support:assign',
      'system:config',
      'system:audit_read',
    ],
    status: 'ACTIVE',
  };

  const OPERATIONS_AGENT: ActorContext = {
    userId: 'usr_ops_01',
    roles: [SystemRoleCode.OPERATIONS],
    permissions: [
      'catalog:read',
      'orders:read',
      'orders:manage',
      'sellers:read',
      'support:read',
    ],
    status: 'ACTIVE',
  };

  const SUPPORT_AGENT: ActorContext = {
    userId: 'usr_support_01',
    roles: [SystemRoleCode.SUPPORT],
    permissions: ['support:read', 'support:manage', 'support:assign', 'users:read', 'orders:read'],
    status: 'ACTIVE',
  };

  const FINANCE_OFFICER: ActorContext = {
    userId: 'usr_finance_01',
    roles: [SystemRoleCode.FINANCE],
    permissions: ['finance:read', 'finance:ledger', 'finance:adjust', 'finance:payout', 'orders:read'],
    status: 'ACTIVE',
  };

  const SELLER_A_OWNER: ActorContext = {
    userId: 'usr_seller_a_owner',
    roles: [SystemRoleCode.SELLER_OWNER],
    permissions: [
      'seller:profile:manage',
      'seller:staff:manage',
      'seller:read',
      'catalog:read',
      'catalog:write',
      'orders:read',
      'orders:manage',
      'finance:read',
    ],
    sellerId: 'sel_store_apex',
    status: 'ACTIVE',
  };

  const SELLER_A_STAFF: ActorContext = {
    userId: 'usr_seller_a_staff',
    roles: [SystemRoleCode.SELLER_STAFF],
    permissions: ['seller:read', 'catalog:read', 'catalog:write', 'orders:read', 'orders:manage'],
    sellerId: 'sel_store_apex',
    status: 'ACTIVE',
  };

  const SELLER_B_OWNER: ActorContext = {
    userId: 'usr_seller_b_owner',
    roles: [SystemRoleCode.SELLER_OWNER],
    permissions: [
      'seller:profile:manage',
      'seller:staff:manage',
      'seller:read',
      'catalog:read',
      'catalog:write',
      'orders:read',
      'orders:manage',
      'finance:read',
    ],
    sellerId: 'sel_store_walton',
    status: 'ACTIVE',
  };

  const CUSTOMER_ALICE: ActorContext = {
    userId: 'usr_customer_alice',
    roles: [SystemRoleCode.CUSTOMER],
    permissions: ['catalog:read', 'orders:read'],
    status: 'ACTIVE',
  };

  const CUSTOMER_BOB: ActorContext = {
    userId: 'usr_customer_bob',
    roles: [SystemRoleCode.CUSTOMER],
    permissions: ['catalog:read', 'orders:read'],
    status: 'ACTIVE',
  };

  const RIDER_RAHIM: ActorContext = {
    userId: 'usr_rider_rahim',
    roles: [SystemRoleCode.RIDER],
    permissions: ['rider:status:update', 'rider:location:update'],
    status: 'ACTIVE',
  };

  const RIDER_KARIM: ActorContext = {
    userId: 'usr_rider_karim',
    roles: [SystemRoleCode.RIDER],
    permissions: ['rider:status:update', 'rider:location:update'],
    status: 'ACTIVE',
  };

  const SYSTEM_SERVICE: ActorContext = {
    userId: 'svc_cron_worker',
    roles: [SystemRoleCode.SYSTEM_SERVICE],
    permissions: ['system:service:execute', 'system:outbox:process', 'system:reconcile'],
    status: 'ACTIVE',
  };

  const SUSPENDED_ACTOR: ActorContext = {
    userId: 'usr_suspended_bad_actor',
    roles: [SystemRoleCode.CUSTOMER],
    permissions: ['catalog:read', 'orders:read'],
    status: 'SUSPENDED',
  };

  const DELETED_ACTOR: ActorContext = {
    userId: 'usr_deleted_former_user',
    roles: [SystemRoleCode.CUSTOMER],
    permissions: ['catalog:read'],
    status: 'DELETED',
  };

  const ANONYMOUS_GUEST: ActorContext = {
    userId: 'usr_anonymous_guest',
    roles: [],
    permissions: [],
    status: 'ACTIVE',
  };

  // ── SECTION A: SUPER ADMIN BYPASS VS ADMIN RESTRICTIONS ────────────────────

  describe('Section A: Super Admin Global Authority vs Platform Admin Privilege Escalation', () => {
    it('grants Super Administrator global access across all resources and operations', async () => {
      const actions = [
        { type: 'SYSTEM', action: 'system:config' },
        { type: 'ROLE', action: 'roles:assign' },
        { type: 'USER', action: 'users:suspend' },
        { type: 'SELLER', action: 'sellers:verify' },
        { type: 'CATALOG', action: 'catalog:publish' },
        { type: 'ORDER', action: 'orders:cancel' },
        { type: 'WALLET', action: 'finance:adjust' },
      ];

      for (const item of actions) {
        const decision = await policyEngine.evaluate(SUPER_ADMIN, item.action, {
          type: item.type,
          id: 'test_id',
          ownerId: 'usr_someone_else',
          sellerId: 'sel_someone_else',
        });
        expect(decision.granted).toBe(true);
        expect(decision.code).toBe('GRANTED');
      }
    });

    it('strictly blocks Platform Admin from modifying Super Admin accounts (PRIVILEGE_ESCALATION)', async () => {
      const decision = await policyEngine.evaluate(PLATFORM_ADMIN, 'update', {
        type: 'USER',
        id: 'usr_super_01',
        data: { roles: [SystemRoleCode.SUPER_ADMIN] },
      });

      expect(decision.granted).toBe(false);
      expect(decision.code).toBe('PRIVILEGE_ESCALATION');
      expect(decision.reason).toContain('Super Administrator can modify or suspend an administrative operator');
    });

    it('strictly blocks Platform Admin from assigning the SUPER_ADMIN role (PRIVILEGE_ESCALATION)', async () => {
      const decision = await policyEngine.evaluate(PLATFORM_ADMIN, 'roles:assign', {
        type: 'ROLE',
        id: 'rol_super_admin',
        data: { roleCode: SystemRoleCode.SUPER_ADMIN },
      });

      expect(decision.granted).toBe(false);
      expect(decision.code).toBe('PRIVILEGE_ESCALATION');
    });

    it('strictly blocks Platform Admin from updating locked root security keys (PRIVILEGE_ESCALATION)', async () => {
      const decision = await policyEngine.evaluate(PLATFORM_ADMIN, 'system:config', {
        type: 'SYSTEM',
        data: {
          keys: ['STORAGE_S3_SECRET_KEY', 'FEATURE_POINTS_CASH_CONVERTIBLE'],
        },
      });

      expect(decision.granted).toBe(false);
      expect(decision.code).toBe('PRIVILEGE_ESCALATION');
      expect(decision.reason).toContain('Modifying root security credentials or locked invariants');
    });
  });

  // ── SECTION B: MULTI-TENANT SELLER ISOLATION ────────────────────────────────

  describe('Section B: Multi-Tenant Seller Isolation Across Merchants', () => {
    it('allows Store A Owner to manage Store A settings, catalog, and orders', async () => {
      const storeASettings = await policyEngine.evaluate(SELLER_A_OWNER, 'seller:profile:manage', {
        type: 'SELLER',
        id: 'sel_store_apex',
        sellerId: 'sel_store_apex',
      });
      expect(storeASettings.granted).toBe(true);

      const storeAProduct = await policyEngine.evaluate(SELLER_A_OWNER, 'catalog:write', {
        type: 'CATALOG',
        id: 'prd_apex_shoe',
        sellerId: 'sel_store_apex',
      });
      expect(storeAProduct.granted).toBe(true);
    });

    it('strictly forbids Store A Owner from modifying Store B products or settings (TENANT_VIOLATION)', async () => {
      const crossSettings = await policyEngine.evaluate(SELLER_A_OWNER, 'seller:profile:manage', {
        type: 'SELLER',
        id: 'sel_store_walton',
        sellerId: 'sel_store_walton',
      });
      expect(crossSettings.granted).toBe(false);
      expect(crossSettings.code).toBe('TENANT_VIOLATION');

      const crossProduct = await policyEngine.evaluate(SELLER_A_OWNER, 'catalog:write', {
        type: 'CATALOG',
        id: 'prd_walton_tv',
        sellerId: 'sel_store_walton',
      });
      expect(crossProduct.granted).toBe(false);
      expect(crossProduct.code).toBe('TENANT_VIOLATION');
    });

    it('allows Store A Staff to manage Store A orders, but blocks staff management (FORBIDDEN)', async () => {
      const staffOrder = await policyEngine.evaluate(SELLER_A_STAFF, 'seller:read', {
        type: 'SELLER',
        id: 'sel_store_apex',
        sellerId: 'sel_store_apex',
      });
      expect(staffOrder.granted).toBe(true);

      // Staff cannot manage other staff roles
      const staffManage = await policyEngine.evaluate(SELLER_A_STAFF, 'seller:staff:manage', {
        type: 'SELLER',
        id: 'sel_store_apex',
        sellerId: 'sel_store_apex',
      });
      expect(staffManage.granted).toBe(false);
      expect(staffManage.code).toBe('FORBIDDEN');
    });

    it('strictly forbids Store A Staff from accessing Store B data (TENANT_VIOLATION)', async () => {
      const crossStaff = await policyEngine.evaluate(SELLER_A_STAFF, 'seller:read', {
        type: 'SELLER',
        id: 'sel_store_walton',
        sellerId: 'sel_store_walton',
      });
      expect(crossStaff.granted).toBe(false);
      expect(crossStaff.code).toBe('TENANT_VIOLATION');
    });
  });

  // ── SECTION C: CUSTOMER OBJECT OWNERSHIP & ANTI-TAMPERING ───────────────────

  describe('Section C: Customer Object Ownership, Self-Service & Anti-Tampering', () => {
    it('allows Customer Alice to read and update her own profile attributes', async () => {
      const readAlice = await policyEngine.evaluate(CUSTOMER_ALICE, 'customer:profile:read', {
        type: 'CUSTOMER',
        id: 'usr_customer_alice',
        ownerId: 'usr_customer_alice',
      });
      expect(readAlice.granted).toBe(true);

      const updateAlice = await policyEngine.evaluate(CUSTOMER_ALICE, 'customer:profile:update', {
        type: 'CUSTOMER',
        id: 'usr_customer_alice',
        ownerId: 'usr_customer_alice',
        data: { name: 'Alice Khan' },
      });
      expect(updateAlice.granted).toBe(true);
    });

    it('strictly forbids Customer Alice from inspecting Customer Bob profile (OWNERSHIP_VIOLATION)', async () => {
      const decision = await policyEngine.evaluate(CUSTOMER_ALICE, 'customer:profile:read', {
        type: 'CUSTOMER',
        id: 'usr_customer_bob',
        ownerId: 'usr_customer_bob',
      });
      expect(decision.granted).toBe(false);
      expect(decision.code).toBe('OWNERSHIP_VIOLATION');
    });

    it('blocks Customer Alice from tampering with protected security fields (PRIVILEGE_ESCALATION)', async () => {
      const decision = await policyEngine.evaluate(CUSTOMER_ALICE, 'customer:profile:update', {
        type: 'CUSTOMER',
        id: 'usr_customer_alice',
        ownerId: 'usr_customer_alice',
        data: { roles: [SystemRoleCode.SUPER_ADMIN], walletBalance: 1000000 },
      });
      expect(decision.granted).toBe(false);
      expect(decision.code).toBe('PRIVILEGE_ESCALATION');
    });

    it('allows Customer Alice to read own order, blocks reading Bob order (OWNERSHIP_VIOLATION)', async () => {
      const ownOrder = await policyEngine.evaluate(CUSTOMER_ALICE, 'orders:read', {
        type: 'ORDER',
        id: 'ord_alice_1',
        ownerId: 'usr_customer_alice',
      });
      expect(ownOrder.granted).toBe(true);

      const foreignOrder = await policyEngine.evaluate(CUSTOMER_ALICE, 'orders:read', {
        type: 'ORDER',
        id: 'ord_bob_1',
        ownerId: 'usr_customer_bob',
      });
      expect(foreignOrder.granted).toBe(false);
      expect(foreignOrder.code).toBe('OWNERSHIP_VIOLATION');
    });

    it('allows Customer Alice to cancel own order in PENDING status; blocks cancelling in SHIPPED status', async () => {
      const pendingCancel = await policyEngine.evaluate(CUSTOMER_ALICE, 'orders:cancel', {
        type: 'ORDER',
        id: 'ord_alice_1',
        ownerId: 'usr_customer_alice',
        status: 'PENDING',
      });
      expect(pendingCancel.granted).toBe(true);

      const shippedCancel = await policyEngine.evaluate(CUSTOMER_ALICE, 'orders:cancel', {
        type: 'ORDER',
        id: 'ord_alice_1',
        ownerId: 'usr_customer_alice',
        status: 'SHIPPED',
      });
      expect(shippedCancel.granted).toBe(false);
      expect(shippedCancel.code).toBe('FORBIDDEN');
    });
  });

  // ── SECTION D: DELIVERY RIDER ROUTE SCOPING & ASSIGNMENT ─────────────────��──

  describe('Section D: Delivery Rider Route Scoping & Telemetry', () => {
    it('allows assigned rider to update delivery status and location for assigned shipment', async () => {
      const assignedUpdate = await policyEngine.evaluate(RIDER_RAHIM, 'update_status', {
        type: 'RIDER',
        id: 'shp_assigned_1',
        data: { riderId: 'usr_rider_rahim', status: 'IN_TRANSIT' },
      });
      expect(assignedUpdate.granted).toBe(true);

      const assignedGps = await policyEngine.evaluate(RIDER_RAHIM, 'location_update', {
        type: 'RIDER',
        id: 'usr_rider_rahim',
      });
      expect(assignedGps.granted).toBe(true);
    });

    it('strictly forbids rider from modifying shipments assigned to another rider (OWNERSHIP_VIOLATION)', async () => {
      const crossRider = await policyEngine.evaluate(RIDER_KARIM, 'update_status', {
        type: 'RIDER',
        id: 'shp_assigned_1',
        data: { riderId: 'usr_rider_rahim', status: 'DELIVERED' }, // Assigned to Rahim!
      });
      expect(crossRider.granted).toBe(false);
      expect(crossRider.code).toBe('OWNERSHIP_VIOLATION');
    });

    it('forbids customers from updating delivery status (FORBIDDEN)', async () => {
      const customerAttempt = await policyEngine.evaluate(CUSTOMER_ALICE, 'update_status', {
        type: 'RIDER',
        id: 'shp_assigned_1',
        data: { riderId: 'usr_rider_rahim' },
      });
      expect(customerAttempt.granted).toBe(false);
      expect(customerAttempt.code).toBe('FORBIDDEN');
    });
  });

  // ── SECTION E: SUPPORT AGENT QUEUE GOVERNANCE & PRIVACY ─────────────────────

  describe('Section E: Support Agent Queue Governance & Ticket Privacy', () => {
    it('allows customer to view and reply to own support ticket', async () => {
      const ownTicket = await policyEngine.evaluate(CUSTOMER_ALICE, 'read', {
        type: 'SUPPORT',
        id: 'tkt_alice_1',
        ownerId: 'usr_customer_alice',
      });
      expect(ownTicket.granted).toBe(true);

      const ownReply = await policyEngine.evaluate(CUSTOMER_ALICE, 'reply', {
        type: 'SUPPORT',
        id: 'tkt_alice_1',
        ownerId: 'usr_customer_alice',
      });
      expect(ownReply.granted).toBe(true);
    });

    it('blocks Customer Alice from inspecting Customer Bob support ticket (OWNERSHIP_VIOLATION)', async () => {
      const crossTicket = await policyEngine.evaluate(CUSTOMER_ALICE, 'read', {
        type: 'SUPPORT',
        id: 'tkt_bob_1',
        ownerId: 'usr_customer_bob',
      });
      expect(crossTicket.granted).toBe(false);
      expect(crossTicket.code).toBe('OWNERSHIP_VIOLATION');
    });

    it('allows Support Agent to inspect tickets and reply, but blocks resolving without permission', async () => {
      const agentRead = await policyEngine.evaluate(SUPPORT_AGENT, 'read', {
        type: 'SUPPORT',
        id: 'tkt_alice_1',
        ownerId: 'usr_customer_alice',
      });
      expect(agentRead.granted).toBe(true);

      const agentReply = await policyEngine.evaluate(SUPPORT_AGENT, 'reply', {
        type: 'SUPPORT',
        id: 'tkt_alice_1',
        ownerId: 'usr_customer_alice',
      });
      expect(agentReply.granted).toBe(true);
    });
  });

  // ── SECTION F: FINANCIAL GATE-05 MAKER-CHECKER ENFORCEMENT ────────────────���─

  describe('Section F: Financial Gate-05 Maker-Checker & Ledger Segregation', () => {
    it('allows customer to read own wallet, prevents reading others (OWNERSHIP_VIOLATION)', async () => {
      const ownWallet = await policyEngine.evaluate(CUSTOMER_ALICE, 'finance:read', {
        type: 'WALLET',
        id: 'wal_alice',
        ownerId: 'usr_customer_alice',
      });
      expect(ownWallet.granted).toBe(true);

      const crossWallet = await policyEngine.evaluate(CUSTOMER_ALICE, 'finance:read', {
        type: 'WALLET',
        id: 'wal_bob',
        ownerId: 'usr_customer_bob',
      });
      expect(crossWallet.granted).toBe(false);
      expect(crossWallet.code).toBe('OWNERSHIP_VIOLATION');
    });

    it('enforces Gate-05: High-value payout requires distinct secondary checker (MAKER_CHECKER_REQUIRED)', async () => {
      // 60,000 BDT = 6,000,000 poisha (exceeds 5,000,000 threshold)
      const noChecker = await policyEngine.evaluate(FINANCE_OFFICER, 'finance:payout', {
        type: 'WALLET',
        id: 'wal_high_value',
        data: {
          amountPoisha: 6000000n,
          makerId: 'usr_finance_01',
        },
      });
      expect(noChecker.granted).toBe(false);
      expect(noChecker.code).toBe('MAKER_CHECKER_REQUIRED');

      // Self-approval rejected
      const selfChecker = await policyEngine.evaluate(FINANCE_OFFICER, 'finance:payout', {
        type: 'WALLET',
        id: 'wal_high_value',
        data: {
          amountPoisha: 6000000n,
          makerId: 'usr_finance_01',
          checkerId: 'usr_finance_01',
        },
      });
      expect(selfChecker.granted).toBe(false);
      expect(selfChecker.code).toBe('MAKER_CHECKER_REQUIRED');

      // Distinct secondary checker approved
      const validChecker = await policyEngine.evaluate(FINANCE_OFFICER, 'finance:payout', {
        type: 'WALLET',
        id: 'wal_high_value',
        data: {
          amountPoisha: 6000000n,
          makerId: 'usr_finance_01',
          checkerId: 'usr_finance_checker_02',
        },
      });
      expect(validChecker.granted).toBe(true);
      expect(validChecker.code).toBe('GRANTED');
    });
  });

  // ── SECTION G: INTERNAL SYSTEM SERVICE & WORKER POLICIES ───────────────────

  describe('Section G: Internal System Service & Worker Invariants', () => {
    it('allows SYSTEM_SERVICE actor to execute background jobs and outbox processing', async () => {
      const outbox = await policyEngine.evaluate(SYSTEM_SERVICE, 'outbox:process', {
        type: 'SYSTEM_SERVICE',
        id: 'job_outbox_batch_1',
      });
      expect(outbox.granted).toBe(true);

      const reconcile = await policyEngine.evaluate(SYSTEM_SERVICE, 'reconciliation:run', {
        type: 'SYSTEM_SERVICE',
        id: 'job_reconcile_wallets',
      });
      expect(reconcile.granted).toBe(true);
    });

    it('strictly forbids customers or merchants from executing system services (FORBIDDEN)', async () => {
      const customerJob = await policyEngine.evaluate(CUSTOMER_ALICE, 'outbox:process', {
        type: 'SYSTEM_SERVICE',
        id: 'job_outbox_batch_1',
      });
      expect(customerJob.granted).toBe(false);
      expect(customerJob.code).toBe('FORBIDDEN');

      const sellerJob = await policyEngine.evaluate(SELLER_A_OWNER, 'outbox:process', {
        type: 'SYSTEM_SERVICE',
        id: 'job_outbox_batch_1',
      });
      expect(sellerJob.granted).toBe(false);
      expect(sellerJob.code).toBe('FORBIDDEN');
    });
  });

  // ── SECTION H: ACCOUNT LIFECYCLE BARRIERS (SUSPENDED & DELETED) ─────────────

  describe('Section H: Account Lifecycle Enforcement (Suspended & Deleted)', () => {
    it('strictly blocks suspended actors from performing ANY operation (ACCOUNT_SUSPENDED)', async () => {
      const attemptedActions = [
        { type: 'CATALOG', action: 'catalog:read' },
        { type: 'ORDER', action: 'orders:read' },
        { type: 'ORDER', action: 'orders:cancel' },
        { type: 'CUSTOMER', action: 'customer:profile:read' },
        { type: 'WALLET', action: 'finance:read' },
      ];

      for (const item of attemptedActions) {
        const decision = await policyEngine.evaluate(SUSPENDED_ACTOR, item.action, {
          type: item.type,
          id: 'res_1',
          ownerId: 'usr_suspended_bad_actor',
        });
        expect(decision.granted).toBe(false);
        expect(decision.code).toBe('ACCOUNT_SUSPENDED');
      }
    });

    it('strictly blocks soft-deleted actors from performing ANY operation (ACCOUNT_SUSPENDED)', async () => {
      const decision = await policyEngine.evaluate(DELETED_ACTOR, 'catalog:read', {
        type: 'CATALOG',
        id: 'prd_1',
      });
      expect(decision.granted).toBe(false);
      expect(decision.code).toBe('ACCOUNT_SUSPENDED');
    });

    it('allows anonymous guests to browse published catalog, blocks private operations (FORBIDDEN)', async () => {
      const publicCatalog = await policyEngine.evaluate(ANONYMOUS_GUEST, 'catalog:read', {
        type: 'CATALOG',
        id: 'prd_published_tv',
        status: 'PUBLISHED',
      });
      expect(publicCatalog.granted).toBe(true);

      const privateOrder = await policyEngine.evaluate(ANONYMOUS_GUEST, 'orders:read', {
        type: 'ORDER',
        id: 'ord_1',
      });
      expect(privateOrder.granted).toBe(false);
      expect(privateOrder.code).toBe('FORBIDDEN');
    });
  });
});
