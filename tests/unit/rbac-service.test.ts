/**
 * Unit Tests for AlifWorld RBAC Service and Multi-Tenant Isolation
 * 
 * Verifies permission resolution, tenant scoping, role delegation gates,
 * and privilege escalation prevention.
 * 
 * Reference: docs/architecture/scope-boundaries-and-domain-map.md
 * Invariant: ADR-0003, ADR-0006, ADR-0023
 */

import { describe, it, expect } from 'bun:test';
import { RbacService } from '@/features/identity/services/rbac-service';
import { SystemRoleCode } from '@/features/identity/types';
import { AuthorizationError, ValidationError, NotFoundError } from '@/shared/errors/app-error';

// Mock repositories for deterministic in-memory unit testing
class MockRoleRepository {
  private roles = new Map<string, any>([
    [
      'rol_super_admin',
      { id: 'rol_super_admin', code: 'SUPER_ADMIN', name: 'Super Administrator', isSystem: true, version: 1 },
    ],
    [
      'rol_admin',
      { id: 'rol_admin', code: 'ADMIN', name: 'Platform Administrator', isSystem: true, version: 1 },
    ],
    [
      'rol_seller_owner',
      { id: 'rol_seller_owner', code: 'SELLER_OWNER', name: 'Store Owner', isSystem: true, version: 1 },
    ],
    [
      'rol_seller_staff',
      { id: 'rol_seller_staff', code: 'SELLER_STAFF', name: 'Store Staff', isSystem: true, version: 1 },
    ],
    [
      'rol_customer',
      { id: 'rol_customer', code: 'CUSTOMER', name: 'Shopper', isSystem: true, version: 1 },
    ],
  ]);

  public async findById(id: string) {
    return this.roles.get(id) || null;
  }

  public async findByCode(code: string) {
    return Array.from(this.roles.values()).find((r) => r.code === code) || null;
  }

  public async create(data: any) {
    const id = data.id || `rol_${Date.now()}`;
    const role = { ...data, id, version: 1 };
    this.roles.set(id, role);
    return role;
  }

  public async assignPermission() {}
}

class MockPermissionRepository {
  public async findByCode(code: string) {
    return { id: `prm_${code}`, code, name: code, module: 'TEST', version: 1 };
  }
}

class MockUserRoleAssignmentRepository {
  public assignments: any[] = [];

  public async getUserRoleAssignments(userId: string) {
    return this.assignments.filter((a) => a.userId === userId && !a.deletedAt);
  }

  public async hasRole(userId: string, roleCode: string, targetSellerId?: string) {
    const userAssignments = await this.getUserRoleAssignments(userId);
    return userAssignments.some((a) => {
      if (a.role.code !== roleCode) return false;
      if (!a.sellerId) return true;
      return targetSellerId ? a.sellerId === targetSellerId : true;
    });
  }

  public async getUserEffectivePermissions(userId: string, targetSellerId?: string) {
    const userAssignments = await this.getUserRoleAssignments(userId);
    const perms = new Set<string>();

    for (const a of userAssignments) {
      if (!a.sellerId || (targetSellerId && a.sellerId === targetSellerId)) {
        for (const p of a.role.permissions || []) {
          perms.add(p.code);
        }
      }
    }

    return Array.from(perms);
  }

  public async hasPermission(userId: string, permissionCode: string, targetSellerId?: string) {
    const perms = await this.getUserEffectivePermissions(userId, targetSellerId);
    return perms.includes(permissionCode.toLowerCase());
  }

  public async assignRole(params: any) {
    const role = (new MockRoleRepository() as any).roles?.get(params.roleId) || {
      id: params.roleId,
      code: 'TEST_ROLE',
      permissions: [],
    };
    const rec = { ...params, id: `ura_${Date.now()}`, version: 1, role };
    this.assignments.push(rec);
    return rec;
  }

  public async revokeRole() {}
}

describe('RbacService Authorization & Multi-Tenant Scoping Tests', () => {
  const roleRepo = new MockRoleRepository();
  const permRepo = new MockPermissionRepository();
  const assignmentRepo = new MockUserRoleAssignmentRepository();

  const rbacService = new RbacService(roleRepo as any, permRepo as any, assignmentRepo as any);

  // Setup user identities
  const superAdminId = 'usr_super_admin_001';
  const adminId = 'usr_platform_admin_001';
  const sellerOwnerDhakaId = 'usr_seller_dhaka_001';
  const customerId = 'usr_customer_001';

  // Seed initial assignments
  assignmentRepo.assignments = [
    {
      id: 'ura_01',
      userId: superAdminId,
      roleId: 'rol_super_admin',
      sellerId: null,
      role: {
        id: 'rol_super_admin',
        code: 'SUPER_ADMIN',
        permissions: [{ code: 'users:read' }, { code: 'users:write' }, { code: 'roles:manage' }],
      },
    },
    {
      id: 'ura_02',
      userId: adminId,
      roleId: 'rol_admin',
      sellerId: null,
      role: {
        id: 'rol_admin',
        code: 'ADMIN',
        permissions: [{ code: 'users:read' }, { code: 'sellers:verify' }],
      },
    },
    {
      id: 'ura_03',
      userId: sellerOwnerDhakaId,
      roleId: 'rol_seller_owner',
      sellerId: 'sel_dhaka_store_01',
      role: {
        id: 'rol_seller_owner',
        code: 'SELLER_OWNER',
        permissions: [{ code: 'seller:profile:manage' }, { code: 'catalog:write' }],
      },
    },
    {
      id: 'ura_04',
      userId: customerId,
      roleId: 'rol_customer',
      sellerId: null,
      role: {
        id: 'rol_customer',
        code: 'CUSTOMER',
        permissions: [{ code: 'catalog:read' }, { code: 'orders:read' }],
      },
    },
  ];

  it('assertPermission allows access when user has permission', async () => {
    await expect(rbacService.assertPermission(superAdminId, 'users:read')).resolves.toBeUndefined();
    await expect(rbacService.assertPermission(adminId, 'sellers:verify')).resolves.toBeUndefined();
  });

  it('assertPermission throws AuthorizationError when user lacks permission', async () => {
    await expect(rbacService.assertPermission(customerId, 'sellers:verify')).rejects.toThrow(AuthorizationError);
    await expect(rbacService.assertPermission(adminId, 'roles:manage')).rejects.toThrow(AuthorizationError);
  });

  it('assertRole verifies user role successfully', async () => {
    await expect(rbacService.assertRole(superAdminId, 'SUPER_ADMIN')).resolves.toBeUndefined();
    await expect(rbacService.assertRole(customerId, 'CUSTOMER')).resolves.toBeUndefined();
    await expect(rbacService.assertRole(customerId, 'ADMIN')).rejects.toThrow(AuthorizationError);
  });

  it('assertSellerTenantAccess permits Super Admin to access any seller tenant', async () => {
    await expect(rbacService.assertSellerTenantAccess(superAdminId, 'sel_dhaka_store_01')).resolves.toBeUndefined();
    await expect(rbacService.assertSellerTenantAccess(superAdminId, 'sel_chittagong_store_02')).resolves.toBeUndefined();
  });

  it('assertSellerTenantAccess permits Seller Owner to access their own store', async () => {
    await expect(
      rbacService.assertSellerTenantAccess(sellerOwnerDhakaId, 'sel_dhaka_store_01')
    ).resolves.toBeUndefined();
  });

  it('assertSellerTenantAccess strictly blocks Seller Owner from accessing another seller tenant', async () => {
    await expect(
      rbacService.assertSellerTenantAccess(sellerOwnerDhakaId, 'sel_chittagong_store_02')
    ).rejects.toThrow(AuthorizationError);
  });

  it('assertSellerTenantAccess blocks regular customer from accessing seller tenant', async () => {
    await expect(
      rbacService.assertSellerTenantAccess(customerId, 'sel_dhaka_store_01')
    ).rejects.toThrow(AuthorizationError);
  });

  it('assignRole prevents non-superadmin from assigning SUPER_ADMIN role', async () => {
    await expect(
      rbacService.assignRole(adminId, {
        userId: customerId,
        roleId: 'rol_super_admin',
      })
    ).rejects.toThrow(AuthorizationError);
  });

  it('assignRole enforces sellerId requirement for seller roles', async () => {
    await expect(
      rbacService.assignRole(superAdminId, {
        userId: customerId,
        roleId: 'rol_seller_owner',
        // missing sellerId
      })
    ).rejects.toThrow(ValidationError);
  });
});
