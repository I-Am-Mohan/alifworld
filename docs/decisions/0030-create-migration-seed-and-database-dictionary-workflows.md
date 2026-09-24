# ADR-0030: Create Migration, Seed, and Database-Dictionary Workflows

**Status**: Accepted  
**Date**: 2026-09-22  
**Deciders**: Database Architecture, Platform Engineering, Core Engineering, Compliance & Operations  
**Milestone Reference**: [Milestone 030](../../AlifWorld-300-Milestones/030-create-migration-seed-and-database-dictionary-workflows.md)  
**Phase**: Phase 03: Data Architecture (Conclusion)  
**Supporting Specification**: [Migration, Seed, and Database-Dictionary Workflows Architecture](../architecture/migration-seed-and-database-dictionary-workflows.md)  
**Data Dictionary**: [Authoritative Database Data Dictionary](../database/data-dictionary.md)  

---

## Context and Problem Statement

Phase 03 established the relational database schema for AlifWorld, comprising 49 canonical Prisma models across 8 business domains:
1. **System & Health** (4 models): `SystemConfig`, `HealthProbe`, `OutboxEvent`, `AuditLog`
2. **Identity & Access Management** (5 models): `User`, `Role`, `Permission`, `UserRoleAssignment`, `RolePermission`
3. **Seller Domain & Multi-Tenancy** (4 models): `Seller`, `SellerStaff`, `SellerKycDocument`, `SellerStoreSettings`
4. **Product Catalog & Media** (6 models): `Category`, `Brand`, `Product`, `ProductVariant`, `ProductMedia`, `ProductSlugHistory`
5. **Multi-Warehouse Inventory & Movements** (4 models): `Warehouse`, `StockBalance`, `StockReservation`, `StockMovementLedger`
6. **Carts, Orders & Logistics** (8 models): `Cart`, `CartItem`, `Order`, `SellerFulfillmentGroup`, `OrderItem`, `OrderStatusHistory`, `Shipment`, `ShipmentEvent`
7. **Payments, Settlements & Payouts** (7 models): `Payment`, `Refund`, `RefundItem`, `CommissionLedger`, `SellerSettlement`, `SellerPayout`, `PaymentWebhookLog`
8. **Wallets, Loyalty Points & Ledgers** (11 models): `Wallet`, `LedgerAccount`, `LedgerJournal`, `LedgerPosting`, `PointAccount`, `PointEvent`, `RewardRule`, `RewardAllocation`, `RankDefinition`, `UserRank`, `LeaderboardSnapshot`

To guarantee long-term operational resilience, compliance, zero-downtime deployments, and developer alignment, the platform requires:
1. **An Authoritative Data Dictionary**: Programmatically generated, human-readable documentation classifying all 49 models by lifecycle deletion policy (`IMMUTABLE`, `SOFT_DELETE`, `EPHEMERAL`), column types, nullability, defaults, foreign keys, and indexes.
2. **Expand-and-Contract Migration Workflow**: Safe zero-downtime schema evolution across rolling application deployments, forbidding destructive immediate column drops or renames.
3. **Idempotent Seed Scripts**: Guaranteed safe repeated execution of `prisma/seed.ts` via deterministic upserts, seeding the initial SuperAdmin (`contact@mail.com`) with forced password rotation on initial login.
4. **Forward-Fix Rollback Playbooks**: Explicit rules prohibiting destructive `prisma migrate reset` in production environments, mandating forward-fix compensating migrations.
5. **SuperAdmin Operational Console**: A live administrative interface (`/admin/database`) enabling platform engineers to audit data dictionary metadata, inspect migration history, and verify seed execution states.

---

## Decision Drivers

- **Operational Safety**: Eliminating schema locking, connection starvation, and data loss during deployments.
- **Financial Auditability & Compliance**: Strict enforcement of immutable ledgers (`LedgerJournal`, `LedgerPosting`, `CommissionLedger`, `StockMovementLedger`, `AuditLog`, `OutboxEvent`, `PaymentWebhookLog`).
- **Idempotent Automation**: Seed operations and database migrations must run reliably across local development, staging CI/CD, and multi-node production clusters without side-effects or duplicate rows.
- **Single Source of Truth**: Schema definitions in `prisma/schema.prisma` synchronize directly into `docs/database/data-dictionary.md` and the Admin UI via automated scripts.

---

## Considered Options

1. **Ad-Hoc Manual Migrations with Traditional Down-Scripts (`migrate down`)**:
   - *Pros*: Simple for initial prototype stages.
   - *Cons*: Down-migrations frequently destroy production data, fail when foreign key dependencies shift, and are incompatible with continuous zero-downtime deployment pipelines.
2. **Hard-Reset Seeding (`prisma migrate reset --force`)**:
   - *Pros*: Ensures fresh development databases.
   - *Cons*: Catastrophic if misconfigured in staging or production; wipes audit logs and tenant configurations.
3. **Expand-and-Contract Zero-Downtime Migrations + Forward-Fix Recovery + 100% Idempotent Upsert Seeds + Automated Data Dictionary (Selected)**:
   - *Pros*: Guarantees zero downtime, complete audit preservation, deterministic seed reruns, and centralized data governance across all 49 models.

---

## Decision Outcome & Detailed Rationale

### 1. Three-Tier Data Lifecycle Policies

Every model in AlifWorld is explicitly bound to one of three lifecycle deletion policies defined in `src/shared/database/lifecycle.ts`:

1. **`IMMUTABLE` (Append-Only, Hard & Soft Deletion Prohibited)**:
   - Records represent immutable financial, legal, or state-transition facts.
   - Updates and deletions are strictly rejected. Errors are corrected exclusively through linked reversal records (`reversalOfId`).
   - *Models (16)*: `HealthProbe`, `OutboxEvent`, `AuditLog`, `ProductSlugHistory`, `StockMovementLedger`, `OrderStatusHistory`, `ShipmentEvent`, `Payment`, `Refund`, `RefundItem`, `CommissionLedger`, `PaymentWebhookLog`, `LedgerJournal`, `LedgerPosting`, `PointEvent`, `RewardAllocation`, `LeaderboardSnapshot`.
2. **`SOFT_DELETE` (Audit-Preserved, Deleted At Timestamp)**:
   - Business entities containing relational dependencies or historical value. Records are flagged via `deletedAt DateTime?` and filtered from active application queries.
   - *Models (30)*: `SystemConfig`, `User`, `Role`, `Permission`, `UserRoleAssignment`, `RolePermission`, `Seller`, `SellerStaff`, `SellerKycDocument`, `SellerStoreSettings`, `Category`, `Brand`, `Product`, `ProductVariant`, `ProductMedia`, `Warehouse`, `StockBalance`, `StockReservation`, `Order`, `SellerFulfillmentGroup`, `OrderItem`, `Shipment`, `SellerSettlement`, `SellerPayout`, `Wallet`, `LedgerAccount`, `PointAccount`, `RewardRule`, `RankDefinition`, `UserRank`.
3. **`EPHEMERAL` (Hard Deletion Permitted with Expiration/Cleanup TTL)**:
   - Transient operational artifacts with no legal or financial reporting obligations.
   - *Models (2)*: `Cart`, `CartItem` (abandoned carts purged after 30-day retention window).

### 2. Zero-Downtime Expand-and-Contract Migration Workflow

Schema migrations must be phased across two or more releases:
1. **Expand Phase (Release N)**: Add new nullable or defaulted columns, new tables, or non-blocking indexes (`CREATE INDEX CONCURRENTLY`). The running code continues to read from old structures while dual-writing to both old and new.
2. **Backfill Phase (Release N or Background Job)**: Backfill data from legacy columns to new columns asynchronously without table locks.
3. **Contract Phase (Release N+1)**: Update application code to read solely from new structures, deprecate legacy columns, and eventually drop unused columns after all instances have transitioned.

### 3. Forward-Fix Rollback Playbook

- Under no circumstances will `prisma migrate reset` or manual table drops be run in staging or production.
- If a migration causes application anomalies, the deployment pipeline rolls back the **application container/binary** to the previous version (which remains compatible due to the Expand phase).
- Schema issues are corrected by authoring a **new forward migration** (`YYYYMMDDHHMMSS_forward_fix_...`) that safely adjusts constraints, indexes, or structures.

### 4. Seed Idempotency & SuperAdmin Credential Provisioning

- `prisma/seed.ts` is structured into 10 deterministic sections using `upsert()` with natural unique compound keys (`code`, `slug`, `sku`, `email`, `userId_type`, etc.).
- SuperAdmin initialization provisions `contact@mail.com` (customizable via `INITIAL_SUPERADMIN_EMAIL` and `INITIAL_SUPERADMIN_PASSWORD`).
- Seed sets `emailVerified: true`, links the `SUPERADMIN` role, and outputs mandatory operational instructions for forced credential rotation upon first login.

---

## Consequences

### Positive
- Zero downtime during schema evolutions across high-volume marketplace operations.
- Full compliance with national auditing and taxation standards (NBR Mushak 6.3) via immutable financial ledgers.
- 100% reproducible environments for developers and automated CI pipelines.
- Complete documentation visibility for product, compliance, and engineering teams via `/admin/database`.

### Negative & Mitigations
- Requires multi-step deployments for schema changes (mitigated by automated migration verification scripts).
- Additional storage required for soft-deleted records and immutable event ledgers (mitigated by read-replica offloading and partitioned historical tables).
