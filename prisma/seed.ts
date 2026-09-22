/**
 * AlifWorld Idempotent Database Seed Script
 * 
 * Populates essential platform parameters, rule versions, RBAC roles,
 * canonical permissions, role-permission matrices, and initial super-admin.
 * 
 * Safe to execute repeatedly without duplicating records or causing data conflicts.
 * 
 * Command: bun run prisma/seed.ts (or bun run db:seed)
 * Reference: docs/architecture/postgresql-and-prisma-foundations.md
 * Invariant: ADR-0003, ADR-0021, ADR-0022, ADR-0023
 */

import { prisma, disconnectPrisma } from '../src/shared/database';
import { generateId, ID_PREFIXES } from '../src/shared/utils/id';

async function seed() {
  console.info('🌱 Starting AlifWorld database seed...');

  // ----------------------------------------------------------------------------
  // 1. System Configuration & Business Rule Versions
  // ----------------------------------------------------------------------------
  const initialConfigs = [
    {
      key: 'PLATFORM_CURRENCY',
      value: 'BDT',
      description: 'Default launch currency of AlifWorld',
      isPublic: true,
    },
    {
      key: 'PLATFORM_TIMEZONE',
      value: 'Asia/Dhaka',
      description: 'Authoritative operational business timezone',
      isPublic: true,
    },
    {
      key: 'PLATFORM_LOCALES',
      value: 'bn-BD,en-BD',
      description: 'Supported customer and operational locales',
      isPublic: true,
    },
    {
      key: 'FEATURE_POINTS_CASH_CONVERTIBLE',
      value: 'false',
      description: 'Points are independent and strictly non-convertible to cash',
      isPublic: true,
    },
    {
      key: 'MAX_AFFILIATE_DEPTH',
      value: '1',
      description: 'Strict single-tier affiliate depth ceiling',
      isPublic: true,
    },
    {
      key: 'RULE_VERSION_WALLET',
      value: 'v1.0.0',
      description: 'Active wallet ledger ruleset version',
      isPublic: false,
    },
    {
      key: 'RULE_VERSION_COMMISSION',
      value: 'v1.0.0',
      description: 'Active seller commission ruleset version',
      isPublic: false,
    },
    {
      key: 'RULE_VERSION_POINTS',
      value: 'v1.0.0',
      description: 'Active Product Points snapshot ruleset version',
      isPublic: false,
    },
  ];

  for (const config of initialConfigs) {
    await (prisma as any).systemConfig.upsert({
      where: { key: config.key },
      update: {
        value: config.value,
        description: config.description,
        isPublic: config.isPublic,
      },
      create: config,
    });
  }
  console.info(`✅ Seeded ${initialConfigs.length} platform configuration keys.`);

  // ----------------------------------------------------------------------------
  // 2. Canonical Permissions
  // ----------------------------------------------------------------------------
  const permissionsData = [
    // IAM & Users
    { code: 'users:read', name: 'View Users', module: 'IAM', description: 'View user profiles and list users' },
    { code: 'users:write', name: 'Manage Users', module: 'IAM', description: 'Create and update user accounts' },
    { code: 'users:delete', name: 'Delete Users', module: 'IAM', description: 'Soft-delete user accounts' },
    { code: 'users:suspend', name: 'Suspend Users', module: 'IAM', description: 'Suspend or restore user access' },
    { code: 'roles:read', name: 'View Roles', module: 'IAM', description: 'View RBAC roles and permissions' },
    { code: 'roles:manage', name: 'Manage Roles', module: 'IAM', description: 'Create and edit custom roles' },
    { code: 'roles:assign', name: 'Assign Roles', module: 'IAM', description: 'Assign or revoke roles from users' },
    { code: 'permissions:read', name: 'View Permissions', module: 'IAM', description: 'Inspect permission catalogue' },

    // Seller
    { code: 'sellers:read', name: 'View Sellers', module: 'SELLER', description: 'View seller directory and KYC documents' },
    { code: 'sellers:verify', name: 'Verify Sellers', module: 'SELLER', description: 'Approve or reject seller KYC dossiers' },
    { code: 'sellers:suspend', name: 'Suspend Sellers', module: 'SELLER', description: 'Suspend merchant store operations' },
    { code: 'seller:profile:manage', name: 'Manage Store Profile', module: 'SELLER', description: 'Configure store settings and profile' },
    { code: 'seller:staff:manage', name: 'Manage Store Staff', module: 'SELLER', description: 'Delegate roles to seller staff' },

    // Catalog
    { code: 'catalog:read', name: 'Browse Catalog', module: 'CATALOG', description: 'View categories, brands, and products' },
    { code: 'catalog:write', name: 'Manage Catalog', module: 'CATALOG', description: 'Create and edit products and variants' },
    { code: 'catalog:publish', name: 'Publish Products', module: 'CATALOG', description: 'Publish product listings to storefront' },
    { code: 'catalog:archive', name: 'Archive Products', module: 'CATALOG', description: 'Archive products from active catalog' },

    // Orders
    { code: 'orders:read', name: 'View Orders', module: 'ORDER', description: 'Inspect customer and fulfillment orders' },
    { code: 'orders:manage', name: 'Process Orders', module: 'ORDER', description: 'Update order pack and handover states' },
    { code: 'orders:cancel', name: 'Cancel Orders', module: 'ORDER', description: 'Cancel active customer orders' },
    { code: 'orders:refund', name: 'Process Refunds', module: 'ORDER', description: 'Inspect returns and issue refunds' },

    // Finance
    { code: 'finance:read', name: 'View Financials', module: 'FINANCE', description: 'Inspect wallet ledgers and transactions' },
    { code: 'finance:ledger', name: 'Post Ledger Entries', module: 'FINANCE', description: 'Post manual journal entries' },
    { code: 'finance:adjust', name: 'Maker-Checker Approval', module: 'FINANCE', description: 'Approve high-value balance adjustments' },
    { code: 'finance:payout', name: 'Process Payouts', module: 'FINANCE', description: 'Authorize seller withdrawal disbursements' },

    // System
    { code: 'system:config', name: 'Platform Settings', module: 'SYSTEM', description: 'Manage platform configuration and flags' },
    { code: 'system:audit_read', name: 'View Audit Logs', module: 'SYSTEM', description: 'Review security and compliance audits' },
  ];

  const permissionMap = new Map<string, string>();

  for (const perm of permissionsData) {
    const existing = await (prisma as any).permission.findFirst({
      where: { code: perm.code },
    });

    if (existing) {
      permissionMap.set(perm.code, existing.id);
    } else {
      const id = generateId(ID_PREFIXES.PERMISSION);
      const created = await (prisma as any).permission.create({
        data: {
          id,
          code: perm.code,
          name: perm.name,
          module: perm.module,
          description: perm.description,
          version: 1,
        },
      });
      permissionMap.set(perm.code, created.id);
    }
  }
  console.info(`✅ Seeded ${permissionsData.length} canonical permissions.`);

  // ----------------------------------------------------------------------------
  // 3. System Roles & Role-Permission Matrix
  // ----------------------------------------------------------------------------
  const rolesData = [
    {
      code: 'SUPER_ADMIN',
      name: 'Super Administrator',
      description: 'Platform owner with unrestricted access across all contexts',
      isSystem: true,
      permissions: permissionsData.map((p) => p.code),
    },
    {
      code: 'ADMIN',
      name: 'Platform Administrator',
      description: 'Administrative operator managing sellers, catalog, and compliance',
      isSystem: true,
      permissions: [
        'users:read', 'users:write', 'users:suspend', 'roles:read', 'permissions:read',
        'sellers:read', 'sellers:verify', 'sellers:suspend',
        'catalog:read', 'catalog:write', 'catalog:publish', 'catalog:archive',
        'orders:read', 'orders:manage', 'orders:cancel',
        'finance:read',
        'system:config', 'system:audit_read',
      ],
    },
    {
      code: 'OPERATIONS',
      name: 'Operations & Logistics Manager',
      description: 'Fulfillment, warehouse, and courier tracking coordinator',
      isSystem: true,
      permissions: ['orders:read', 'orders:manage', 'catalog:read', 'sellers:read', 'users:read'],
    },
    {
      code: 'SUPPORT',
      name: 'Customer Support Agent',
      description: 'First-tier customer and merchant support representative',
      isSystem: true,
      permissions: ['users:read', 'orders:read', 'catalog:read', 'sellers:read'],
    },
    {
      code: 'FINANCE',
      name: 'Financial Officer',
      description: 'Treasury, double-entry ledger, and seller payout officer',
      isSystem: true,
      permissions: [
        'finance:read', 'finance:ledger', 'finance:adjust', 'finance:payout',
        'orders:read', 'orders:refund', 'sellers:read', 'users:read',
      ],
    },
    {
      code: 'SELLER_OWNER',
      name: 'Store Merchant Owner',
      description: 'Primary owner of a verified multi-vendor storefront',
      isSystem: true,
      permissions: [
        'seller:profile:manage', 'seller:staff:manage',
        'catalog:read', 'catalog:write', 'catalog:publish', 'catalog:archive',
        'orders:read', 'orders:manage',
        'finance:read',
      ],
    },
    {
      code: 'SELLER_STAFF',
      name: 'Store Staff Member',
      description: 'Delegated staff handling order packing and product drafts',
      isSystem: true,
      permissions: ['catalog:read', 'catalog:write', 'orders:read', 'orders:manage'],
    },
    {
      code: 'CUSTOMER',
      name: 'Verified Shopper',
      description: 'Public registered shopper on the storefront',
      isSystem: true,
      permissions: ['catalog:read', 'orders:read'],
    },
    {
      code: 'RIDER',
      name: 'Delivery Rider',
      description: 'Last-mile logistics and dispatch rider',
      isSystem: true,
      permissions: ['orders:read', 'orders:manage'],
    },
  ];

  const roleMap = new Map<string, string>();

  for (const roleDef of rolesData) {
    let roleRecord = await (prisma as any).role.findFirst({
      where: { code: roleDef.code },
    });

    if (!roleRecord) {
      const id = generateId(ID_PREFIXES.ROLE);
      roleRecord = await (prisma as any).role.create({
        data: {
          id,
          code: roleDef.code,
          name: roleDef.name,
          description: roleDef.description,
          isSystem: roleDef.isSystem,
          version: 1,
        },
      });
    }

    roleMap.set(roleDef.code, roleRecord.id);

    // Map permissions
    for (const permCode of roleDef.permissions) {
      const permId = permissionMap.get(permCode);
      if (permId) {
        const existingRP = await (prisma as any).rolePermission.findFirst({
          where: { roleId: roleRecord.id, permissionId: permId },
        });

        if (!existingRP) {
          const rpId = generateId(ID_PREFIXES.ROLE_PERMISSION);
          await (prisma as any).rolePermission.create({
            data: {
              id: rpId,
              roleId: roleRecord.id,
              permissionId: permId,
              version: 1,
            },
          });
        }
      }
    }
  }
  console.info(`✅ Seeded ${rolesData.length} system roles with permission matrices.`);

  // ----------------------------------------------------------------------------
  // 4. Initial Platform Super Administrator User
  // ----------------------------------------------------------------------------
  const adminEmail = 'admin@alifworld.com';
  const adminPhone = '+8801700000000';

  let superAdminUser = await (prisma as any).user.findFirst({
    where: { email: adminEmail },
  });

  if (!superAdminUser) {
    const userId = generateId(ID_PREFIXES.USER);
    superAdminUser = await (prisma as any).user.create({
      data: {
        id: userId,
        email: adminEmail,
        phone: adminPhone,
        name: 'Platform Super Administrator',
        status: 'ACTIVE',
        isEmailVerified: true,
        isPhoneVerified: true,
        version: 1,
      },
    });

    const superAdminRoleId = roleMap.get('SUPER_ADMIN');
    if (superAdminRoleId) {
      const assignmentId = generateId(ID_PREFIXES.ROLE_ASSIGNMENT);
      await (prisma as any).userRoleAssignment.create({
        data: {
          id: assignmentId,
          userId: superAdminUser.id,
          roleId: superAdminRoleId,
          assignedBy: 'SYSTEM_SEED',
          version: 1,
        },
      });
    }

    console.info(`✅ Seeded super administrator user (${adminEmail}).`);
  }

  // Record seed execution in AuditLog
  await (prisma as any).auditLog.create({
    data: {
      action: 'DATABASE_SEED',
      resource: 'IAM',
      actorRole: 'SYSTEM',
      metadata: {
        timestamp: new Date().toISOString(),
        keysSeeded: initialConfigs.map((c) => c.key),
        rolesSeeded: rolesData.map((r) => r.code),
        permissionsSeeded: permissionsData.length,
      },
    },
  });

  console.info('🌱 AlifWorld database seed completed successfully.');
}

seed()
  .catch((error) => {
    console.error('❌ Database seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await disconnectPrisma();
  });
