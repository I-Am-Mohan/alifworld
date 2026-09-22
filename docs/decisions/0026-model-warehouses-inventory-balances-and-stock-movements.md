# ADR-0026: Model Warehouses, Inventory Balances, and Stock Movements

**Status**: Accepted  
**Date**: 2026-09-22  
**Deciders**: Architecture Team, Logistics & Operations, Compliance, Inventory Engineering  
**Milestone Reference**: [Milestone 026](../../AlifWorld-300-Milestones/026-model-warehouses-inventory-balances-and-stock-movements.md)  
**Phase**: Phase 03: Data Architecture  
**Supporting Specification**: [Warehouse Logistics, Inventory Balances & Stock Movements Architecture](../architecture/warehouse-inventory-and-stock-movements.md)  

---

## Context and Problem Statement

AlifWorld requires a nationwide inventory management and stock reservation engine capable of:
1. Managing physical fulfillment hubs across Bangladesh's 8 administrative divisions (Dhaka, Chittagong, Rajshahi, Khulna, Barisal, Sylhet, Rangpur, Mymensingh) and merchant-owned logistics depots.
2. Tracking precise physical counts (`onHand`), active checkout reservations (`reserved`), damaged units (`damaged`), and quality-quarantined units (`quarantined`) per warehouse and product variant.
3. Preventing overselling when concurrent buyers race to checkout the same final remaining unit.
4. Implementing atomic time-limited stock reservations with deterministic TTL cutoffs (default 15 minutes) and automated expiration sweeps that return abandoned units to available stock.
5. Maintaining an append-only, immutable audit ledger (`StockMovementLedger`) recording every balance delta with movement types and reference identifiers.

---

## Decision Drivers

- **Core Invariant**: Available stock is strictly computed server-side:
  $$\text{Available} = \max(0, \text{OnHand} - \text{Reserved} - \text{Damaged} - \text{Quarantined})$$
  Client-supplied available quantities are strictly rejected.
- **Race Condition Immunity**: Concurrency control via monotonic integer row versioning (`version`) to guarantee that racing checkout attempts on the last available unit result in exactly one winner and deterministic conflict rejections.
- **Auditing & Immutability**: `StockMovementLedger` is classified as `IMMUTABLE` in the application lifecycle registry (`src/shared/database/lifecycle.ts`). Entries are never modified or deleted.
- **Bangladesh Regional Logistics**: Division and district indexing supporting rapid same-day Dhaka and division-specific courier handoffs (Pathao, Steadfast).
- **Multi-Tenant Isolation**: Merchants can view and manage only their own warehouse stock, while platform fulfillment hubs operate under central operations authority.

---

## Considered Options

1. **Client-Provided Available Quantities with Simple Row Decrements**:
   - *Pros*: Minimal code, fast prototyping.
   - *Cons*: Highly vulnerable to client tampering, race conditions, negative inventory, and silent overselling during promotional traffic spikes.
2. **External Microservice for Inventory (e.g., Redis-Only Inventory Counter)**:
   - *Pros*: Fast in-memory counters.
   - *Cons*: Violates single Next.js modular monolith constraint; lacks ACID atomicity with relational order and payment tables; risks cache-database desynchronization.
3. **Normalized Relational Models in PostgreSQL/Prisma with OCC and Append-Only Movement Ledger (Selected)**:
   - *Pros*: Transactional integrity, optimistic concurrency control on row versions, clear relational foreign keys, immutable audit trail, and seamless integration with the Next.js domain layer.

---

## Decision Outcome & Detailed Rationale

### 1. Persistence Schema
Added to `prisma/schema.prisma`:
- `Warehouse`: Represents platform fulfillment centers (`isPlatformHub = true`, `sellerId = null`) and merchant storage depots (`sellerId` assigned) with Bangladesh administrative division indexing.
- `StockBalance`: Holds physical inventory quantities (`onHand`, `reserved`, `damaged`, `quarantined`, `lowStockThreshold`, `reorderPoint`) with a composite unique index on `[warehouseId, variantId]` and an OCC `version` counter.
- `StockReservation`: Tracks time-limited checkout reservations with `status` (`ACTIVE`, `COMMITTED`, `RELEASED`, `EXPIRED`) and deterministic `expiresAt` cutoff timestamps.
- `StockMovementLedger`: Append-only, immutable ledger recording every inventory state transition with `movementType` (`RECEIVE`, `RESERVE`, `RELEASE`, `COMMIT`, `ADJUST`, `DAMAGE`, `WRITE_OFF`), `quantityDelta`, before/after snapshots, and source reference.

### 2. Standardized Identifiers & Lifecycle Policies
- Registered prefixes in `src/shared/utils/id.ts`:
  - `WAREHOUSE`: `whs`
  - `STOCK_BALANCE`: `stb`
  - `STOCK_RESERVATION`: `res`
  - `STOCK_MOVEMENT`: `mov`
- Registered lifecycle policies in `src/shared/database/lifecycle.ts`:
  - `StockMovementLedger`: `IMMUTABLE`
  - `Warehouse`, `StockBalance`, `StockReservation`: `SOFT_DELETE`

### 3. Concurrency & Reservation Guarantees
- Concurrency races on the final unit are resolved at the database/version boundary. When two concurrent requests read version $v$ of a balance with $\text{Available} = 1$, the first update commits and increments the version to $v+1$. The second update targets version $v$, detects the conflict, and throws a 409 `ConflictError`.
- Deterministic expiration: Checkout reservations default to a 15-minute TTL. Stale reservations are swept and expired by `InventoryService.expireStaleReservations()`, atomically returning locked units to available inventory and publishing `inventory.stock_released` outbox events.

### 4. User Experience & Operations
- **Seller Center (`/seller/inventory`)**: Dark-themed console displaying facility stock balances, low-stock warnings, active checkout reservations with live TTL countdowns, direct PO stock intake simulator, and append-only movement history.
- **Admin Console (`/admin/warehouses`)**: Platform-wide logistics overview covering all 8 Bangladesh divisions, capacity status, central movement audit trail, and on-demand TTL sweep controls.

---

## Consequences

### Positive
- Prevents customer dissatisfaction caused by overselling during high-volume sales campaigns.
- Complete financial and operational audit trail: every unit change has an immutable ledger entry with an actor and source reference.
- Clean separation between platform fulfillment hubs and merchant storage depots.

### Negative / Mitigations
- High concurrency on a single hot SKU variant requires OCC retries; mitigated by fast in-transaction execution and clear conflict signaling.
- Long-term movement ledger growth; mitigated by indexing on `[stockBalanceId, createdAt]` and `[sourceType, sourceId]` with future partitioned table support.
