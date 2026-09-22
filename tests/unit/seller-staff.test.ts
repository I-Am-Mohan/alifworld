/**
 * Unit Tests: Seller Staff Roles, Invitations, and Scoped Access (Milestone 045)
 * 
 * Verifies:
 * 1. Delegation of staff roles (SELLER_STAFF, SELLER_MANAGER)
 * 2. Invitations via email or phone with user identity resolution
 * 3. Prevention of owner demotion or removing store owner
 * 4. Prevention of privilege escalation (cannot assign SUPER_ADMIN, ADMIN, SELLER_OWNER)
 * 5. Prevention of duplicate active staff assignments
 * 6. Tenant isolation across staff listings, invitations, and revocations
 * 7. Scoped role assignment in IAM and audit logging
 * 
 * Invariants: ADR-0003, ADR-0006, ADR-0021, ADR-0022, ADR-0024, Milestone 045
 */

import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { SellerStaffService } from '@/features/seller/services/seller-staff-service';
import { SellerPolicy } from '@/shared/authz/policies/seller.policy';
import { SystemRoleCode } from '@/features/identity/types';
import { ActorContext } from '@/shared/authz/authz.types';
import { AuthorizationError, ConflictError, NotFoundError, ValidationError } from '@/shared/errors/app-error';
import { prisma } from '@/shared/database/prisma';

describe('Milestone 045 — Seller Staff Roles, Invitations, and Scoped Access', () => {
  const STORE_DHAKA = 'sel_dhaka_01';
  const STORE_CHITTAGONG = 'sel_ctg_02';
  const OWNER_DHAKA_ID = 'usr_owner_dhaka';
  const STAFF_DHAKA_ID = 'usr_staff_dhaka';

  const mockSeller = {
    id: STORE_DHAKA,
    ownerUserId: OWNER_DHAKA_ID,
    businessName: 'Dhaka Superstore',
  };

  const mockRoleSellerStaff = {
    id: 'rol_seller_staff_01',
    code: SystemRoleCode.SELLER_STAFF,
    name: 'Seller Staff',
  };

  const mockRoleSellerManager = {
    id: 'rol_seller_manager_01',
    code: 'SELLER_MANAGER',
    name: 'Seller Manager',
  };

  beforeEach(() => {
    // Mock prisma auditLog and outboxEvent
    (prisma as any).auditLog = {
      create: mock(async () => ({ id: 'aud_mock' })),
    };
    (prisma as any).outboxEvent = {
      create: mock(async () => ({ id: 'out_mock' })),
    };
  });

  describe('1. SellerStaffService - Staff Listing and Access Scoping', () => {
    it('returns staff list scoped to target seller', async () => {
      const mockSellerRepo = {
        findById: mock(async (id: string) => (id === STORE_DHAKA ? mockSeller : null)),
      };
      const mockStaffRepo = {
        listBySeller: mock(async (sellerId: string) => [
          {
            id: 'stf_01',
            sellerId,
            userId: STAFF_DHAKA_ID,
            roleCode: 'SELLER_STAFF',
            user: { id: STAFF_DHAKA_ID, name: 'Rahim Staff', email: 'rahim@example.com', phone: '+8801711111111' },
          },
        ]),
      };

      const service = new SellerStaffService(
        mockSellerRepo as any,
        mockStaffRepo as any,
        {} as any,
        {} as any,
        {} as any
      );

      const staff = await service.listStaff(STORE_DHAKA);
      expect(staff.length).toBe(1);
      expect(staff[0].userId).toBe(STAFF_DHAKA_ID);
      expect(staff[0].sellerId).toBe(STORE_DHAKA);
    });

    it('throws NotFoundError when querying staff for non-existent seller', async () => {
      const mockSellerRepo = {
        findById: mock(async () => null),
      };

      const service = new SellerStaffService(mockSellerRepo as any, {} as any, {} as any, {} as any, {} as any);
      await expect(service.listStaff('sel_invalid')).rejects.toThrow(NotFoundError);
    });
  });

  describe('2. SellerStaffService - Adding & Inviting Staff', () => {
    it('successfully adds existing user as SELLER_STAFF and assigns scoped role in IAM', async () => {
      let roleAssigned = false;
      let outboxCreated = false;
      let auditLogged = false;

      const mockSellerRepo = {
        findById: mock(async () => mockSeller),
      };
      const mockUserRepo = {
        findById: mock(async (id: string) => ({ id, name: 'Staff User', email: 'staff@example.com' })),
      };
      const mockStaffRepo = {
        findBySellerAndUser: mock(async () => null),
        addStaff: mock(async (data: any) => ({
          id: 'stf_new_01',
          sellerId: data.sellerId,
          userId: data.userId,
          roleCode: data.roleCode,
          permissions: data.permissions,
        })),
      };
      const mockRoleRepo = {
        findByCode: mock(async (code: string) => (code === SystemRoleCode.SELLER_STAFF ? mockRoleSellerStaff : null)),
      };
      const mockRoleAssignmentRepo = {
        assignRole: mock(async (params: any) => {
          expect(params.sellerId).toBe(STORE_DHAKA);
          expect(params.userId).toBe('usr_existing_user');
          expect(params.roleId).toBe(mockRoleSellerStaff.id);
          roleAssigned = true;
          return {} as any;
        }),
      };

      (prisma as any).outboxEvent.create = mock(async () => {
        outboxCreated = true;
      });
      (prisma as any).auditLog.create = mock(async () => {
        auditLogged = true;
      });

      const service = new SellerStaffService(
        mockSellerRepo as any,
        mockStaffRepo as any,
        mockUserRepo as any,
        mockRoleRepo as any,
        mockRoleAssignmentRepo as any
      );

      const result = await service.addOrInviteStaff(OWNER_DHAKA_ID, {
        sellerId: STORE_DHAKA,
        userId: 'usr_existing_user',
        roleCode: SystemRoleCode.SELLER_STAFF,
        permissions: ['catalog:read', 'orders:manage'],
      });

      expect(result.id).toBe('stf_new_01');
      expect(result.userId).toBe('usr_existing_user');
      expect(result.roleCode).toBe(SystemRoleCode.SELLER_STAFF);
      expect(roleAssigned).toBe(true);
      expect(outboxCreated).toBe(true);
      expect(auditLogged).toBe(true);
    });

    it('provisions new user identity when inviting staff via email/phone', async () => {
      let userCreated = false;
      const mockSellerRepo = {
        findById: mock(async () => mockSeller),
      };
      const mockUserRepo = {
        findByEmail: mock(async () => null),
        findByPhone: mock(async () => null),
        create: mock(async (userData: any) => {
          userCreated = true;
          return { id: 'usr_invited_new', email: userData.email, name: userData.name };
        }),
      };
      const mockStaffRepo = {
        findBySellerAndUser: mock(async () => null),
        addStaff: mock(async (data: any) => ({
          id: 'stf_invited_01',
          sellerId: data.sellerId,
          userId: data.userId,
          roleCode: data.roleCode,
          permissions: data.permissions,
        })),
      };
      const mockRoleRepo = {
        findByCode: mock(async () => mockRoleSellerStaff),
      };
      const mockRoleAssignmentRepo = {
        assignRole: mock(async () => ({} as any)),
      };

      const service = new SellerStaffService(
        mockSellerRepo as any,
        mockStaffRepo as any,
        mockUserRepo as any,
        mockRoleRepo as any,
        mockRoleAssignmentRepo as any
      );

      const result = await service.addOrInviteStaff(OWNER_DHAKA_ID, {
        sellerId: STORE_DHAKA,
        email: 'newinvitee@store.com',
        name: 'New Invitee',
        roleCode: 'SELLER_STAFF',
        permissions: [],
      });

      expect(userCreated).toBe(true);
      expect(result.userId).toBe('usr_invited_new');
    });

    it('strictly forbids designating the store owner as subordinate staff', async () => {
      const mockSellerRepo = {
        findById: mock(async () => mockSeller), // ownerUserId === OWNER_DHAKA_ID
      };
      const mockUserRepo = {
        findById: mock(async () => ({ id: OWNER_DHAKA_ID })),
      };

      const service = new SellerStaffService(
        mockSellerRepo as any,
        {} as any,
        mockUserRepo as any,
        {} as any,
        {} as any
      );

      await expect(
        service.addOrInviteStaff(OWNER_DHAKA_ID, {
          sellerId: STORE_DHAKA,
          userId: OWNER_DHAKA_ID,
          roleCode: SystemRoleCode.SELLER_STAFF,
          permissions: [],
        })
      ).rejects.toThrow(ConflictError);
    });

    it('strictly prevents duplicate active staff assignment', async () => {
      const mockSellerRepo = {
        findById: mock(async () => mockSeller),
      };
      const mockUserRepo = {
        findById: mock(async () => ({ id: 'usr_already_staff' })),
      };
      const mockStaffRepo = {
        findBySellerAndUser: mock(async () => ({
          id: 'stf_existing',
          sellerId: STORE_DHAKA,
          userId: 'usr_already_staff',
          deletedAt: null, // active
        })),
      };

      const service = new SellerStaffService(
        mockSellerRepo as any,
        mockStaffRepo as any,
        mockUserRepo as any,
        {} as any,
        {} as any
      );

      await expect(
        service.addOrInviteStaff(OWNER_DHAKA_ID, {
          sellerId: STORE_DHAKA,
          userId: 'usr_already_staff',
          roleCode: SystemRoleCode.SELLER_STAFF,
          permissions: [],
        })
      ).rejects.toThrow(ConflictError);
    });

    it('strictly prevents assigning administrative or owner roles (privilege escalation prevention)', async () => {
      const mockSellerRepo = {
        findById: mock(async () => mockSeller),
      };
      const mockUserRepo = {
        findById: mock(async () => ({ id: 'usr_target_staff' })),
      };
      const mockStaffRepo = {
        findBySellerAndUser: mock(async () => null),
      };

      const service = new SellerStaffService(
        mockSellerRepo as any,
        mockStaffRepo as any,
        mockUserRepo as any,
        {} as any,
        {} as any
      );

      // Attempt to escalate to SUPER_ADMIN
      await expect(
        service.addOrInviteStaff(OWNER_DHAKA_ID, {
          sellerId: STORE_DHAKA,
          userId: 'usr_target_staff',
          roleCode: SystemRoleCode.SUPER_ADMIN,
          permissions: [],
        })
      ).rejects.toThrow(AuthorizationError);

      // Attempt to escalate to ADMIN
      await expect(
        service.addOrInviteStaff(OWNER_DHAKA_ID, {
          sellerId: STORE_DHAKA,
          userId: 'usr_target_staff',
          roleCode: SystemRoleCode.ADMIN,
          permissions: [],
        })
      ).rejects.toThrow(AuthorizationError);

      // Attempt to assign SELLER_OWNER via staff delegation
      await expect(
        service.addOrInviteStaff(OWNER_DHAKA_ID, {
          sellerId: STORE_DHAKA,
          userId: 'usr_target_staff',
          roleCode: SystemRoleCode.SELLER_OWNER,
          permissions: [],
        })
      ).rejects.toThrow(AuthorizationError);
    });
  });

  describe('3. SellerStaffService - Removing Staff & Owner Protection', () => {
    it('strictly prevents removing the store owner via staff endpoint', async () => {
      const mockSellerRepo = {
        findById: mock(async () => mockSeller),
      };

      const service = new SellerStaffService(
        mockSellerRepo as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any
      );

      await expect(
        service.removeStaff(OWNER_DHAKA_ID, STORE_DHAKA, OWNER_DHAKA_ID)
      ).rejects.toThrow(ValidationError);
    });

    it('successfully removes staff and revokes scoped role in IAM', async () => {
      let staffSoftDeleted = false;
      let roleRevoked = false;
      let auditLogged = false;

      const mockSellerRepo = {
        findById: mock(async () => mockSeller),
      };
      const mockStaffRepo = {
        removeStaff: mock(async (sellerId: string, userId: string, actorId?: string) => {
          expect(sellerId).toBe(STORE_DHAKA);
          expect(userId).toBe(STAFF_DHAKA_ID);
          expect(actorId).toBe(OWNER_DHAKA_ID);
          staffSoftDeleted = true;
        }),
      };
      const mockRoleAssignmentRepo = {
        revokeRole: mock(async (params: any) => {
          expect(params.sellerId).toBe(STORE_DHAKA);
          expect(params.userId).toBe(STAFF_DHAKA_ID);
          roleRevoked = true;
        }),
      };

      (prisma as any).auditLog.create = mock(async () => {
        auditLogged = true;
      });

      const service = new SellerStaffService(
        mockSellerRepo as any,
        mockStaffRepo as any,
        {} as any,
        {} as any,
        mockRoleAssignmentRepo as any
      );

      await service.removeStaff(OWNER_DHAKA_ID, STORE_DHAKA, STAFF_DHAKA_ID);

      expect(staffSoftDeleted).toBe(true);
      expect(roleRevoked).toBe(true);
      expect(auditLogged).toBe(true);
    });
  });

  describe('4. SellerPolicy - Authorization Matrix for Staff Management', () => {
    const policy = new SellerPolicy();

    it('grants staff:manage and staff:read to SELLER_OWNER for their own store', () => {
      const ownerActor: ActorContext = {
        userId: OWNER_DHAKA_ID,
        roles: [SystemRoleCode.SELLER_OWNER],
        permissions: ['seller:profile:manage', 'seller:staff:manage'],
        sellerId: STORE_DHAKA,
        status: 'ACTIVE',
      };

      const manageDecision = policy.evaluate(ownerActor, 'staff:manage', {
        id: STORE_DHAKA,
        sellerId: STORE_DHAKA,
        type: 'SELLER',
      });
      expect(manageDecision.granted).toBe(true);

      const readDecision = policy.evaluate(ownerActor, 'staff:read', {
        id: STORE_DHAKA,
        sellerId: STORE_DHAKA,
        type: 'SELLER',
      });
      expect(readDecision.granted).toBe(true);
    });

    it('denies staff:manage to regular SELLER_STAFF without staff:manage permission', () => {
      const staffActor: ActorContext = {
        userId: STAFF_DHAKA_ID,
        roles: [SystemRoleCode.SELLER_STAFF],
        permissions: ['catalog:read', 'orders:read'],
        sellerId: STORE_DHAKA,
        status: 'ACTIVE',
      };

      const decision = policy.evaluate(staffActor, 'staff:manage', {
        id: STORE_DHAKA,
        sellerId: STORE_DHAKA,
        type: 'SELLER',
      });
      expect(decision.granted).toBe(false);
      expect(decision.code).toBe('FORBIDDEN');
    });

    it('grants staff:read to SELLER_STAFF for their own store', () => {
      const staffActor: ActorContext = {
        userId: STAFF_DHAKA_ID,
        roles: [SystemRoleCode.SELLER_STAFF],
        permissions: ['catalog:read'],
        sellerId: STORE_DHAKA,
        status: 'ACTIVE',
      };

      const decision = policy.evaluate(staffActor, 'staff:read', {
        id: STORE_DHAKA,
        sellerId: STORE_DHAKA,
        type: 'SELLER',
      });
      expect(decision.granted).toBe(true);
    });

    it('strictly denies cross-tenant staff operations (Tenant A merchant accessing Tenant B)', () => {
      const dhakaOwnerActor: ActorContext = {
        userId: OWNER_DHAKA_ID,
        roles: [SystemRoleCode.SELLER_OWNER],
        permissions: ['seller:staff:manage'],
        sellerId: STORE_DHAKA,
        status: 'ACTIVE',
      };

      const decision = policy.evaluate(dhakaOwnerActor, 'staff:manage', {
        id: STORE_CHITTAGONG,
        sellerId: STORE_CHITTAGONG,
        type: 'SELLER',
      });
      expect(decision.granted).toBe(false);
      expect(decision.code).toBe('TENANT_VIOLATION');
    });

    it('grants global administrative bypass to Super Administrator', () => {
      const superAdminActor: ActorContext = {
        userId: 'usr_superadmin',
        roles: [SystemRoleCode.SUPER_ADMIN],
        permissions: ['*'],
        sellerId: null,
        status: 'ACTIVE',
      };

      const decision = policy.evaluate(superAdminActor, 'staff:manage', {
        id: STORE_DHAKA,
        sellerId: STORE_DHAKA,
        type: 'SELLER',
      });
      expect(decision.granted).toBe(true);
    });
  });
});
