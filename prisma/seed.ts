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

    // Inventory & Warehouses
    { code: 'inventory:read', name: 'View Inventory', module: 'INVENTORY', description: 'Inspect stock balances, warehouse stock, and movement ledgers' },
    { code: 'inventory:write', name: 'Manage Inventory', module: 'INVENTORY', description: 'Intake stock, adjust balances, and manage warehouses' },
    { code: 'inventory:adjust', name: 'Audit Adjustments', module: 'INVENTORY', description: 'Execute damage, write-off, and audit stock adjustments' },

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
        'inventory:read', 'inventory:write', 'inventory:adjust',
        'finance:read',
        'system:config', 'system:audit_read',
      ],
    },
    {
      code: 'OPERATIONS',
      name: 'Operations & Logistics Manager',
      description: 'Fulfillment, warehouse, and courier tracking coordinator',
      isSystem: true,
      permissions: ['orders:read', 'orders:manage', 'catalog:read', 'sellers:read', 'users:read', 'inventory:read', 'inventory:write', 'inventory:adjust'],
    },
    {
      code: 'SUPPORT',
      name: 'Customer Support Agent',
      description: 'First-tier customer and merchant support representative',
      isSystem: true,
      permissions: ['users:read', 'orders:read', 'catalog:read', 'sellers:read', 'inventory:read'],
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
        'inventory:read', 'inventory:write', 'inventory:adjust',
        'finance:read',
      ],
    },
    {
      code: 'SELLER_STAFF',
      name: 'Store Staff Member',
      description: 'Delegated staff handling order packing and product drafts',
      isSystem: true,
      permissions: ['catalog:read', 'catalog:write', 'orders:read', 'orders:manage', 'inventory:read', 'inventory:write'],
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

  // ----------------------------------------------------------------------------
  // 7. Warehouses, Inventory Stock Balances, Reservations & Movement Ledgers
  // ----------------------------------------------------------------------------
  if (merchantStore) {
    // 7.1 Warehouses
    const dhakaHub = await (prisma as any).warehouse.upsert({
      where: { code: 'DHK-HUB-01' },
      create: {
        id: generateId(ID_PREFIXES.WAREHOUSE),
        sellerId: null, // Platform fulfillment hub
        name: 'Dhaka Central Fulfillment Hub',
        code: 'DHK-HUB-01',
        division: 'DHAKA',
        district: 'Dhaka',
        upazila: 'Tejgaon',
        addressLine: 'Plot 14-16, Tejgaon Industrial Area, Dhaka-1208',
        postalCode: '1208',
        isPlatformHub: true,
        isActive: true,
        version: 1,
      },
      update: {},
    });

    const bananiDepot = await (prisma as any).warehouse.upsert({
      where: { code: 'DHK-DTH-01' },
      create: {
        id: generateId(ID_PREFIXES.WAREHOUSE),
        sellerId: merchantStore.id, // Merchant-owned warehouse
        name: 'Dhaka Tech Banani Depot',
        code: 'DHK-DTH-01',
        division: 'DHAKA',
        district: 'Dhaka',
        upazila: 'Banani',
        addressLine: 'Road 11, Block D, Banani, Dhaka-1213',
        postalCode: '1213',
        isPlatformHub: false,
        isActive: true,
        version: 1,
      },
      update: {},
    });

    await (prisma as any).warehouse.upsert({
      where: { code: 'CTG-HUB-01' },
      create: {
        id: generateId(ID_PREFIXES.WAREHOUSE),
        sellerId: null, // Regional platform hub
        name: 'Chittagong Port Logistics Hub',
        code: 'CTG-HUB-01',
        division: 'CHITTAGONG',
        district: 'Chittagong',
        upazila: 'Agrabad',
        addressLine: 'Agrabad Commercial Area, Chittagong-4100',
        postalCode: '4100',
        isPlatformHub: true,
        isActive: true,
        version: 1,
      },
      update: {},
    });

    // 7.2 Stock Balances
    const phoneVariant = await (prisma as any).productVariant.findUnique({
      where: { sku: 'WLT-PRX60-BLU-128' },
    });

    const earbudsVariant = await (prisma as any).productVariant.findUnique({
      where: { sku: 'MI-BUDS5P-WHT' },
    });

    if (phoneVariant && earbudsVariant) {
      // Balance 1: Walton Phone at Central Hub (80 on-hand, 5 reserved, 1 damaged -> 74 available)
      const bal1 = await (prisma as any).stockBalance.upsert({
        where: {
          warehouseId_variantId: {
            warehouseId: dhakaHub.id,
            variantId: phoneVariant.id,
          },
        },
        create: {
          id: generateId(ID_PREFIXES.STOCK_BALANCE),
          warehouseId: dhakaHub.id,
          variantId: phoneVariant.id,
          onHand: 80,
          reserved: 5,
          damaged: 1,
          quarantined: 0,
          lowStockThreshold: 10,
          reorderPoint: 20,
          version: 1,
        },
        update: {},
      });

      // Balance 2: Walton Phone at Banani Depot (30 on-hand, 0 reserved, 0 damaged -> 30 available)
      const bal2 = await (prisma as any).stockBalance.upsert({
        where: {
          warehouseId_variantId: {
            warehouseId: bananiDepot.id,
            variantId: phoneVariant.id,
          },
        },
        create: {
          id: generateId(ID_PREFIXES.STOCK_BALANCE),
          warehouseId: bananiDepot.id,
          variantId: phoneVariant.id,
          onHand: 30,
          reserved: 0,
          damaged: 0,
          quarantined: 0,
          lowStockThreshold: 5,
          reorderPoint: 10,
          version: 1,
        },
        update: {},
      });

      // Balance 3: Xiaomi Earbuds at Central Hub (120 on-hand, 10 reserved, 2 damaged -> 108 available)
      const bal3 = await (prisma as any).stockBalance.upsert({
        where: {
          warehouseId_variantId: {
            warehouseId: dhakaHub.id,
            variantId: earbudsVariant.id,
          },
        },
        create: {
          id: generateId(ID_PREFIXES.STOCK_BALANCE),
          warehouseId: dhakaHub.id,
          variantId: earbudsVariant.id,
          onHand: 120,
          reserved: 10,
          damaged: 2,
          quarantined: 0,
          lowStockThreshold: 15,
          reorderPoint: 30,
          version: 1,
        },
        update: {},
      });

      // Balance 4: Xiaomi Earbuds at Banani Depot (45 on-hand, 0 reserved, 0 damaged -> 45 available)
      const bal4 = await (prisma as any).stockBalance.upsert({
        where: {
          warehouseId_variantId: {
            warehouseId: bananiDepot.id,
            variantId: earbudsVariant.id,
          },
        },
        create: {
          id: generateId(ID_PREFIXES.STOCK_BALANCE),
          warehouseId: bananiDepot.id,
          variantId: earbudsVariant.id,
          onHand: 45,
          reserved: 0,
          damaged: 0,
          quarantined: 0,
          lowStockThreshold: 10,
          reorderPoint: 20,
          version: 1,
        },
        update: {},
      });

      // 7.3 Stock Reservations (for checkout sessions)
      const res1Exists = await (prisma as any).stockReservation.findFirst({
        where: { stockBalanceId: bal1.id },
      });
      if (!res1Exists) {
        await (prisma as any).stockReservation.create({
          data: {
            id: generateId(ID_PREFIXES.STOCK_RESERVATION),
            stockBalanceId: bal1.id,
            cartId: 'crt_demo_checkout_01',
            quantity: 5,
            status: 'ACTIVE',
            expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 mins TTL
            version: 1,
          },
        });
      }

      const res2Exists = await (prisma as any).stockReservation.findFirst({
        where: { stockBalanceId: bal3.id },
      });
      if (!res2Exists) {
        await (prisma as any).stockReservation.create({
          data: {
            id: generateId(ID_PREFIXES.STOCK_RESERVATION),
            stockBalanceId: bal3.id,
            cartId: 'crt_demo_checkout_02',
            quantity: 10,
            status: 'ACTIVE',
            expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 mins TTL
            version: 1,
          },
        });
      }

      // 7.4 Immutable Stock Movement Ledger Entries
      const movementsCount = await (prisma as any).stockMovementLedger.count();
      if (movementsCount === 0) {
        // Bal1 initial intake
        await (prisma as any).stockMovementLedger.create({
          data: {
            id: generateId(ID_PREFIXES.STOCK_MOVEMENT),
            stockBalanceId: bal1.id,
            warehouseId: dhakaHub.id,
            variantId: phoneVariant.id,
            movementType: 'RECEIVE',
            quantityDelta: 80,
            onHandAfter: 80,
            reservedAfter: 0,
            availableAfter: 80,
            sourceType: 'PURCHASE_ORDER',
            sourceId: 'PO-2026-001',
            actorId: 'usr_superadmin',
            reason: 'Initial platform hub inventory intake',
          },
        });
        // Bal1 reservation
        await (prisma as any).stockMovementLedger.create({
          data: {
            id: generateId(ID_PREFIXES.STOCK_MOVEMENT),
            stockBalanceId: bal1.id,
            warehouseId: dhakaHub.id,
            variantId: phoneVariant.id,
            movementType: 'RESERVE',
            quantityDelta: -5,
            onHandAfter: 80,
            reservedAfter: 5,
            availableAfter: 75,
            sourceType: 'CHECKOUT_RESERVATION',
            sourceId: 'crt_demo_checkout_01',
            actorId: 'usr_customer_demo',
            reason: 'Buyer checkout session reservation',
          },
        });
        // Bal1 damage adjustment
        await (prisma as any).stockMovementLedger.create({
          data: {
            id: generateId(ID_PREFIXES.STOCK_MOVEMENT),
            stockBalanceId: bal1.id,
            warehouseId: dhakaHub.id,
            variantId: phoneVariant.id,
            movementType: 'DAMAGE',
            quantityDelta: -1,
            onHandAfter: 80,
            reservedAfter: 5,
            availableAfter: 74,
            sourceType: 'AUDIT_ADJUSTMENT',
            sourceId: bal1.id,
            actorId: 'usr_superadmin',
            reason: 'Package seal damaged during offloading inspection',
          },
        });

        // Bal2 initial intake
        await (prisma as any).stockMovementLedger.create({
          data: {
            id: generateId(ID_PREFIXES.STOCK_MOVEMENT),
            stockBalanceId: bal2.id,
            warehouseId: bananiDepot.id,
            variantId: phoneVariant.id,
            movementType: 'RECEIVE',
            quantityDelta: 30,
            onHandAfter: 30,
            reservedAfter: 0,
            availableAfter: 30,
            sourceType: 'PURCHASE_ORDER',
            sourceId: 'PO-2026-002',
            actorId: sellerOwnerUser.id,
            reason: 'Direct merchant stock intake',
          },
        });

        // Bal3 initial intake
        await (prisma as any).stockMovementLedger.create({
          data: {
            id: generateId(ID_PREFIXES.STOCK_MOVEMENT),
            stockBalanceId: bal3.id,
            warehouseId: dhakaHub.id,
            variantId: earbudsVariant.id,
            movementType: 'RECEIVE',
            quantityDelta: 120,
            onHandAfter: 120,
            reservedAfter: 0,
            availableAfter: 120,
            sourceType: 'PURCHASE_ORDER',
            sourceId: 'PO-2026-003',
            actorId: 'usr_superadmin',
            reason: 'Initial platform hub inventory intake',
          },
        });
        // Bal3 reservation
        await (prisma as any).stockMovementLedger.create({
          data: {
            id: generateId(ID_PREFIXES.STOCK_MOVEMENT),
            stockBalanceId: bal3.id,
            warehouseId: dhakaHub.id,
            variantId: earbudsVariant.id,
            movementType: 'RESERVE',
            quantityDelta: -10,
            onHandAfter: 120,
            reservedAfter: 10,
            availableAfter: 110,
            sourceType: 'CHECKOUT_RESERVATION',
            sourceId: 'crt_demo_checkout_02',
            actorId: 'usr_customer_demo',
            reason: 'Buyer checkout session reservation',
          },
        });
        // Bal3 damage
        await (prisma as any).stockMovementLedger.create({
          data: {
            id: generateId(ID_PREFIXES.STOCK_MOVEMENT),
            stockBalanceId: bal3.id,
            warehouseId: dhakaHub.id,
            variantId: earbudsVariant.id,
            movementType: 'DAMAGE',
            quantityDelta: -2,
            onHandAfter: 120,
            reservedAfter: 10,
            availableAfter: 108,
            sourceType: 'AUDIT_ADJUSTMENT',
            sourceId: bal3.id,
            actorId: 'usr_superadmin',
            reason: 'Warehouse shelf transit impact testing damage',
          },
        });

        // Bal4 initial intake
        await (prisma as any).stockMovementLedger.create({
          data: {
            id: generateId(ID_PREFIXES.STOCK_MOVEMENT),
            stockBalanceId: bal4.id,
            warehouseId: bananiDepot.id,
            variantId: earbudsVariant.id,
            movementType: 'RECEIVE',
            quantityDelta: 45,
            onHandAfter: 45,
            reservedAfter: 0,
            availableAfter: 45,
            sourceType: 'PURCHASE_ORDER',
            sourceId: 'PO-2026-004',
            actorId: sellerOwnerUser.id,
            reason: 'Direct merchant stock intake',
          },
        });
      }

      console.info('✅ Seeded platform warehouses, stock balances, active reservations, and movement ledgers.');
    }

    // ----------------------------------------------------------------------------
    // 8. Carts, Orders, Multi-Vendor Fulfillment Groups & Shipments
    // ----------------------------------------------------------------------------
    const customerEmail = 'shopper@alifworld.com';
    let demoCustomer = await (prisma as any).user.findFirst({
      where: { email: customerEmail },
    });

    if (!demoCustomer) {
      demoCustomer = await (prisma as any).user.create({
        data: {
          id: generateId(ID_PREFIXES.USER),
          email: customerEmail,
          phone: '+8801700112233',
          name: 'Tanvir Ahmed',
          status: 'ACTIVE',
          isEmailVerified: true,
          isPhoneVerified: true,
          version: 1,
        },
      });

      const customerRoleId = roleMap.get('CUSTOMER');
      if (customerRoleId) {
        await (prisma as any).userRoleAssignment.create({
          data: {
            id: generateId(ID_PREFIXES.ROLE_ASSIGNMENT),
            userId: demoCustomer.id,
            roleId: customerRoleId,
            assignedBy: 'SYSTEM_SEED',
          },
        });
      }
      console.info(`✅ Seeded demo customer user (${customerEmail}).`);
    }

    // 8.1 Seed Demo Active Cart
    const existingCart = await (prisma as any).cart.findFirst({
      where: { userId: demoCustomer.id, status: 'ACTIVE' },
    });

    if (!existingCart) {
      const cartId = generateId(ID_PREFIXES.CART);
      const cart = await (prisma as any).cart.create({
        data: {
          id: cartId,
          userId: demoCustomer.id,
          currency: 'BDT',
          status: 'ACTIVE',
          notes: 'Customer shopping cart with electronic items',
        },
      });

      if (earbudsVariant && merchantStore) {
        await (prisma as any).cartItem.create({
          data: {
            id: generateId(ID_PREFIXES.CART_ITEM),
            cartId: cart.id,
            variantId: earbudsVariant.id,
            sellerId: merchantStore.id,
            quantity: 2,
            pricePoisha: BigInt(299000), // ৳2,990.00
            productPoint: 60, // 60 discrete Product Points per unit
          },
        });
      }
      console.info('✅ Seeded active customer shopping cart and cart items.');
    }

    // 8.2 Seed Demo Order, Fulfillment Group, Items, History, and Shipment
    const demoOrderNumber = 'ORD-20260922-0001';
    const existingOrder = await (prisma as any).order.findFirst({
      where: { orderNumber: demoOrderNumber },
    });

    if (!existingOrder && phoneVariant && merchantStore) {
      const orderId = generateId(ID_PREFIXES.ORDER);
      const order = await (prisma as any).order.create({
        data: {
          id: orderId,
          orderNumber: demoOrderNumber,
          customerId: demoCustomer.id,
          currency: 'BDT',
          status: 'PROCESSING',
          paymentStatus: 'PAID',
          fulfillmentStatus: 'PARTIALLY_FULFILLED',
          subtotalPoisha: BigInt(2199000), // ৳21,990.00
          shippingFeePoisha: BigInt(6000),  // ৳60.00 (Dhaka inside)
          taxPoisha: BigInt(329850),        // ৳3,298.50 (15% VAT)
          totalPoisha: BigInt(2534850),      // ৳25,348.50
          totalProductPoints: 450,          // 450 discrete Product Points (independent from BDT)
          pointsReleased: false,
          shippingName: 'Tanvir Ahmed',
          shippingPhone: '+8801700112233',
          shippingDivision: 'DHAKA',
          shippingDistrict: 'Dhaka (Gulshan-2)',
          shippingAddress: 'House 42, Road 11, Block D, Gulshan-2, Dhaka-1212',
          shippingPostalCode: '1212',
          ruleVersion: 'v1.0.0',
          customerNotes: 'Please ring bell upon arrival.',
          confirmedAt: new Date(),
        },
      });

      // Fulfillment Group
      const groupId = generateId(ID_PREFIXES.FULFILLMENT_GROUP);
      const sfg = await (prisma as any).sellerFulfillmentGroup.create({
        data: {
          id: groupId,
          orderId: order.id,
          sellerId: merchantStore.id,
          warehouseId: bananiDepot ? bananiDepot.id : null,
          groupNumber: `${demoOrderNumber}-SFG01`,
          status: 'HANDED_OVER_TO_COURIER',
          subtotalPoisha: BigInt(2199000),
          shippingFeePoisha: BigInt(6000),
          taxPoisha: BigInt(329850),
          totalPoisha: BigInt(2534850),
          sellerCommissionPoisha: BigInt(109950), // 5% = ৳1,099.50
          sellerPayoutPoisha: BigInt(2424900),     // ৳24,249.00
          totalProductPoints: 450,
          courierProvider: 'PATHAO',
          trackingNumber: 'PTH-DHK-882910',
          consignmentId: 'CSG-2026-0922-901',
        },
      });

      // Order Item snapshot
      await (prisma as any).orderItem.create({
        data: {
          id: generateId(ID_PREFIXES.ORDER_ITEM),
          orderId: order.id,
          fulfillmentGroupId: sfg.id,
          sellerId: merchantStore.id,
          variantId: phoneVariant.id,
          productTitle: 'Nexus Pro Smartphone 5G',
          variantTitle: 'Midnight Black / 128GB',
          sku: phoneVariant.sku,
          unitPricePoisha: BigInt(2199000),
          quantity: 1,
          totalPoisha: BigInt(2199000),
          taxRatePercent: 15.0,
          taxPoisha: BigInt(329850),
          productPointSnapshot: 450,
          totalProductPoints: 450,
          status: 'SHIPPED',
        },
      });

      // Append-Only Order Status Audit History
      await (prisma as any).orderStatusHistory.createMany({
        data: [
          {
            id: generateId(ID_PREFIXES.ORDER_STATUS_HISTORY),
            orderId: order.id,
            fromStatus: null,
            toStatus: 'PENDING_PAYMENT',
            actorId: demoCustomer.id,
            actorRole: 'CUSTOMER',
            reason: 'Buyer submitted order checkout with digital payment selected',
          },
          {
            id: generateId(ID_PREFIXES.ORDER_STATUS_HISTORY),
            orderId: order.id,
            fromStatus: 'PENDING_PAYMENT',
            toStatus: 'CONFIRMED',
            actorId: 'usr_superadmin',
            actorRole: 'SYSTEM',
            reason: 'Payment authorized and settled via bKash gateway',
          },
          {
            id: generateId(ID_PREFIXES.ORDER_STATUS_HISTORY),
            orderId: order.id,
            fromStatus: 'CONFIRMED',
            toStatus: 'PROCESSING',
            actorId: sellerOwnerUser ? sellerOwnerUser.id : null,
            actorRole: 'SELLER',
            reason: 'Merchant accepted fulfillment group and initiated parcel packaging',
          },
        ],
      });

      // Logistics Shipment & Timeline Events
      const shipmentId = generateId(ID_PREFIXES.SHIPMENT);
      const shipment = await (prisma as any).shipment.create({
        data: {
          id: shipmentId,
          fulfillmentGroupId: sfg.id,
          sellerId: merchantStore.id,
          shipmentNumber: 'SHP-20260922-0001',
          courierProvider: 'PATHAO',
          trackingNumber: 'PTH-DHK-882910',
          consignmentId: 'CSG-2026-0922-901',
          status: 'IN_TRANSIT',
          weightGrams: 420,
          packageCount: 1,
          shippingCostPoisha: BigInt(6000),
          shippedAt: new Date(),
          recipientName: 'Tanvir Ahmed',
          recipientPhone: '+8801700112233',
          deliveryAddress: 'House 42, Road 11, Block D, Gulshan-2, Dhaka-1212',
          division: 'DHAKA',
          district: 'Dhaka (Gulshan-2)',
        },
      });

      await (prisma as any).shipmentEvent.createMany({
        data: [
          {
            id: generateId(ID_PREFIXES.SHIPMENT_EVENT),
            shipmentId: shipment.id,
            status: 'LABEL_CREATED',
            description: 'Merchant generated Pathao delivery consignment label',
            occurredAt: new Date(Date.now() - 3600000 * 4),
          },
          {
            id: generateId(ID_PREFIXES.SHIPMENT_EVENT),
            shipmentId: shipment.id,
            status: 'PICKED_UP',
            description: 'Pathao courier rider picked up parcel from Dhaka Tech Banani Depot',
            location: 'Banani, Dhaka',
            occurredAt: new Date(Date.now() - 3600000 * 2),
          },
          {
            id: generateId(ID_PREFIXES.SHIPMENT_EVENT),
            shipmentId: shipment.id,
            status: 'IN_TRANSIT',
            description: 'Parcel arrived at Tejgaon Central Logistics Hub for route sorting',
            location: 'Tejgaon Sorting Hub, Dhaka',
            occurredAt: new Date(Date.now() - 3600000),
          },
        ],
      });

      console.info('✅ Seeded demo multi-vendor order, seller fulfillment group, shipment, and audit history.');
    }

    // ----------------------------------------------------------------------------
    // 9. Payments, Refunds, Platform Commissions, Settlements & Payouts
    // ----------------------------------------------------------------------------
    const demoOrder = await (prisma as any).order.findFirst({
      where: { orderNumber: demoOrderNumber },
      include: { fulfillmentGroups: true },
    });

    if (demoOrder && merchantStore) {
      const existingPayment = await (prisma as any).payment.findFirst({
        where: { orderId: demoOrder.id },
      });

      if (!existingPayment) {
        // 9.1 Seed bKash Customer Payment
        const paymentId = generateId(ID_PREFIXES.PAYMENT);
        await (prisma as any).payment.create({
          data: {
            id: paymentId,
            orderId: demoOrder.id,
            customerId: demoOrder.customerId,
            paymentNumber: 'PAY-20260922-0001',
            gatewayProvider: 'BKASH',
            gatewayTransactionId: 'TRX99201948BK',
            status: 'CAPTURED',
            amountPoisha: demoOrder.totalPoisha,
            currency: 'BDT',
            feePoisha: BigInt(38023), // ~1.5% bKash gateway processing fee (৳380.23)
            clientIp: '103.230.104.18',
            idempotencyKey: 'idemp-pay-seed-001',
            gatewayPayload: {
              trxID: 'TRX99201948BK',
              paymentID: 'BKPAY20260922881',
              transactionStatus: 'Completed',
              amount: '25348.50',
              currency: 'BDT',
              customerMsisdn: '01700112233',
              merchantInvoiceNumber: demoOrder.orderNumber,
            },
            authorizedAt: new Date(Date.now() - 3600000 * 5),
            capturedAt: new Date(Date.now() - 3600000 * 5),
          },
        });

        // 9.2 Seed bKash Webhook IPN Audit Log
        await (prisma as any).paymentWebhookLog.create({
          data: {
            id: generateId(ID_PREFIXES.WEBHOOK_LOG),
            gatewayProvider: 'BKASH',
            eventType: 'PAYMENT_CAPTURE',
            externalEventId: 'EVT-BK-20260922-9920',
            signature: 'a4f890c2e9123b7a8d5f6e890123456789abcdef0123456789abcdef01234567',
            payload: {
              event: 'payment.captured',
              trxID: 'TRX99201948BK',
              paymentID: 'BKPAY20260922881',
              amount: '25348.50',
              currency: 'BDT',
              dateTime: new Date(Date.now() - 3600000 * 5).toISOString(),
            },
            status: 'PROCESSED',
            processedAt: new Date(Date.now() - 3600000 * 5),
          },
        });

        const targetFulfillmentGroup = demoOrder.fulfillmentGroups[0];
        if (targetFulfillmentGroup) {
          // 9.3 Seed Platform Commission Ledger (5% = 500 bps on gross goods subtotal)
          const commissionBasis = targetFulfillmentGroup.subtotalPoisha;
          const commissionAmount = (commissionBasis * BigInt(500)) / BigInt(10000); // 109,950 poisha

          await (prisma as any).commissionLedger.create({
            data: {
              id: generateId(ID_PREFIXES.COMMISSION),
              sellerId: merchantStore.id,
              orderId: demoOrder.id,
              fulfillmentGroupId: targetFulfillmentGroup.id,
              basisAmountPoisha: commissionBasis,
              commissionRateBps: 500,
              commissionPoisha: commissionAmount,
              ruleVersion: 'v1.0.0',
              status: 'EARNED',
              notes: 'Standard 5% marketplace commission on consumer electronics category',
            },
          });

          // 9.4 Seed Seller Settlement Statement Batch
          const settlementId = generateId(ID_PREFIXES.SETTLEMENT);
          const netPayout =
            targetFulfillmentGroup.subtotalPoisha +
            targetFulfillmentGroup.shippingFeePoisha +
            targetFulfillmentGroup.taxPoisha -
            commissionAmount; // 2,199,000 + 6,000 + 329,850 - 109,950 = 2,424,900 poisha

          const settlement = await (prisma as any).sellerSettlement.create({
            data: {
              id: settlementId,
              sellerId: merchantStore.id,
              settlementNumber: 'STL-20260922-0001',
              periodStart: new Date(Date.now() - 86400000 * 7),
              periodEnd: new Date(),
              grossOrderPoisha: targetFulfillmentGroup.subtotalPoisha,
              shippingFeePoisha: targetFulfillmentGroup.shippingFeePoisha,
              taxPoisha: targetFulfillmentGroup.taxPoisha,
              commissionPoisha: commissionAmount,
              refundDeductionPoisha: BigInt(0),
              netPayoutPoisha: netPayout,
              status: 'APPROVED',
              auditedBy: 'usr_superadmin',
              auditedAt: new Date(Date.now() - 3600000 * 3),
              approvedBy: 'usr_superadmin',
              approvedAt: new Date(Date.now() - 3600000 * 2),
            },
          });

          // 9.5 Seed Bank Wire Disbursal (City Bank BEFTN Transfer)
          await (prisma as any).sellerPayout.create({
            data: {
              id: generateId(ID_PREFIXES.PAYOUT),
              settlementId: settlement.id,
              sellerId: merchantStore.id,
              payoutNumber: 'POT-20260922-0001',
              channel: 'BEFTN',
              bankName: 'City Bank PLC',
              accountNumber: '1102938475001',
              accountTitle: 'Dhaka Tech Retail Ltd',
              routingNumber: '225272345',
              amountPoisha: netPayout,
              currency: 'BDT',
              status: 'SUCCESS',
              gatewayReference: 'BEFTN-CB-20260922-7721',
              disbursedAt: new Date(Date.now() - 3600000 * 1),
            },
          });
        }

        console.info('✅ Seeded demo payment, gateway webhook log, commission ledger, settlement, and BEFTN payout.');
      }
    }

    // ----------------------------------------------------------------------------
    // 10. Wallets, Decoupled Product Points, Rewards, Ranks & Double-Entry Ledgers
    // ----------------------------------------------------------------------------
    // 10.1 Chart of Accounts
    const accountsData = [
      { code: '1010-CASH-GATEWAY', name: 'Cash at Digital Gateway (Asset)', type: 'ASSET', desc: 'Inward payments collected at bKash/Nagad' },
      { code: '2010-CUSTOMER-MAIN-LIABILITY', name: 'Customer Main Wallet (Liability)', type: 'LIABILITY', desc: 'Customer withdrawable fiat balances' },
      { code: '2020-CUSTOMER-SHOPPING-LIABILITY', name: 'Customer Shopping Wallet (Liability)', type: 'LIABILITY', desc: 'Customer store credit balances' },
      { code: '2030-CUSTOMER-GOODLUCK-LIABILITY', name: 'Customer Good-Luck Wallet (Liability)', type: 'LIABILITY', desc: 'Customer promotional lottery balances' },
      { code: '2040-CUSTOMER-CHARITY-LIABILITY', name: 'Customer Charity Wallet (Liability)', type: 'LIABILITY', desc: 'Customer allocated donation funds' },
      { code: '4010-PLATFORM-COMMISSION-REVENUE', name: 'Marketplace Commission Revenue', type: 'REVENUE', desc: 'Standard 5% platform cut' },
      { code: '4020-SERVICE-CHARGE-REVENUE', name: 'Platform Service Charge Revenue', type: 'REVENUE', desc: '10% reward service fee deduction' },
      { code: '5010-PROMOTIONAL-REWARDS-EXPENSE', name: 'Promotional Rewards Expense Pool', type: 'EXPENSE', desc: 'Funded pool for buyer reward distribution' },
    ];

    const accountMap = new Map<string, any>();
    for (const acc of accountsData) {
      let existingAcc = await (prisma as any).ledgerAccount.findUnique({ where: { code: acc.code } });
      if (!existingAcc) {
        existingAcc = await (prisma as any).ledgerAccount.create({
          data: {
            id: generateId(ID_PREFIXES.LEDGER_ACCOUNT),
            code: acc.code,
            name: acc.name,
            type: acc.type,
            currency: 'BDT',
            description: acc.desc,
            isActive: true,
          },
        });
      }
      accountMap.set(acc.code, existingAcc);
    }

    // 10.2 Customer Wallets
    if (demoCustomer) {
      const walletTypes = [
        { type: 'MAIN', available: BigInt(50000) },      // ৳500.00
        { type: 'SHOPPING', available: BigInt(20000) },  // ৳200.00
        { type: 'GOOD_LUCK', available: BigInt(15000) }, // ৳150.00
        { type: 'CHARITY', available: BigInt(5000) },    // ৳50.00
      ];

      const customerWallets: Record<string, any> = {};
      for (const wt of walletTypes) {
        let w = await (prisma as any).wallet.findFirst({
          where: { userId: demoCustomer.id, type: wt.type, deletedAt: null },
        });
        if (!w) {
          w = await (prisma as any).wallet.create({
            data: {
              id: generateId(ID_PREFIXES.WALLET),
              userId: demoCustomer.id,
              type: wt.type,
              currency: 'BDT',
              availablePoisha: wt.available,
              pendingPoisha: BigInt(0),
              status: 'ACTIVE',
            },
          });
        }
        customerWallets[wt.type] = w;
      }

      // 10.3 Decoupled Product Points Account
      let pointAcc = await (prisma as any).pointAccount.findUnique({
        where: { userId: demoCustomer.id },
      });
      if (!pointAcc) {
        pointAcc = await (prisma as any).pointAccount.create({
          data: {
            id: generateId(ID_PREFIXES.POINT_ACCOUNT),
            userId: demoCustomer.id,
            availablePoints: 450,
            pendingPoints: 0,
            lifetimePoints: 450,
          },
        });

        await (prisma as any).pointEvent.create({
          data: {
            id: generateId(ID_PREFIXES.POINT_EVENT),
            pointAccountId: pointAcc.id,
            eventType: 'ORDER_RELEASED',
            points: 450,
            orderId: demoOrder ? demoOrder.id : null,
            ruleVersion: 'v1.0.0',
            notes: '450 discrete Product Points earned from Nexus Pro 5G purchase released after return window',
          },
        });
      }

      // 10.4 Versioned Reward Rules
      const customerRewardRuleCode = 'CUSTOMER_REWARD_SPLIT';
      let rewardRule = await (prisma as any).rewardRule.findFirst({
        where: { ruleCode: customerRewardRuleCode, version: 'v1.0.0' },
      });
      if (!rewardRule) {
        rewardRule = await (prisma as any).rewardRule.create({
          data: {
            id: generateId(ID_PREFIXES.REWARD_RULE),
            ruleCode: customerRewardRuleCode,
            version: 'v1.0.0',
            name: 'Customer Loyalty Reward Split Policy',
            description: 'Main 50%, Shopping 20%, Good-Luck 15%, Charity 5%, Service Charge 10% (100% sum)',
            splits: {
              MAIN: 5000,
              SHOPPING: 2000,
              GOOD_LUCK: 1500,
              CHARITY: 500,
              SERVICE_CHARGE: 1000,
            },
            isActive: true,
          },
        });
      }

      // 10.5 Customer & Seller Rank Definitions
      const rankDefs = [
        { category: 'CUSTOMER_CLUB', code: 'BRONZE', title: 'Bronze Customer Club', period: 'DAILY', threshold: 3000, share: 100 },
        { category: 'CUSTOMER_CLUB', code: 'SILVER', title: 'Silver Customer Club', period: 'DAILY', threshold: 4000, share: 200 },
        { category: 'CUSTOMER_CLUB', code: 'GOLD', title: 'Gold Customer Club', period: 'DAILY', threshold: 5000, share: 300 },
        { category: 'CUSTOMER_STAR', code: 'MEGA_STAR', title: 'Customer Mega Star (Top 10)', period: 'DAILY', starMin: 1, starMax: 10, share: 100 },
        { category: 'SELLER_CLUB', code: 'BRONZE', title: 'Bronze Seller Club', period: 'DAILY', threshold: 10000, share: 100 },
        { category: 'SELLER_CLUB', code: 'SILVER', title: 'Silver Seller Club', period: 'DAILY', threshold: 3000, share: 200 },
        { category: 'SELLER_CLUB', code: 'GOLD', title: 'Gold Seller Club', period: 'DAILY', threshold: 100000, share: 300 },
      ];

      for (const rd of rankDefs) {
        const existing = await (prisma as any).rankDefinition.findFirst({
          where: { category: rd.category, code: rd.code, period: rd.period },
        });
        if (!existing) {
          await (prisma as any).rankDefinition.create({
            data: {
              id: generateId(ID_PREFIXES.RANK_DEFINITION),
              category: rd.category,
              code: rd.code,
              title: rd.title,
              period: rd.period,
              pointThreshold: rd.threshold || null,
              starPositionMin: rd.starMin || null,
              starPositionMax: rd.starMax || null,
              poolShareBps: rd.share,
              isActive: true,
            },
          });
        }
      }

      // 10.6 Balanced Double-Entry Journal Transaction (Reward Distribution)
      const demoJournalNumber = 'JRN-20260922-0001';
      const existingJournal = await (prisma as any).ledgerJournal.findUnique({
        where: { journalNumber: demoJournalNumber },
      });

      if (!existingJournal && customerWallets['MAIN']) {
        const journal = await (prisma as any).ledgerJournal.create({
          data: {
            id: generateId(ID_PREFIXES.LEDGER_JOURNAL),
            journalNumber: demoJournalNumber,
            description: 'Customer order reward distribution across multi-account wallets',
            referenceType: 'REWARD_DISTRIBUTION',
            referenceId: demoOrder ? demoOrder.id : null,
            totalPoisha: BigInt(100000), // ৳1,000.00
            ruleVersion: 'v1.0.0',
            postings: {
              create: [
                // Debit: ৳1,000 from Promotional Expense Pool
                {
                  id: generateId(ID_PREFIXES.LEDGER_POSTING),
                  accountId: accountMap.get('5010-PROMOTIONAL-REWARDS-EXPENSE').id,
                  direction: 'DEBIT',
                  amountPoisha: BigInt(100000),
                  description: 'Promotional expense pool distribution debit',
                },
                // Credit: ৳500 to Customer Main Wallet (50%)
                {
                  id: generateId(ID_PREFIXES.LEDGER_POSTING),
                  accountId: accountMap.get('2010-CUSTOMER-MAIN-LIABILITY').id,
                  walletId: customerWallets['MAIN'].id,
                  direction: 'CREDIT',
                  amountPoisha: BigInt(50000),
                  description: 'Customer Main Wallet 50% reward credit',
                },
                // Credit: ৳200 to Customer Shopping Wallet (20%)
                {
                  id: generateId(ID_PREFIXES.LEDGER_POSTING),
                  accountId: accountMap.get('2020-CUSTOMER-SHOPPING-LIABILITY').id,
                  walletId: customerWallets['SHOPPING'].id,
                  direction: 'CREDIT',
                  amountPoisha: BigInt(20000),
                  description: 'Customer Shopping Wallet 20% reward credit',
                },
                // Credit: ৳150 to Customer Good Luck Wallet (15%)
                {
                  id: generateId(ID_PREFIXES.LEDGER_POSTING),
                  accountId: accountMap.get('2030-CUSTOMER-GOODLUCK-LIABILITY').id,
                  walletId: customerWallets['GOOD_LUCK'].id,
                  direction: 'CREDIT',
                  amountPoisha: BigInt(15000),
                  description: 'Customer Good-Luck Wallet 15% reward credit',
                },
                // Credit: ৳50 to Customer Charity Wallet (5%)
                {
                  id: generateId(ID_PREFIXES.LEDGER_POSTING),
                  accountId: accountMap.get('2040-CUSTOMER-CHARITY-LIABILITY').id,
                  walletId: customerWallets['CHARITY'].id,
                  direction: 'CREDIT',
                  amountPoisha: BigInt(5000),
                  description: 'Customer Charity Wallet 5% reward credit',
                },
                // Credit: ৳100 to Platform Service Charge Revenue (10%)
                {
                  id: generateId(ID_PREFIXES.LEDGER_POSTING),
                  accountId: accountMap.get('4020-SERVICE-CHARGE-REVENUE').id,
                  direction: 'CREDIT',
                  amountPoisha: BigInt(10000),
                  description: 'Platform 10% reward service fee revenue',
                },
              ],
            },
          },
        });

        // 10.7 Reward Allocation Snapshot
        await (prisma as any).rewardAllocation.create({
          data: {
            id: generateId(ID_PREFIXES.REWARD_ALLOCATION),
            ruleId: rewardRule.id,
            ruleVersion: 'v1.0.0',
            sourceType: 'ORDER',
            sourceId: demoOrder ? demoOrder.id : 'ORD-20260922-0001',
            beneficiaryType: 'CUSTOMER',
            beneficiaryId: demoCustomer.id,
            basisPoisha: BigInt(100000),
            allocatedPoisha: BigInt(100000),
            splitBreakdown: {
              MAIN: '50000',
              SHOPPING: '20000',
              GOOD_LUCK: '15000',
              CHARITY: '5000',
              SERVICE_CHARGE: '10000',
            },
            journalId: journal.id,
          },
        });

        console.info('✅ Seeded Chart of Accounts, multi-account wallets, Product Points, reward rules, ranks, and double-entry journal.');
      }
    }
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
