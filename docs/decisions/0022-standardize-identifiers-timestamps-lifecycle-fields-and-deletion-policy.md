# ADR-0022: Identifiers, Timestamps, Lifecycle Fields, and Deletion Policy Standardization

**Status**: Accepted  
**Date**: 2026-09-22  
**Deciders**: Architecture Team, Security & Compliance, Data Engineering  
**Milestone Reference**: [Milestone 022](../../AlifWorld-300-Milestones/022-standardize-identifiers-timestamps-lifecycle-fields-and-deletion-policy.md)  
**Phase**: Phase 03: Data Architecture  

---

## Context and Problem Statement

As AlifWorld models its data architecture across e-commerce storefronts, multi-tenant seller centers, administrative backoffices, and financial ledgers, lack of standardization in primary keys, timestamp handling, audit fields, concurrency controls, and record deletion introduces critical failure modes:
1. Random UUIDv4 keys cause PostgreSQL B-tree index fragmentation and page splits under heavy insert loads.
2. Inconsistent timezone interpretations lead to erroneous Customer Club period cutoffs and settlement calculations.
3. Uncontrolled concurrent mutations risk lost updates in stock reservations, order checkouts, and wallet balance transfers.
4. Unchecked database deletions can compromise financial auditability, tamper with transaction ledgers, or destroy order histories needed for tax, returns, and dispute resolution.

## Decision Drivers

- **Performance**: High insertion throughput with k-sortable keys minimizing B-tree index fragmentation.
- **Traceability & Debuggability**: Human-readable entity type prefixes (`usr_`, `ord_`, `pay_`) in logs, URLs, and API envelopes.
- **Financial Auditability**: Absolute guarantee that financial ledgers, audit logs, and transaction snapshots cannot be deleted.
- **Concurrency Safety**: Optimistic concurrency control (OCC) to detect and reject conflicting concurrent mutations.
- **Data Integrity**: Soft-deletion for core domain entities preserving relationship graphs and historical referrals.

## Considered Options

1. **Auto-Incrementing Integer IDs (SERIAL/BIGSERIAL)**:
   - *Pros*: Compact, sequential, fast index lookups.
   - *Cons*: Vulnerable to enumeration attacks, leaks business volume to competitors, difficult to merge across shards or multi-region setups.
2. **Pure UUIDv4**:
   - *Pros*: Globally unique, decentralized generation.
   - *Cons*: Opaque (no type indication), random entropy fragments B-tree index clusters, poor locality of reference.
3. **Prefixed K-Sortable Identifiers (Selected)**:
   - *Pros*: Combines 3-letter domain prefix (`usr`, `sel`, `ord`), millisecond timestamp (k-sortable), and cryptographic entropy. Prevents enumeration, preserves index locality, and provides instant human readability.

---

## Decision Outcome & Detailed Rationale

### 1. Standardized Prefixed Identifiers
We adopt a standardized identifier format:
$$\text{id} = \text{\{prefix\}}_{3\text{ chars}} + \text{\_} + \text{\{timestamp\}}_{8\text{ chars, base36}} + \text{\{entropy\}}_{16\text{ hex chars}}$$

- Defined in `src/shared/utils/id.ts` with domain prefix registry `ID_PREFIXES`.
- Validation via `isValidId(id, expectedPrefix)`.

### 2. Standardized Timestamps & Timezone Discipline
- All database timestamps (`created_at`, `updated_at`, `deleted_at`) are stored in UTC using `TIMESTAMP(3)`.
- All operational and business period boundaries (e.g. daily, weekly, monthly cutoffs for Customer Clubs and Seller Rank recalculations) are strictly computed in **`Asia/Dhaka`** (`UTC+6`).

### 3. Lifecycle Fields & Optimistic Concurrency Control (OCC)
Domain models include standard lifecycle columns:
- `created_at` / `updated_at`
- `created_by` / `updated_by` (`usr_...` ID)
- `version` (`Int @default(1)`)

Mutations verify the expected version. Discrepancies trigger an immediate `ConflictError` (HTTP 409).

### 4. Three-Tier Deletion Policy
We enforce a rigid 3-tier deletion policy across all AlifWorld data models:
- **Tier 1: Strictly Immutable (Financial, Audit, Snapshots)**:
  - Models: `WalletLedger`, `CommissionLedger`, `ProductPointLedger`, `Transaction`, `Payment`, `Refund`, `OrderSnapshot`, `OrderItemSnapshot`, `AuditLog`, `OutboxEvent`.
  - Policy: Hard and soft deletes are **strictly forbidden**. `assertModelDeletable(modelName)` throws `ValidationError`. Corrections must use offsetting reversal transactions.
- **Tier 2: Soft-Deletable Domain Entities**:
  - Models: `User`, `Seller`, `Category`, `Product`, `ProductVariant`, `SystemConfig`, `Warehouse`.
  - Policy: `deleted_at` and `deleted_by` timestamps are populated; records are retained indefinitely. Default queries filter with `whereActive` (`deletedAt: null`).
- **Tier 3: Ephemeral Data (TTL Purge)**:
  - Models: `HealthProbe`, `OtpToken`, `UserSession`.
  - Policy: Retained for defined operational windows (e.g. 30 days for health probes) and purged automatically by background workers.

---

## Consequences

### Positive:
- B-tree indexing on PostgreSQL scales efficiently with k-sortable keys.
- Instant entity type identification in API responses, Flutter routes, and log monitoring.
- Zero risk of financial record erasure or regulatory audit log destruction.
- Robust prevention of lost updates under high concurrency.
- Uniform query filtering and soft-delete/restore mechanics through `BaseRepository`.

### Negative / Trade-offs:
- Primary key string size (28 characters) is slightly larger than 16-byte raw UUIDs.
- Developers must use `whereNotDeleted` or repository helpers to exclude soft-deleted records.

---

## Compliance & Verification Rules

1. **No Deletion on Immutable Entities**: Any delete query on Tier 1 models will be rejected at the application and repository layer.
2. **Identifier Validation**: All API route parameter parsers must validate entity ID prefix and structure using `isValidId`.
3. **Automated Test Coverage**: All identifier and deletion policy constraints must pass automated testing in `tests/unit/id-and-lifecycle.test.ts` and `tests/unit/deletion-policy.test.ts`.
