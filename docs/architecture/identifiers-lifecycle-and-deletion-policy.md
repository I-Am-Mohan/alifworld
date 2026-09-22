# Identifiers, Timestamps, Lifecycle Fields, and Deletion Policy Architecture

**Document Type**: Architectural Specification & Implementation Standard  
**Milestone Reference**: [Milestone 022](../../AlifWorld-300-Milestones/022-standardize-identifiers-timestamps-lifecycle-fields-and-deletion-policy.md)  
**Phase**: Phase 03: Data Architecture  
**Status**: Authoritative / Implemented  
**Date**: 2026-09-22  

---

## 1. Executive Summary & Objectives

In a high-volume, multi-tenant e-commerce and financial ecosystem, data integrity depends upon consistent, collision-resistant primary keys, predictable lifecycle audit fields, concurrency protection, and strict rules governing whether records may ever be deleted.

**Milestone 022** standardizes four foundational persistence disciplines across AlifWorld:
1. **Prefixed, K-Sortable Identifiers**: Type-safe primary keys with domain prefixes (e.g., `usr_`, `ord_`, `wal_`).
2. **Standardized Timestamps & Timezones**: UTC persistence with canonical `Asia/Dhaka` operational interpretation.
3. **Lifecycle Tracking & Optimistic Concurrency Control (OCC)**: Standard `version`, `created_by`, and `updated_by` attribution fields.
4. **Three-Tier Deletion Policy**: Absolute prohibition of deletion on financial and audit records, standardized soft-deletion on domain entities, and scheduled TTL purge on ephemeral records.

---

## 2. Standardized Identifier Specification

All AlifWorld database primary keys, external REST route parameters, and Flutter entity identifiers follow a structured, human-readable format.

### 2.1 Identifier Structure
$$\text{id} = \underbrace{\text{\{prefix\}}}_{\text{3 lowercase letters}} + \text{\_} + \underbrace{\text{\{timestamp\}}}_{\text{8 chars, base36}} + \underbrace{\text{\{entropy\}}}_{\text{16 hex chars}}$$

- **Example**: `usr_01j7x4b9e8m02k3f8d7c6b5a4`
- **Total Length**: 28 characters
- **URL & Case Safe**: Lowercase alphanumeric only; no symbols other than the separating underscore.
- **K-Sortable**: Successive IDs sort chronologically by creation millisecond, improving PostgreSQL B-tree index performance over random UUIDv4.
- **Collision Resistance**: 64 bits of cryptographically secure random entropy per millisecond.

### 2.2 Domain Prefix Registry (`ID_PREFIXES`)

| Prefix | Domain Entity | Example |
|:---:|:---|:---|
| `usr` | User Account (Customer, Seller, Admin) | `usr_01j7x4b9e8m02k3f8d7c6b5a4` |
| `sel` | Seller Store & Organization | `sel_01j7x4c2e8m02k3a1b2c3d4e` |
| `cat` | Product Category Taxonomy | `cat_01j7x4d5e8m02k3f4e5d6c7b` |
| `prd` | Product Record | `prd_01j7x4e8e8m02k3a8b9c0d1e` |
| `var` | Product Variant (SKU) | `var_01j7x4f1e8m02k3f2e3d4c5b` |
| `ord` | Customer Order | `ord_01j7x4g4e8m02k3a7b8c9d0e` |
| `itm` | Order Item Snapshot | `itm_01j7x4h7e8m02k3f6e7d8c9b` |
| `pay` | Payment Transaction | `pay_01j7x4j0e8m02k3a5b6c7d8e` |
| `wal` | User Financial Wallet | `wal_01j7x4k3e8m02k3f4e5d6c7b` |
| `led` | Immutable Ledger Entry | `led_01j7x4m6e8m02k3a3b4c5d6e` |
| `tx`  | Financial Transaction Batch | `tx_01j7x4p9e8m02k3f2e3d4c5b` |
| `shp` | Shipment & Fulfillment Package | `shp_01j7x4s2e8m02k3a1b2c3d4e` |
| `inv` | Inventory Balance & Movement | `inv_01j7x4v5e8m02k3f0e1d2c3b` |
| `evt` | Transactional Outbox Event | `evt_01j7x4w8e8m02k3a9b0c1d2e` |
| `aud` | Security & Compliance Audit Log | `aud_01j7x4y1e8m02k3f8e9d0c1b` |
| `prb` | Operational Health Probe Log | `prb_01j7x4z4e8m02k3a7b8c9d0e` |
| `cfg` | System Configuration Key | `cfg_01j7x507e8m02k3f6e7d8c9b` |

---

## 3. Timestamps & Timezone Discipline

1. **Storage Format**:
   - Stored in PostgreSQL as `TIMESTAMP(3)` in standard UTC (`created_at`, `updated_at`, `deleted_at`).
2. **Business Cutoff Discipline**:
   - In accordance with the Project Charter, all business periods, daily/weekly/monthly Customer Club qualification windows, settlement dates, and flash deal schedules are computed in **`Asia/Dhaka`** (`UTC+6`).
   - Helpers in `src/shared/utils/date.ts` (`getDhakaStartOfDay`, `formatDhakaDateTime`) ensure consistent boundary calculations regardless of the hosting server's localized clock.

---

## 4. Lifecycle Fields & Optimistic Concurrency Control

### 4.1 Standard Model Columns

| Column | Prisma Type | Description |
|:---|:---|:---|
| `created_at` | `DateTime @default(now())` | Creation timestamp in UTC |
| `updated_at` | `DateTime @updatedAt` | Automatic update timestamp in UTC |
| `created_by` | `String?` | Actor ID (`usr_...`) who created the record |
| `updated_by` | `String?` | Actor ID (`usr_...`) who last updated the record |
| `version` | `Int @default(1)` | Optimistic concurrency control version |
| `deleted_at` | `DateTime?` | Soft deletion timestamp (null if active) |
| `deleted_by` | `String?` | Actor ID (`usr_...`) who executed soft deletion |

### 4.2 Optimistic Concurrency Control (OCC)
To prevent lost updates during concurrent checkout, inventory reservations, or admin configuration updates:
1. The reading query retrieves `{ id, version, ... }`.
2. The mutation updates with `WHERE id = :id AND version = :expectedVersion`, setting `version = version + 1`.
3. If zero rows are updated, `assertOptimisticVersion` throws `ConflictError` (HTTP 409), alerting the client to reload and re-evaluate.

---

## 5. Three-Tier Deletion Policy

AlifWorld strictly classifies every database entity into one of three deletion tiers:

```
                  ┌────────────────────────────────────────┐
                  │        AlifWorld Entity Models         │
                  └───────────────────┬────────────────────┘
                                      │
         ┌────────────────────────────┼────────────────────────────┐
         ▼                            ▼                            ▼
┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│   Tier 1:        │         │   Tier 2:        │         │   Tier 3:        │
│   IMMUTABLE      │         │   SOFT_DELETE    │         │   EPHEMERAL      │
│                  │         │                  │         │                  │
│ • Wallets        │         │ • Users          │         │ • Health Probes  │
│ • Ledgers        │         │ • Sellers        │         │ • Auth Sessions  │
│ • Payments       │         │ • Products       │         │ • OTP Tokens     │
│ • Orders         │         │ • Categories     │         │ • Cache Entries  │
│ • Audit Logs     │         │ • System Configs │         │                  │
│ • Outbox Events  │         │                  │         │                  │
│                  │         │                  │         │                  │
│ Deletion:        │         │ Deletion:        │         │ Deletion:        │
│ STRICTLY FORBIDDEN│        │ SOFT DELETE ONLY │         │ AUTOMATED TTL    │
│ Reversals Only   │         │ (deleted_at set) │         │ BACKGROUND PURGE │
└──────────────────┘         └──────────────────┘         └──────────────────┘
```

### 5.1 Tier 1: Strictly Immutable (Financial, Audit, Snapshots)
- **Entities**: `WalletLedger`, `CommissionLedger`, `ProductPointLedger`, `Transaction`, `Payment`, `Refund`, `OrderSnapshot`, `OrderItemSnapshot`, `AuditLog`, `OutboxEvent`.
- **Policy**: Hard delete and soft delete are **strictly forbidden**.
- **Enforcement**: Any repository or service attempting a delete call on these models throws `ValidationError` via `assertModelDeletable(modelName)`.
- **Financial Corrections**: Accounting errors must be resolved using equal-and-opposite compensating journal entries.

### 5.2 Tier 2: Soft-Deletable Domain Entities
- **Entities**: `User`, `Seller`, `Category`, `Product`, `ProductVariant`, `SystemConfig`, `Warehouse`.
- **Policy**: Never hard deleted. Retains data for referral hierarchy integrity, historical orders, and customer support audits.
- **Enforcement**:
  - Sets `deleted_at = now()` and `deleted_by = actorId`.
  - Repository queries default to `whereActive({ ... })` (`deletedAt: null`).
  - An entity can be restored via `createRestorePayload()` (`deleted_at = null`, `deleted_by = null`).

### 5.3 Tier 3: Ephemeral Data (TTL Purge)
- **Entities**: `HealthProbe`, `OtpToken`, `UserSession`.
- **Policy**: Automatically purged after retention expiration:
  - `HealthProbe`: 30 days retention.
  - `OtpToken`: 10 minutes retention.
  - `UserSession`: 30 days inactivity retention.
  - `OutboxEvent (PROCESSED)`: 14 days retention.

---

## 6. Repository Integration & Implementation Reference

Repositories extending `BaseRepository` automatically inherit lifecycle conveniences:

```typescript
// Query active records only:
const activeProducts = await this.db.product.findMany({
  where: this.whereNotDeleted({ categoryId }),
});

// Enforce optimistic concurrency:
this.assertVersion(existing.version, input.version, existing.id);

// Enforce deletion policy:
this.assertCanDelete('WalletLedger'); // Throws ValidationError!
```
