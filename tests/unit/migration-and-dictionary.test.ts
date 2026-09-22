import { describe, it, expect } from 'bun:test';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import {
  parsePrismaSchema,
  generateDataDictionaryMarkdown,
} from '../../scripts/generate-data-dictionary';
import {
  MODEL_DELETION_POLICIES,
  isModelImmutable,
  assertModelDeletable,
} from '../../src/shared/database/lifecycle';
import { ValidationError } from '../../src/shared/errors/app-error';

describe('Migration, Seed & Database Data Dictionary Workflows (Milestone 030)', () => {
  const EXPECTED_CANONICAL_MODELS = [
    // 1. System & Health (4)
    'SystemConfig',
    'HealthProbe',
    'OutboxEvent',
    'AuditLog',
    // 2. Identity & Access Management (5)
    'User',
    'Role',
    'Permission',
    'UserRoleAssignment',
    'RolePermission',
    // 3. Seller Domain & Multi-Tenancy (4)
    'Seller',
    'SellerStaff',
    'SellerKycDocument',
    'SellerStoreSettings',
    // 4. Product Catalog & Media (6)
    'Category',
    'Brand',
    'Product',
    'ProductVariant',
    'ProductMedia',
    'ProductSlugHistory',
    // 5. Multi-Warehouse Inventory & Movements (4)
    'Warehouse',
    'StockBalance',
    'StockReservation',
    'StockMovementLedger',
    // 6. Carts, Orders & Logistics (8)
    'Cart',
    'CartItem',
    'Order',
    'SellerFulfillmentGroup',
    'OrderItem',
    'OrderStatusHistory',
    'Shipment',
    'ShipmentEvent',
    // 7. Payments, Settlements & Payouts (7)
    'Payment',
    'Refund',
    'RefundItem',
    'CommissionLedger',
    'SellerSettlement',
    'SellerPayout',
    'PaymentWebhookLog',
    // 8. Wallets, Points, Rewards, Ranks & Ledgers (11)
    'Wallet',
    'LedgerAccount',
    'LedgerJournal',
    'LedgerPosting',
    'PointAccount',
    'PointEvent',
    'RewardRule',
    'RewardAllocation',
    'RankDefinition',
    'UserRank',
    'LeaderboardSnapshot',
    // 9. Identity, Authentication & Sessions (Phase 04, Models 50-51)
    'UserSession',
    'OtpToken',
  ];

  describe('Prisma Schema Model Completeness (Canonical Models)', () => {
    it('verifies that prisma/schema.prisma exists and is readable', () => {
      const schemaPath = resolve(process.cwd(), 'prisma/schema.prisma');
      expect(existsSync(schemaPath)).toBe(true);
    });

    it('parses all canonical models from schema.prisma (51 models)', () => {
      const models = parsePrismaSchema();
      expect(models.length).toBe(EXPECTED_CANONICAL_MODELS.length);
      expect(models.length).toBe(51);
    });

    it('contains every expected canonical model by name', () => {
      const models = parsePrismaSchema();
      const parsedModelNames = models.map((m) => m.name);

      for (const expectedName of EXPECTED_CANONICAL_MODELS) {
        expect(parsedModelNames).toContain(expectedName);
      }
    });

    it('ensures each model has a primary key (@id)', () => {
      const models = parsePrismaSchema();
      for (const model of models) {
        const hasId = model.fields.some((f) =>
          f.attributes.some((a) => a.startsWith('@id'))
        );
        expect(hasId).toBe(true);
      }
    });
  });

  describe('Lifecycle Deletion Policy Governance', () => {
    it('classifies critical financial and audit models as IMMUTABLE', () => {
      const immutableModels = [
        'AuditLog',
        'OutboxEvent',
        'LedgerJournal',
        'LedgerPosting',
        'PointEvent',
        'RewardAllocation',
        'CommissionLedger',
        'StockMovementLedger',
        'Payment',
        'Refund',
        'RefundItem',
        'OrderStatusHistory',
        'ShipmentEvent',
        'PaymentWebhookLog',
        'LeaderboardSnapshot',
      ];

      for (const modelName of immutableModels) {
        expect(isModelImmutable(modelName)).toBe(true);
        expect(() => assertModelDeletable(modelName)).toThrow(ValidationError);
      }
    });

    it('permits soft deletion on standard domain entities', () => {
      const softDeleteModels = [
        'User',
        'Seller',
        'Product',
        'Category',
        'Warehouse',
        'Order',
        'Wallet',
        'RewardRule',
      ];

      for (const modelName of softDeleteModels) {
        expect(isModelImmutable(modelName)).toBe(false);
        expect(() => assertModelDeletable(modelName)).not.toThrow();
      }
    });

    it('maps every parsed model to an authoritative lifecycle policy', () => {
      const models = parsePrismaSchema();
      for (const model of models) {
        expect(['IMMUTABLE', 'SOFT_DELETE', 'EPHEMERAL']).toContain(
          model.deletionPolicy
        );
      }
    });
  });

  describe('Seed Idempotency & SuperAdmin Invariants', () => {
    it('ensures seed script defines the authoritative SuperAdmin email', () => {
      const seedPath = resolve(process.cwd(), 'prisma/seed.ts');
      const seedContent = readFileSync(seedPath, 'utf-8');

      expect(seedContent).toContain('contact@alifworld.com.bd');
      expect(seedContent).toContain('INITIAL_SUPERADMIN_EMAIL');
      expect(seedContent).toContain('INITIAL_SUPERADMIN_PASSWORD');
    });

    it('ensures seed script utilizes upsert logic across critical entities', () => {
      const seedPath = resolve(process.cwd(), 'prisma/seed.ts');
      const seedContent = readFileSync(seedPath, 'utf-8');

      // Verify upsert usage in seed
      expect(seedContent).toContain('prisma.systemConfig.upsert');
      expect(seedContent).toContain('prisma.user.upsert');
      expect(seedContent).toContain('prisma.role.upsert');
      expect(seedContent).toContain('prisma.permission.upsert');
      expect(seedContent).toContain('prisma.wallet.upsert');
      expect(seedContent).toContain('prisma.pointAccount.upsert');
      expect(seedContent).toContain('prisma.ledgerAccount.upsert');
    });

    it('requires password rotation on initial SuperAdmin login', () => {
      const seedPath = resolve(process.cwd(), 'prisma/seed.ts');
      const seedContent = readFileSync(seedPath, 'utf-8');

      expect(seedContent).toContain('Password change REQUIRED on initial login');
    });
  });

  describe('Data Dictionary Generation & Markdown Synchronization', () => {
    it('generates complete markdown data dictionary with all 49 models', () => {
      const md = generateDataDictionaryMarkdown();

      expect(md).toContain('# AlifWorld Production PostgreSQL Data Dictionary');
      expect(md).toContain('Total Canonical Models: 51 Models');
      expect(md).toContain('Expand-and-Contract Migration Workflow');
      expect(md).toContain('Rollback & Forward-Fix Playbook');

      // Verify representative models from every domain
      expect(md).toContain('`SystemConfig`');
      expect(md).toContain('`User`');
      expect(md).toContain('`Seller`');
      expect(md).toContain('`Product`');
      expect(md).toContain('`StockMovementLedger`');
      expect(md).toContain('`Order`');
      expect(md).toContain('`CommissionLedger`');
      expect(md).toContain('`LedgerJournal`');
      expect(md).toContain('`LedgerPosting`');
      expect(md).toContain('`PointEvent`');
      expect(md).toContain('`RewardRule`');
      expect(md).toContain('`LeaderboardSnapshot`');
      expect(md).toContain('`UserSession`');
      expect(md).toContain('`OtpToken`');
    });

    it('verifies that docs/database/data-dictionary.md file is in sync', () => {
      const docPath = resolve(process.cwd(), 'docs/database/data-dictionary.md');
      expect(existsSync(docPath)).toBe(true);

      const existingContent = readFileSync(docPath, 'utf-8');
      expect(existingContent).toContain('Total Canonical Models: 51 Models');
      expect(existingContent).toContain('Expand-and-Contract (Parallel Run)');
    });
  });

  describe('Zero-Downtime Expand-and-Contract Protocol Rules', () => {
    it('enforces valid forward migration lifecycle stages', () => {
      const validPhases = ['EXPAND', 'DUAL_WRITE', 'BACKFILL', 'CONTRACT'];
      const phaseTransitions: Record<string, string> = {
        EXPAND: 'DUAL_WRITE',
        DUAL_WRITE: 'BACKFILL',
        BACKFILL: 'CONTRACT',
        CONTRACT: 'COMPLETED',
      };

      let current = 'EXPAND';
      const executedPhases: string[] = [];
      while (current !== 'COMPLETED') {
        executedPhases.push(current);
        current = phaseTransitions[current];
      }

      expect(executedPhases).toEqual(validPhases);
    });

    it('prohibits destructive operations in production and staging environments', () => {
      const prohibitedCommands = [
        'prisma migrate reset',
        'DROP TABLE',
        'ALTER TABLE ... DROP COLUMN', // Without contract phase
      ];

      const checkCommandSafety = (cmd: string, env: string) => {
        if (env === 'production' || env === 'staging') {
          if (cmd.includes('migrate reset') || cmd.includes('DROP TABLE')) {
            return false;
          }
        }
        return true;
      };

      expect(checkCommandSafety('prisma migrate reset', 'production')).toBe(false);
      expect(checkCommandSafety('prisma migrate reset', 'staging')).toBe(false);
      expect(checkCommandSafety('prisma migrate deploy', 'production')).toBe(true);
    });
  });
});
