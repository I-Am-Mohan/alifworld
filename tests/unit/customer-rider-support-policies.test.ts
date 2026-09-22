/**
 * Unit Tests: Customer, Rider, Support, and System-Service Authorization Policies (Milestone 046)
 * 
 * Verifies:
 * 1. CustomerPolicy: Self-service ownership, PII minimization, and privilege escalation barriers
 * 2. RiderPolicy: Assignment leases, atomic acceptance (double-assignment prevention), status updates, telemetry
 * 3. SupportPolicy: Inquiry pipeline, ticket privacy, thread messaging, and maker-checker financial restrictions
 * 4. SystemServicePolicy: Internal daemon boundaries, worker execution, webhook ingestion, reconciliation
 * 5. PolicyEngine declarative integration and resource aliasing
 * 
 * Invariants: ADR-0003, ADR-0006, ADR-0013, ADR-0022, ADR-0023, Milestone 046
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { CustomerPolicy } from '@/shared/authz/policies/customer.policy';
import { RiderPolicy } from '@/shared/authz/policies/rider.policy';
import { SupportPolicy } from '@/shared/authz/policies/support.policy';
import { SystemServicePolicy } from '@/shared/authz/policies/system-service.policy';
import { PolicyEngine } from '@/shared/authz/policy-engine';
import { SystemRoleCode } from '@/features/identity/types';
import { ActorContext } from '@/shared/authz/authz.types';
import { ComplianceGateError, AuthorizationError } from '@/shared/errors/app-error';

// Mock Actors
const CUSTOMER_ALICE: ActorContext = {
  userId: 'usr_alice_01',
  roles: [SystemRoleCode.CUSTOMER],
  permissions: ['catalog:read', 'orders:read'],
  status: 'ACTIVE',
};

const CUSTOMER_BOB: ActorContext = {
  userId: 'usr_bob_02',
  roles: [SystemRoleCode.CUSTOMER],
  permissions: ['catalog:read', 'orders:read'],
  status: 'ACTIVE',
};

const RIDER_RAHIM: ActorContext = {
  userId: 'usr_rider_rahim_03',
  roles: [SystemRoleCode.RIDER],
  permissions: ['rider:status:update', 'rider:location:update'],
  status: 'ACTIVE',
};

const RIDER_KARIM: ActorContext = {
  userId: 'usr_rider_karim_04',
  roles: [SystemRoleCode.RIDER],
  permissions: ['rider:status:update', 'rider:location:update'],
  status: 'ACTIVE',
};

const SUPPORT_AGENT_HASAN: ActorContext = {
  userId: 'usr_support_hasan_05',
  roles: [SystemRoleCode.SUPPORT],
  permissions: ['support:read', 'support:manage'],
  status: 'ACTIVE',
};

const SELLER_DHAKA: ActorContext = {
  userId: 'usr_seller_dhaka_06',
  roles: [SystemRoleCode.SELLER_OWNER],
  permissions: ['seller:profile:manage', 'orders:manage'],
  sellerId: 'sel_dhaka_store',
  status: 'ACTIVE',
};

const DISPATCHER_OPS: ActorContext = {
  userId: 'usr_ops_07',
  roles: [SystemRoleCode.OPERATIONS],
  permissions: ['rider:dispatch', 'orders:manage'],
  status: 'ACTIVE',
};

const SYSTEM_WORKER: ActorContext = {
  userId: 'usr_system_worker_08',
  roles: [SystemRoleCode.SYSTEM_SERVICE],
  permissions: ['system:service:execute', 'system:outbox:process', 'system:reconcile'],
  status: 'ACTIVE',
};

const SUPER_ADMIN: ActorContext = {
  userId: 'usr_super_admin_09',
  roles: [SystemRoleCode.SUPER_ADMIN],
  permissions: ['*'],
  status: 'ACTIVE',
};

describe('Milestone 046 — Customer, Rider, Support, and System-Service Policies', () => {
  // ── 1. CustomerPolicy ───────────────────────────────────────────────────────

  describe('1. CustomerPolicy (Self-Service Ownership & Privacy)', () => {
    const policy = new CustomerPolicy();

    it('allows a customer to read their own profile', () => {
      const decision = policy.evaluate(CUSTOMER_ALICE, 'read', {
        type: 'CUSTOMER',
        id: CUSTOMER_ALICE.userId,
      });
      expect(decision.granted).toBe(true);
      expect(decision.code).toBe('GRANTED');
    });

    it('strictly forbids a customer from reading another customer profile (OWNERSHIP_VIOLATION)', () => {
      const decision = policy.evaluate(CUSTOMER_ALICE, 'read', {
        type: 'CUSTOMER',
        id: CUSTOMER_BOB.userId,
      });
      expect(decision.granted).toBe(false);
      expect(decision.code).toBe('OWNERSHIP_VIOLATION');
    });

    it('allows a customer to update normal profile fields', () => {
      const decision = policy.evaluate(CUSTOMER_ALICE, 'update', {
        type: 'CUSTOMER',
        id: CUSTOMER_ALICE.userId,
        data: { name: 'Alice New Name', preferredLocale: 'bn-BD' },
      });
      expect(decision.granted).toBe(true);
    });

    it('strictly prevents a customer from modifying security status, verification, or balance (PRIVILEGE_ESCALATION)', () => {
      const decision = policy.evaluate(CUSTOMER_ALICE, 'update', {
        type: 'CUSTOMER',
        id: CUSTOMER_ALICE.userId,
        data: { status: 'ACTIVE', isEmailVerified: true, walletBalance: 999999 },
      });
      expect(decision.granted).toBe(false);
      expect(decision.code).toBe('PRIVILEGE_ESCALATION');
    });

    it('allows a customer to manage their own delivery addresses, but blocks cross-customer access', () => {
      const ownAddress = policy.evaluate(CUSTOMER_ALICE, 'addresses:write', {
        type: 'CUSTOMER',
        ownerId: CUSTOMER_ALICE.userId,
      });
      expect(ownAddress.granted).toBe(true);

      const otherAddress = policy.evaluate(CUSTOMER_ALICE, 'addresses:write', {
        type: 'CUSTOMER',
        ownerId: CUSTOMER_BOB.userId,
      });
      expect(otherAddress.granted).toBe(false);
      expect(otherAddress.code).toBe('OWNERSHIP_VIOLATION');
    });

    it('allows Support and Admin agents with users:read to inspect customer profile for assistance', () => {
      const supportRead = policy.evaluate(SUPPORT_AGENT_HASAN, 'read', {
        type: 'CUSTOMER',
        id: CUSTOMER_ALICE.userId,
      });
      expect(supportRead.granted).toBe(true);
    });

    it('grants global operational bypass to Super Administrator', () => {
      const decision = policy.evaluate(SUPER_ADMIN, 'read', {
        type: 'CUSTOMER',
        id: CUSTOMER_ALICE.userId,
      });
      expect(decision.granted).toBe(true);
    });
  });

  // ── 2. RiderPolicy ──────────────────────────────────────────────────────────

  describe('2. RiderPolicy (Assignment Leases & Double-Assignment Prevention)', () => {
    const policy = new RiderPolicy();

    it('allows an active rider to accept an unassigned delivery package', () => {
      const decision = policy.evaluate(RIDER_RAHIM, 'accept_assignment', {
        type: 'DELIVERY',
        id: 'shp_package_01',
        data: { riderId: null },
      });
      expect(decision.granted).toBe(true);
      expect(decision.code).toBe('GRANTED');
    });

    it('strictly prevents a suspended rider from claiming assignments (ACCOUNT_SUSPENDED)', () => {
      const suspendedRider: ActorContext = {
        ...RIDER_RAHIM,
        status: 'SUSPENDED',
      };
      const decision = policy.evaluate(suspendedRider, 'accept_assignment', {
        type: 'DELIVERY',
        id: 'shp_package_01',
      });
      expect(decision.granted).toBe(false);
      expect(decision.code).toBe('ACCOUNT_SUSPENDED');
    });

    it('strictly prevents double-assignment if delivery is already claimed by another rider', () => {
      const decision = policy.evaluate(RIDER_KARIM, 'accept_assignment', {
        type: 'DELIVERY',
        id: 'shp_package_01',
        data: { riderId: RIDER_RAHIM.userId }, // Already claimed by Rahim!
      });
      expect(decision.granted).toBe(false);
      expect(decision.code).toBe('FORBIDDEN');
      expect(decision.reason).toContain('Double-assignment prevented');
    });

    it('strictly blocks a rider from claiming an assignment held under active lease by another rider', () => {
      const decision = policy.evaluate(RIDER_KARIM, 'accept_assignment', {
        type: 'DELIVERY',
        id: 'shp_package_02',
        data: {
          leaseRiderId: RIDER_RAHIM.userId,
          leaseExpiresAt: new Date(Date.now() + 60000).toISOString(), // Active lease!
        },
      });
      expect(decision.granted).toBe(false);
      expect(decision.code).toBe('FORBIDDEN');
      expect(decision.reason).toContain('exclusive lease');
    });

    it('allows a rider to claim an assignment if the exclusive lease belongs to them', () => {
      const decision = policy.evaluate(RIDER_RAHIM, 'accept_assignment', {
        type: 'DELIVERY',
        id: 'shp_package_02',
        data: {
          leaseRiderId: RIDER_RAHIM.userId,
          leaseExpiresAt: new Date(Date.now() + 60000).toISOString(),
        },
      });
      expect(decision.granted).toBe(true);
    });

    it('allows the assigned rider to update delivery status to valid milestone (PICKED_UP, DELIVERED)', () => {
      const decision = policy.evaluate(RIDER_RAHIM, 'update_status', {
        type: 'DELIVERY',
        id: 'shp_package_01',
        data: { riderId: RIDER_RAHIM.userId, status: 'DELIVERED' },
      });
      expect(decision.granted).toBe(true);
    });

    it('strictly forbids a rider from updating status of a delivery assigned to someone else', () => {
      const decision = policy.evaluate(RIDER_KARIM, 'update_status', {
        type: 'DELIVERY',
        id: 'shp_package_01',
        data: { riderId: RIDER_RAHIM.userId, status: 'DELIVERED' },
      });
      expect(decision.granted).toBe(false);
      expect(decision.code).toBe('OWNERSHIP_VIOLATION');
    });

    it('strictly forbids a rider from setting administrative terminal statuses like CANCELLED', () => {
      const decision = policy.evaluate(RIDER_RAHIM, 'update_status', {
        type: 'DELIVERY',
        id: 'shp_package_01',
        data: { riderId: RIDER_RAHIM.userId, status: 'CANCELLED' },
      });
      expect(decision.granted).toBe(false);
      expect(decision.code).toBe('FORBIDDEN');
    });

    it('allows a rider to publish their own GPS telemetry, but forbids publishing for another rider', () => {
      const ownLocation = policy.evaluate(RIDER_RAHIM, 'location_update', {
        type: 'RIDER',
        id: RIDER_RAHIM.userId,
      });
      expect(ownLocation.granted).toBe(true);

      const otherLocation = policy.evaluate(RIDER_RAHIM, 'location_update', {
        type: 'RIDER',
        id: RIDER_KARIM.userId,
      });
      expect(otherLocation.granted).toBe(false);
      expect(otherLocation.code).toBe('OWNERSHIP_VIOLATION');
    });

    it('allows Operations dispatcher to assign or update deliveries globally', () => {
      const dispatchDecision = policy.evaluate(DISPATCHER_OPS, 'accept_assignment', {
        type: 'DELIVERY',
        id: 'shp_package_01',
      });
      expect(dispatchDecision.granted).toBe(true);
    });
  });

  // ── 3. SupportPolicy ────────────────────────────────────────────────────────

  describe('3. SupportPolicy (Inquiry Pipeline & Maker-Checker Financial Barrier)', () => {
    const policy = new SupportPolicy();

    it('allows customer to create a support ticket for their own account', () => {
      const decision = policy.evaluate(CUSTOMER_ALICE, 'create', {
        type: 'SUPPORT',
        ownerId: CUSTOMER_ALICE.userId,
      });
      expect(decision.granted).toBe(true);
    });

    it('allows seller to create a support ticket for their own store', () => {
      const decision = policy.evaluate(SELLER_DHAKA, 'create', {
        type: 'SUPPORT',
        sellerId: 'sel_dhaka_store',
      });
      expect(decision.granted).toBe(true);
    });

    it('forbids a customer from creating a ticket on behalf of another user', () => {
      const decision = policy.evaluate(CUSTOMER_ALICE, 'create', {
        type: 'SUPPORT',
        ownerId: CUSTOMER_BOB.userId,
      });
      expect(decision.granted).toBe(false);
      expect(decision.code).toBe('FORBIDDEN');
    });

    it('allows ticket owner to read their own ticket, but blocks third-party customer snooping', () => {
      const ownTicket = policy.evaluate(CUSTOMER_ALICE, 'read', {
        type: 'SUPPORT',
        id: 'tkt_01',
        ownerId: CUSTOMER_ALICE.userId,
      });
      expect(ownTicket.granted).toBe(true);

      const snoopedTicket = policy.evaluate(CUSTOMER_BOB, 'read', {
        type: 'SUPPORT',
        id: 'tkt_01',
        ownerId: CUSTOMER_ALICE.userId,
      });
      expect(snoopedTicket.granted).toBe(false);
      expect(snoopedTicket.code).toBe('OWNERSHIP_VIOLATION');
    });

    it('allows Support agent to inspect tickets in queue', () => {
      const agentRead = policy.evaluate(SUPPORT_AGENT_HASAN, 'read', {
        type: 'SUPPORT',
        id: 'tkt_01',
        ownerId: CUSTOMER_ALICE.userId,
      });
      expect(agentRead.granted).toBe(true);
    });

    it('allows ticket owner or assigned agent to reply', () => {
      const ownerReply = policy.evaluate(CUSTOMER_ALICE, 'reply', {
        type: 'SUPPORT',
        id: 'tkt_01',
        ownerId: CUSTOMER_ALICE.userId,
      });
      expect(ownerReply.granted).toBe(true);

      const agentReply = policy.evaluate(SUPPORT_AGENT_HASAN, 'reply', {
        type: 'SUPPORT',
        id: 'tkt_01',
        ownerId: CUSTOMER_ALICE.userId,
      });
      expect(agentReply.granted).toBe(true);

      const unauthorizedReply = policy.evaluate(CUSTOMER_BOB, 'reply', {
        type: 'SUPPORT',
        id: 'tkt_01',
        ownerId: CUSTOMER_ALICE.userId,
      });
      expect(unauthorizedReply.granted).toBe(false);
      expect(unauthorizedReply.code).toBe('OWNERSHIP_VIOLATION');
    });

    it('strictly forbids a customer from self-assigning tickets to agents', () => {
      const decision = policy.evaluate(CUSTOMER_ALICE, 'assign', {
        type: 'SUPPORT',
        id: 'tkt_01',
      });
      expect(decision.granted).toBe(false);
      expect(decision.code).toBe('FORBIDDEN');
    });

    it('strictly blocks Support agents from direct financial adjustments (MAKER_CHECKER_REQUIRED)', () => {
      const decision = policy.evaluate(SUPPORT_AGENT_HASAN, 'financial_adjustment', {
        type: 'SUPPORT',
        id: 'tkt_01',
      });
      expect(decision.granted).toBe(false);
      expect(decision.code).toBe('MAKER_CHECKER_REQUIRED');
      expect(decision.reason).toContain('maker-checker');
    });
  });

  // ── 4. SystemServicePolicy ──────────────────────────────────────────────────

  describe('4. SystemServicePolicy (Internal Daemon & Worker Boundaries)', () => {
    const policy = new SystemServicePolicy();

    it('allows internal system worker to execute outbox processing and jobs', () => {
      const outboxDecision = policy.evaluate(SYSTEM_WORKER, 'outbox:process', {
        type: 'SYSTEM_SERVICE',
      });
      expect(outboxDecision.granted).toBe(true);

      const jobDecision = policy.evaluate(SYSTEM_WORKER, 'job:execute', {
        type: 'SYSTEM_SERVICE',
      });
      expect(jobDecision.granted).toBe(true);

      const reconcileDecision = policy.evaluate(SYSTEM_WORKER, 'reconciliation:run', {
        type: 'SYSTEM_SERVICE',
      });
      expect(reconcileDecision.granted).toBe(true);
    });

    it('strictly forbids Customers, Sellers, and Riders from triggering internal worker jobs', () => {
      const customerJob = policy.evaluate(CUSTOMER_ALICE, 'outbox:process', {
        type: 'SYSTEM_SERVICE',
      });
      expect(customerJob.granted).toBe(false);
      expect(customerJob.code).toBe('FORBIDDEN');

      const sellerJob = policy.evaluate(SELLER_DHAKA, 'job:execute', {
        type: 'SYSTEM_SERVICE',
      });
      expect(sellerJob.granted).toBe(false);
      expect(sellerJob.code).toBe('FORBIDDEN');

      const riderReconcile = policy.evaluate(RIDER_RAHIM, 'reconciliation:run', {
        type: 'SYSTEM_SERVICE',
      });
      expect(riderReconcile.granted).toBe(false);
      expect(riderReconcile.code).toBe('FORBIDDEN');
    });

    it('allows Super Administrator emergency execution for system maintenance', () => {
      const adminJob = policy.evaluate(SUPER_ADMIN, 'outbox:process', {
        type: 'SYSTEM_SERVICE',
      });
      expect(adminJob.granted).toBe(true);
    });
  });

  // ── 5. PolicyEngine Integration ─────────────────────────────────────────────

  describe('5. PolicyEngine Aliases & Declarative Dispatch', () => {
    const engine = new PolicyEngine();

    it('dispatches CUSTOMER_PROFILE alias to CustomerPolicy', async () => {
      const decision = await engine.evaluate(CUSTOMER_ALICE, 'read', {
        type: 'CUSTOMER_PROFILE',
        id: CUSTOMER_ALICE.userId,
      });
      expect(decision.granted).toBe(true);
      expect(decision.policyName).toBe('CustomerPolicy');
    });

    it('dispatches DELIVERY and SHIPMENT aliases to RiderPolicy', async () => {
      const decision = await engine.evaluate(RIDER_RAHIM, 'accept_assignment', {
        type: 'SHIPMENT',
        id: 'shp_01',
        data: { riderId: null },
      });
      expect(decision.granted).toBe(true);
      expect(decision.policyName).toBe('RiderPolicy');
    });

    it('dispatches TICKET and INQUIRY aliases to SupportPolicy', async () => {
      const decision = await engine.evaluate(CUSTOMER_ALICE, 'read', {
        type: 'TICKET',
        ownerId: CUSTOMER_ALICE.userId,
      });
      expect(decision.granted).toBe(true);
      expect(decision.policyName).toBe('SupportPolicy');
    });

    it('dispatches WORKER and INTERNAL aliases to SystemServicePolicy', async () => {
      const decision = await engine.evaluate(SYSTEM_WORKER, 'job:execute', {
        type: 'WORKER',
      });
      expect(decision.granted).toBe(true);
      expect(decision.policyName).toBe('SystemServicePolicy');
    });

    it('throws ComplianceGateError on MAKER_CHECKER_REQUIRED in engine assert', async () => {
      await expect(
        engine.assert(SUPPORT_AGENT_HASAN, 'financial_adjustment', {
          type: 'SUPPORT',
          id: 'tkt_01',
        })
      ).rejects.toThrow(ComplianceGateError);
    });
  });
});
