/**
 * Unit Tests: Separate Admin and Super Admin Capabilities (Milestone 044)
 * 
 * Verifies privilege boundaries, administrative escalation barriers,
 * root security configuration protections, and account lifecycle governance.
 * 
 * Invariants: ADR-0003, ADR-0006, ADR-0022, ADR-0023, Milestone 044
 */

import { describe, it, expect } from 'bun:test';
import { RolePolicy } from '@/shared/authz/policies/role.policy';
import { UserPolicy } from '@/shared/authz/policies/user.policy';
import { SystemPolicy, SUPER_ADMIN_ONLY_CONFIG_KEYS } from '@/shared/authz/policies/system.policy';
import { WalletPolicy } from '@/shared/authz/policies/wallet.policy';
import { PolicyEngine } from '@/shared/authz/policy-engine';
import { SystemRoleCode } from '@/features/identity/types';
import { ActorContext } from '@/shared/authz/authz.types';
import { RbacService } from '@/features/identity/services/rbac-service';
import { AuthorizationError } from '@/shared/errors/app-error';

// Mock Actor Contexts
const SUPER_ADMIN_ACTOR: ActorContext = {
  userId: 'usr_super_admin_01',
  roles: [SystemRoleCode.SUPER_ADMIN],
  permissions: ['*'],
  sellerId: null,
  status: 'ACTIVE',
};

const PLATFORM_ADMIN_ACTOR: ActorContext = {
  userId: 'usr_admin_operator_02',
  roles: [SystemRoleCode.ADMIN],
  permissions: [
    'users:read',
    'users:write',
    'users:suspend',
    'roles:read',
    'permissions:read',
    'sellers:read',
    'sellers:verify',
    'sellers:suspend',
    'system:config',
    'system:audit_read',
  ],
  sellerId: null,
  status: 'ACTIVE',
};

const CUSTOMER_ACTOR: ActorContext = {
  userId: 'usr_shopper_03',
  roles: [SystemRoleCode.CUSTOMER],
  permissions: ['catalog:read', 'orders:read'],
  sellerId: null,
  status: 'ACTIVE',
};

describe('Milestone 044 — Separate Admin and Super Admin Capabilities', () => {
  const rolePolicy = new RolePolicy();
  const userPolicy = new UserPolicy();
  const systemPolicy = new SystemPolicy();
  const walletPolicy = new WalletPolicy();
  const policyEngine = new PolicyEngine();

  // ── 1. Role Delegation & Privilege Escalation Barriers ─────────────────────

  describe('1. Role Delegation & IAM Privilege Separation (RolePolicy)', () => {
    it('strictly prevents a Platform Admin from assigning the SUPER_ADMIN role', () => {
      const decision = rolePolicy.evaluate(PLATFORM_ADMIN_ACTOR, 'assign', {
        type: 'ROLE',
        data: { roleCode: SystemRoleCode.SUPER_ADMIN },
      });

      expect(decision.granted).toBe(false);
      expect(decision.code).toBe('PRIVILEGE_ESCALATION');
      expect(decision.reason).toContain('Super Administrator');
    });

    it('strictly prevents a Platform Admin from assigning the ADMIN role', () => {
      const decision = rolePolicy.evaluate(PLATFORM_ADMIN_ACTOR, 'assign', {
        type: 'ROLE',
        data: { roleCode: SystemRoleCode.ADMIN },
      });

      expect(decision.granted).toBe(false);
      expect(decision.code).toBe('PRIVILEGE_ESCALATION');
      expect(decision.reason).toContain('Super Administrator');
    });

    it('strictly prevents a Platform Admin from revoking an administrative role', () => {
      const decisionAdmin = rolePolicy.evaluate(PLATFORM_ADMIN_ACTOR, 'revoke', {
        type: 'ROLE',
        data: { roleCode: SystemRoleCode.ADMIN },
      });
      expect(decisionAdmin.granted).toBe(false);
      expect(decisionAdmin.code).toBe('PRIVILEGE_ESCALATION');

      const decisionSuper = rolePolicy.evaluate(PLATFORM_ADMIN_ACTOR, 'revoke', {
        type: 'ROLE',
        data: { roleCode: SystemRoleCode.SUPER_ADMIN },
      });
      expect(decisionSuper.granted).toBe(false);
      expect(decisionSuper.code).toBe('PRIVILEGE_ESCALATION');
    });

    it('blocks a Platform Admin from creating or managing system roles (roles:manage)', () => {
      const decision = rolePolicy.evaluate(PLATFORM_ADMIN_ACTOR, 'manage', {
        type: 'ROLE',
      });

      expect(decision.granted).toBe(false);
      expect(decision.code).toBe('FORBIDDEN');
    });

    it('allows a Super Admin to assign and revoke administrative roles', () => {
      const assignAdmin = rolePolicy.evaluate(SUPER_ADMIN_ACTOR, 'assign', {
        type: 'ROLE',
        data: { roleCode: SystemRoleCode.ADMIN },
      });
      expect(assignAdmin.granted).toBe(true);

      const assignSuper = rolePolicy.evaluate(SUPER_ADMIN_ACTOR, 'assign', {
        type: 'ROLE',
        data: { roleCode: SystemRoleCode.SUPER_ADMIN },
      });
      expect(assignSuper.granted).toBe(true);

      const revokeAdmin = rolePolicy.evaluate(SUPER_ADMIN_ACTOR, 'revoke', {
        type: 'ROLE',
        data: { roleCode: SystemRoleCode.ADMIN },
      });
      expect(revokeAdmin.granted).toBe(true);
    });

    it('allows a Super Admin to manage custom system roles', () => {
      const decision = rolePolicy.evaluate(SUPER_ADMIN_ACTOR, 'manage', {
        type: 'ROLE',
      });
      expect(decision.granted).toBe(true);
    });
  });

  // ── 2. User Account Governance & Administrator Protection ─────────────────

  describe('2. User Account Governance & Administrative Defense (UserPolicy)', () => {
    it('strictly prevents Platform Admin from modifying or suspending a Super Admin', () => {
      const updateDecision = userPolicy.evaluate(PLATFORM_ADMIN_ACTOR, 'update', {
        type: 'USER',
        id: 'usr_super_admin_01',
        data: { roles: [SystemRoleCode.SUPER_ADMIN] },
      });
      expect(updateDecision.granted).toBe(false);
      expect(updateDecision.code).toBe('PRIVILEGE_ESCALATION');

      const suspendDecision = userPolicy.evaluate(PLATFORM_ADMIN_ACTOR, 'suspend', {
        type: 'USER',
        id: 'usr_super_admin_01',
        data: { roles: [SystemRoleCode.SUPER_ADMIN] },
      });
      expect(suspendDecision.granted).toBe(false);
      expect(suspendDecision.code).toBe('PRIVILEGE_ESCALATION');
    });

    it('strictly prevents Platform Admin from modifying or suspending another Admin', () => {
      const suspendDecision = userPolicy.evaluate(PLATFORM_ADMIN_ACTOR, 'suspend', {
        type: 'USER',
        id: 'usr_peer_admin_05',
        data: { roles: [SystemRoleCode.ADMIN] },
      });
      expect(suspendDecision.granted).toBe(false);
      expect(suspendDecision.code).toBe('PRIVILEGE_ESCALATION');
    });

    it('strictly prevents Platform Admin from soft-deleting any user (users:delete restricted to Super Admin)', () => {
      const deleteDecision = userPolicy.evaluate(PLATFORM_ADMIN_ACTOR, 'delete', {
        type: 'USER',
        id: 'usr_shopper_03',
        data: { roles: [SystemRoleCode.CUSTOMER] },
      });
      expect(deleteDecision.granted).toBe(false);
      expect(deleteDecision.code).toBe('FORBIDDEN');
      expect(deleteDecision.reason).toContain('Super Administrator');
    });

    it('permits Platform Admin to suspend regular customer accounts', () => {
      const suspendCustomer = userPolicy.evaluate(PLATFORM_ADMIN_ACTOR, 'suspend', {
        type: 'USER',
        id: 'usr_shopper_03',
        data: { roles: [SystemRoleCode.CUSTOMER] },
      });
      expect(suspendCustomer.granted).toBe(true);
    });

    it('allows Super Admin to suspend administrative accounts and delete users', () => {
      const suspendAdmin = userPolicy.evaluate(SUPER_ADMIN_ACTOR, 'suspend', {
        type: 'USER',
        id: 'usr_admin_operator_02',
        data: { roles: [SystemRoleCode.ADMIN] },
      });
      expect(suspendAdmin.granted).toBe(true);

      const deleteUser = userPolicy.evaluate(SUPER_ADMIN_ACTOR, 'delete', {
        type: 'USER',
        id: 'usr_shopper_03',
        data: { roles: [SystemRoleCode.CUSTOMER] },
      });
      expect(deleteUser.granted).toBe(true);
    });

    it('blocks self-suspension and self-deletion even for Super Admin', () => {
      const selfSuspend = userPolicy.evaluate(SUPER_ADMIN_ACTOR, 'suspend', {
        type: 'USER',
        id: SUPER_ADMIN_ACTOR.userId,
      });
      expect(selfSuspend.granted).toBe(false);
      expect(selfSuspend.code).toBe('FORBIDDEN');

      const selfDelete = userPolicy.evaluate(SUPER_ADMIN_ACTOR, 'delete', {
        type: 'USER',
        id: SUPER_ADMIN_ACTOR.userId,
      });
      expect(selfDelete.granted).toBe(false);
      expect(selfDelete.code).toBe('FORBIDDEN');
    });
  });

  // ── 3. Platform Settings & Root Secrets Protection (SystemPolicy) ──────────

  describe('3. Platform Settings & Root Security Configuration (SystemPolicy)', () => {
    it('strictly prevents Platform Admin from mutating S3 credentials or payment secrets', () => {
      const decision = systemPolicy.evaluate(PLATFORM_ADMIN_ACTOR, 'system:config', {
        type: 'SYSTEM',
        data: {
          keys: ['STORAGE_S3_SECRET_KEY', 'PAYMENT_BKASH_APP_SECRET'],
        },
      });

      expect(decision.granted).toBe(false);
      expect(decision.code).toBe('PRIVILEGE_ESCALATION');
      expect(decision.reason).toContain('Super Administrator');
    });

    it('strictly prevents Platform Admin from toggling locked financial invariant FEATURE_POINTS_CASH_CONVERTIBLE', () => {
      const decision = systemPolicy.evaluate(PLATFORM_ADMIN_ACTOR, 'system:config', {
        type: 'SYSTEM',
        data: {
          keys: ['FEATURE_POINTS_CASH_CONVERTIBLE'],
        },
      });

      expect(decision.granted).toBe(false);
      expect(decision.code).toBe('PRIVILEGE_ESCALATION');
    });

    it('strictly prevents Platform Admin from toggling FEATURE_MAINTENANCE_MODE', () => {
      const decision = systemPolicy.evaluate(PLATFORM_ADMIN_ACTOR, 'system:config', {
        type: 'SYSTEM',
        data: {
          keys: ['FEATURE_MAINTENANCE_MODE'],
        },
      });

      expect(decision.granted).toBe(false);
      expect(decision.code).toBe('PRIVILEGE_ESCALATION');
    });

    it('allows Platform Admin to update routine operational configs', () => {
      const decision = systemPolicy.evaluate(PLATFORM_ADMIN_ACTOR, 'system:config', {
        type: 'SYSTEM',
        data: {
          keys: ['COURIER_DEFAULT_PROVIDER', 'PAYMENT_BKASH_ENABLED', 'PLATFORM_DEFAULT_LOCALE'],
        },
      });

      expect(decision.granted).toBe(true);
    });

    it('allows Super Admin full operational and root credentials mutation', () => {
      const decision = systemPolicy.evaluate(SUPER_ADMIN_ACTOR, 'system:config', {
        type: 'SYSTEM',
        data: {
          keys: Array.from(SUPER_ADMIN_ONLY_CONFIG_KEYS),
        },
      });

      expect(decision.granted).toBe(true);
    });

    it('strictly blocks customer accounts from reading or modifying system configs', () => {
      const readDecision = systemPolicy.evaluate(CUSTOMER_ACTOR, 'system:config:read', {
        type: 'SYSTEM',
      });
      expect(readDecision.granted).toBe(false);

      const writeDecision = systemPolicy.evaluate(CUSTOMER_ACTOR, 'system:config', {
        type: 'SYSTEM',
        data: { keys: ['COURIER_DEFAULT_PROVIDER'] },
      });
      expect(writeDecision.granted).toBe(false);
    });
  });

  // ── 4. Financial Controls & Dual Authorization (WalletPolicy) ──────────────

  describe('4. Financial Controls & Maker-Checker Separation (WalletPolicy)', () => {
    it('blocks Platform Admin from manual double-entry ledger postings (finance:ledger)', () => {
      const decision = walletPolicy.evaluate(PLATFORM_ADMIN_ACTOR, 'finance:ledger', {
        type: 'WALLET',
      });

      expect(decision.granted).toBe(false);
      expect(decision.code).toBe('FORBIDDEN');
    });

    it('blocks Platform Admin without finance privileges from payout balance adjustments', () => {
      const decision = walletPolicy.evaluate(PLATFORM_ADMIN_ACTOR, 'finance:adjust', {
        type: 'WALLET',
        data: { amountPoisha: '50000' },
      });

      expect(decision.granted).toBe(false);
      expect(decision.code).toBe('FORBIDDEN');
    });

    it('allows Super Admin to execute ledger journals and balance adjustments', () => {
      const ledgerDecision = walletPolicy.evaluate(SUPER_ADMIN_ACTOR, 'finance:ledger', {
        type: 'WALLET',
      });
      expect(ledgerDecision.granted).toBe(true);
    });
  });

  // ── 5. RbacService Administrative Enforcement ─────────────────────────────

  describe('5. RbacService Administrative Isolation Gates', () => {
    class MockRoleRepo {
      public async findById(id: string) {
        if (id === 'rol_admin') return { id: 'rol_admin', code: SystemRoleCode.ADMIN };
        if (id === 'rol_super_admin') return { id: 'rol_super_admin', code: SystemRoleCode.SUPER_ADMIN };
        if (id === 'rol_staff') return { id: 'rol_staff', code: SystemRoleCode.SELLER_STAFF };
        return null;
      }
    }

    class MockAssignmentRepo {
      public async hasRole(userId: string, roleCode: string) {
        if (userId === 'usr_super_admin_01' && roleCode === SystemRoleCode.SUPER_ADMIN) return true;
        if (userId === 'usr_admin_operator_02' && roleCode === SystemRoleCode.ADMIN) return true;
        return false;
      }
      public async assignRole() {}
      public async revokeRole() {}
      public async findById() {
        return { id: 'ura_admin', role: { code: SystemRoleCode.ADMIN } };
      }
    }

    const rbacService = new RbacService(new MockRoleRepo() as any, {} as any, new MockAssignmentRepo() as any);

    it('prevents Platform Admin from assigning ADMIN role via service', async () => {
      await expect(
        rbacService.assignRole('usr_admin_operator_02', {
          userId: 'usr_shopper_03',
          roleId: 'rol_admin',
        })
      ).rejects.toThrow(AuthorizationError);
    });

    it('prevents Platform Admin from revoking ADMIN role via service', async () => {
      await expect(
        rbacService.revokeRole('usr_admin_operator_02', {
          assignmentId: 'ura_admin',
        })
      ).rejects.toThrow(AuthorizationError);
    });

    it('allows Super Admin to assign administrative roles via service', async () => {
      await expect(
        rbacService.assignRole('usr_super_admin_01', {
          userId: 'usr_shopper_03',
          roleId: 'rol_admin',
        })
      ).resolves.toBeUndefined();
    });
  });
});
