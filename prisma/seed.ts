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

  // ----------------------------------------------------------------------------
  // 5. Initial Merchant Store, Staff, KYC Documents & Settings
  // ----------------------------------------------------------------------------
  const sellerOwnerEmail = 'rahim@dhakatech.com';
  const sellerOwnerPhone = '+8801711223344';
  const sellerSlug = 'dhaka-tech';

  let sellerOwnerUser = await (prisma as any).user.findFirst({
    where: { email: sellerOwnerEmail },
  });

  if (!sellerOwnerUser) {
    const userId = generateId(ID_PREFIXES.USER);
    sellerOwnerUser = await (prisma as any).user.create({
      data: {
        id: userId,
        email: sellerOwnerEmail,
        phone: sellerOwnerPhone,
        name: 'Rahim Chowdhury (Store Owner)',
        status: 'ACTIVE',
        isEmailVerified: true,
        isPhoneVerified: true,
        version: 1,
      },
    });
  }

  let merchantStore = await (prisma as any).seller.findFirst({
    where: { slug: sellerSlug },
  });

  if (!merchantStore) {
    const sellerId = generateId(ID_PREFIXES.SELLER);
    merchantStore = await (prisma as any).seller.create({
      data: {
        id: sellerId,
        ownerUserId: sellerOwnerUser.id,
        businessName: 'Dhaka Tech Electronics',
        slug: sellerSlug,
        tradeLicenseNumber: 'TRAD/DNCC/042189/2024',
        binNumber: '0012345678901',
        tinNumber: '123456789012',
        status: 'VERIFIED',
        verifiedAt: new Date(),
        verifiedBy: superAdminUser?.id || 'SYSTEM_SEED',
        version: 1,
      },
    });

    // Seed store settings
    const settingsId = generateId(ID_PREFIXES.STORE_SETTINGS);
    await (prisma as any).sellerStoreSettings.create({
      data: {
        id: settingsId,
        sellerId: merchantStore.id,
        supportEmail: 'support@dhakatech.com',
        supportPhone: sellerOwnerPhone,
        defaultCourier: 'PATHAO',
        pickupAddress: {
          division: 'Dhaka',
          district: 'Dhaka',
          upazila: 'Dhanmondi',
          streetAddress: 'House 12, Road 4, Dhanmondi R/A',
          postalCode: '1205',
        },
        returnAddress: {
          division: 'Dhaka',
          district: 'Dhaka',
          upazila: 'Dhanmondi',
          streetAddress: 'House 12, Road 4, Dhanmondi R/A',
          postalCode: '1205',
        },
        vacationMode: false,
        version: 1,
      },
    });

    // Seed verified Trade License KYC document
    const kycId = generateId(ID_PREFIXES.KYC_DOCUMENT);
    await (prisma as any).sellerKycDocument.create({
      data: {
        id: kycId,
        sellerId: merchantStore.id,
        documentType: 'TRADE_LICENSE',
        documentNumber: 'TRAD/DNCC/042189/2024',
        fileUrl: `sellers/${merchantStore.id}/kyc/trade_license.pdf`,
        fileSize: 1048576,
        mimeType: 'application/pdf',
        status: 'VERIFIED',
        verifiedAt: new Date(),
        verifiedBy: superAdminUser?.id || 'SYSTEM_SEED',
        version: 1,
      },
    });

    // Add owner to staff
    const staffId = generateId(ID_PREFIXES.STAFF);
    await (prisma as any).sellerStaff.create({
      data: {
        id: staffId,
        sellerId: merchantStore.id,
        userId: sellerOwnerUser.id,
        roleCode: 'SELLER_OWNER',
        permissions: ['*'],
        version: 1,
      },
    });

    // Assign SELLER_OWNER role in IAM scoped to merchantStore.id
    const sellerOwnerRoleId = roleMap.get('SELLER_OWNER');
    if (sellerOwnerRoleId) {
      const assignmentId = generateId(ID_PREFIXES.ROLE_ASSIGNMENT);
      await (prisma as any).userRoleAssignment.create({
        data: {
          id: assignmentId,
          userId: sellerOwnerUser.id,
          roleId: sellerOwnerRoleId,
          sellerId: merchantStore.id,
          assignedBy: 'SYSTEM_SEED',
          version: 1,
        },
      });
    }

    console.info(`✅ Seeded verified merchant store 'Dhaka Tech Electronics' (${merchantStore.id}).`);

    // ----------------------------------------------------------------------------
    // 6. Catalog Taxonomy, Brands & Products
    // ----------------------------------------------------------------------------
    // Seed Categories
    const rootCatId = generateId(ID_PREFIXES.CATEGORY);
    const rootCategory = await (prisma as any).category.upsert({
      where: { slug: 'electronics-gadgets' },
      create: {
        id: rootCatId,
        name: 'Electronics & Gadgets',
        nameBn: 'ইলেকট্রনিক্স ও গ্যাজেটস',
        slug: 'electronics-gadgets',
        description: 'Computers, smartphones, accessories and home entertainment',
        taxRatePercent: 5.00,
        displayOrder: 1,
        isActive: true,
        version: 1,
      },
      update: {},
    });

    const subCatPhoneId = generateId(ID_PREFIXES.CATEGORY);
    const phoneCategory = await (prisma as any).category.upsert({
      where: { slug: 'smartphones-tablets' },
      create: {
        id: subCatPhoneId,
        name: 'Smartphones & Tablets',
        nameBn: 'স্মার্টফোন ও ট্যাবলেট',
        slug: 'smartphones-tablets',
        parentId: rootCategory.id,
        taxRatePercent: 5.00,
        displayOrder: 1,
        isActive: true,
        version: 1,
      },
      update: {},
    });

    const subCatAudioId = generateId(ID_PREFIXES.CATEGORY);
    const audioCategory = await (prisma as any).category.upsert({
      where: { slug: 'audio-headphones' },
      create: {
        id: subCatAudioId,
        name: 'Audio & Headphones',
        nameBn: 'অডিও ও হেডফোন',
        slug: 'audio-headphones',
        parentId: rootCategory.id,
        taxRatePercent: 15.00,
        displayOrder: 2,
        isActive: true,
        version: 1,
      },
      update: {},
    });

    // Seed Brands
    const waltonBrandId = generateId(ID_PREFIXES.BRAND);
    const waltonBrand = await (prisma as any).brand.upsert({
      where: { slug: 'walton' },
      create: {
        id: waltonBrandId,
        name: 'Walton',
        slug: 'walton',
        website: 'https://waltonbd.com',
        isVerified: true,
        isActive: true,
        version: 1,
      },
      update: {},
    });

    const xiaomiBrandId = generateId(ID_PREFIXES.BRAND);
    const xiaomiBrand = await (prisma as any).brand.upsert({
      where: { slug: 'xiaomi' },
      create: {
        id: xiaomiBrandId,
        name: 'Xiaomi',
        slug: 'xiaomi',
        website: 'https://mi.com',
        isVerified: true,
        isActive: true,
        version: 1,
      },
      update: {},
    });

    // Seed Product 1: Walton Smartphone
    const prod1Id = generateId(ID_PREFIXES.PRODUCT);
    const phoneProduct = await (prisma as any).product.upsert({
      where: { slug: 'walton-primo-s8-pro' },
      create: {
        id: prod1Id,
        sellerId: merchantStore.id,
        categoryId: phoneCategory.id,
        brandId: waltonBrand.id,
        title: 'Walton Primo S8 Pro (8GB RAM / 128GB ROM)',
        titleBn: 'ওয়ালটন প্রিমো এস৮ প্রো (৮জিবি র‍্যাম / ১২৮জিবি রম)',
        slug: 'walton-primo-s8-pro',
        description: 'Flagship octa-core performance, 64MP AI Quad Camera, 5000mAh battery with 33W Fast Charging.',
        descriptionBn: 'অক্টাকোর পারফরম্যান্স, ৬৪ মেগাপিক্সেল এআই ক্যামেরা এবং দ্রুত চার্জিং সুবিধা।',
        status: 'PUBLISHED',
        basePricePoisha: BigInt(2199000), // ৳21,990.00
        compareAtPricePoisha: BigInt(2499000), // ৳24,990.00
        currency: 'BDT',
        productPoint: 450, // 450 Product Points
        sku: 'WALT-S8PRO',
        isPhysical: true,
        weightGrams: 195,
        warranty: '1 Year Official Warranty',
        tags: ['smartphone', 'walton', 'android', 'electronics'],
        taxRatePercent: 5.00,
        version: 1,
      },
      update: {},
    });

    // Seed Variants for Phone Product
    await (prisma as any).productVariant.upsert({
      where: { sku: 'WALT-S8PRO-BLK-128' },
      create: {
        id: generateId(ID_PREFIXES.VARIANT),
        productId: phoneProduct.id,
        sku: 'WALT-S8PRO-BLK-128',
        title: 'Midnight Black / 128GB',
        pricePoisha: BigInt(2199000),
        compareAtPricePoisha: BigInt(2499000),
        productPoint: 450,
        option1Name: 'Color',
        option1Value: 'Midnight Black',
        option2Name: 'Storage',
        option2Value: '128GB',
        isActive: true,
        version: 1,
      },
      update: {},
    });

    await (prisma as any).productVariant.upsert({
      where: { sku: 'WALT-S8PRO-BLU-128' },
      create: {
        id: generateId(ID_PREFIXES.VARIANT),
        productId: phoneProduct.id,
        sku: 'WALT-S8PRO-BLU-128',
        title: 'Ocean Blue / 128GB',
        pricePoisha: BigInt(2199000),
        compareAtPricePoisha: BigInt(2499000),
        productPoint: 450,
        option1Name: 'Color',
        option1Value: 'Ocean Blue',
        option2Name: 'Storage',
        option2Value: '128GB',
        isActive: true,
        version: 1,
      },
      update: {},
    });

    // Seed Media for Phone Product
    const phoneMediaExists = await (prisma as any).productMedia.findFirst({
      where: { productId: phoneProduct.id },
    });
    if (!phoneMediaExists) {
      await (prisma as any).productMedia.create({
        data: {
          id: generateId(ID_PREFIXES.MEDIA),
          productId: phoneProduct.id,
          mediaType: 'IMAGE',
          url: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97',
          altText: 'Walton Primo S8 Pro Front and Back',
          isPrimary: true,
          displayOrder: 1,
        },
      });
    }

    // Seed Product 2: Xiaomi Earbuds
    const prod2Id = generateId(ID_PREFIXES.PRODUCT);
    const audioProduct = await (prisma as any).product.upsert({
      where: { slug: 'xiaomi-redmi-buds-5-pro' },
      create: {
        id: prod2Id,
        sellerId: merchantStore.id,
        categoryId: audioCategory.id,
        brandId: xiaomiBrand.id,
        title: 'Xiaomi Redmi Buds 5 Pro Wireless Earbuds',
        titleBn: 'শাওমি রেডমি বাডস ৫ প্রো ওয়্যারলেস ইয়ারবাডস',
        slug: 'xiaomi-redmi-buds-5-pro',
        description: 'Active Noise Cancellation up to 52dB, Hi-Res Audio Wireless with LDAC, 38 hours total battery.',
        descriptionBn: 'হাই-রেস অডিও সাপোর্ট এবং দীর্ঘ ব্যাটারি ব্যাকআপ সমৃদ্ধ অ্যাক্টিভ নয়েজ ক্যান্সেলেশন।',
        status: 'PUBLISHED',
        basePricePoisha: BigInt(649000), // ৳6,490.00
        compareAtPricePoisha: BigInt(749000), // ৳7,490.00
        currency: 'BDT',
        productPoint: 120, // 120 Product Points
        sku: 'MI-BUDS5P',
        isPhysical: true,
        warranty: '6 Months Brand Warranty',
        tags: ['earbuds', 'audio', 'xiaomi', 'anc'],
        taxRatePercent: 15.00,
        version: 1,
      },
      update: {},
    });

    await (prisma as any).productVariant.upsert({
      where: { sku: 'MI-BUDS5P-WHT' },
      create: {
        id: generateId(ID_PREFIXES.VARIANT),
        productId: audioProduct.id,
        sku: 'MI-BUDS5P-WHT',
        title: 'Moonlight White',
        pricePoisha: BigInt(649000),
        compareAtPricePoisha: BigInt(749000),
        productPoint: 120,
        option1Name: 'Color',
        option1Value: 'Moonlight White',
        isActive: true,
        version: 1,
      },
      update: {},
    });

    const audioMediaExists = await (prisma as any).productMedia.findFirst({
      where: { productId: audioProduct.id },
    });
    if (!audioMediaExists) {
      await (prisma as any).productMedia.create({
        data: {
          id: generateId(ID_PREFIXES.MEDIA),
          productId: audioProduct.id,
          mediaType: 'IMAGE',
          url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df',
          altText: 'Xiaomi Redmi Buds 5 Pro White',
          isPrimary: true,
          displayOrder: 1,
        },
      });
    }

    console.info('✅ Seeded catalog categories, brands, products, variants, and media.');
  }

  // Record seed execution in AuditLog
  await (prisma as any).auditLog.create({
    data: {
      action: 'DATABASE_SEED',
      resource: 'IAM_AND_SELLER',
      actorRole: 'SYSTEM',
      metadata: {
        timestamp: new Date().toISOString(),
        keysSeeded: initialConfigs.map((c) => c.key),
        rolesSeeded: rolesData.map((r) => r.code),
        permissionsSeeded: permissionsData.length,
        merchantSeeded: merchantStore?.slug,
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
