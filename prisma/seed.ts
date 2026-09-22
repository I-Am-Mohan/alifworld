/**
 * AlifWorld Idempotent Database Seed Script
 * 
 * Populates essential platform parameters, rule versions, and baseline records.
 * Safe to execute repeatedly without duplicating records or causing data conflicts.
 * 
 * Command: bun run prisma/seed.ts (or bun run db:seed)
 * Reference: docs/architecture/postgresql-and-prisma-foundations.md
 */

import { prisma, disconnectPrisma } from '../src/shared/database';

async function seed() {
  console.info('🌱 Starting AlifWorld database seed...');

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

  // Record seed execution in AuditLog
  await (prisma as any).auditLog.create({
    data: {
      action: 'DATABASE_SEED',
      resource: 'SystemConfig',
      actorRole: 'SYSTEM',
      metadata: {
        timestamp: new Date().toISOString(),
        keysSeeded: initialConfigs.map((c) => c.key),
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
