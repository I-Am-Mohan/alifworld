# Warehouse Logistics, Inventory Balances & Stock Movements Architecture Specification

## 1. Executive Summary

Milestone 026 establishes AlifWorld's foundational inventory domain model, providing multi-warehouse fulfillment across Bangladesh's 8 administrative divisions (Dhaka, Chittagong, Rajshahi, Khulna, Barisal, Sylhet, Rangpur, Mymensingh), optimistic concurrency control (OCC) for oversell prevention, atomic time-limited checkout reservations, and an immutable, append-only stock movement ledger.

This specification implements **ADR-0026**, **ADR-0003**, **ADR-0021**, and **ADR-0022**.

---

## 2. Core Invariants & Mathematical Guarantees

### Invariant 1: Authoritative Available Stock
Available stock is **strictly computed server-side** by the domain engine and never accepted as a client-supplied payload:

$$\text{Available} = \max(0, \text{OnHand} - \text{Reserved} - \text{Damaged} - \text{Quarantined})$$

- $\text{OnHand}$: Total physical units verified within the physical warehouse facility.
- $\text{Reserved}$: Units locked in active buyer checkout sessions prior to TTL expiration.
- $\text{Damaged}$: Physically defective or broken units removed from sales inventory.
- $\text{Quarantined}$: Units held pending quality control inspection or RMA returns.

### Invariant 2: Optimistic Concurrency Control (OCC)
All state-modifying inventory balance mutations verify the monotonic integer `version` field. When two concurrent requests target the same balance record (such as racing checkout reservations on the final remaining unit), exactly one transaction increments `version` and commits; the competing transaction detects the version mismatch and is rejected with a 409 `ConflictError`.

### Invariant 3: Append-Only Immutable Movement Ledger
Every inventory state transition (intake, reservation, release, order fulfillment commitment, damage write-off, return) writes an immutable record to `StockMovementLedger`. Movement ledger records are strictly `IMMUTABLE` under AlifWorld's lifecycle policy (`docs/architecture/identifiers-lifecycle-and-deletion-policy.md`) and are never updated or deleted.

---

## 3. Entity Relationship Diagram

```mermaid
erDiagram
    Seller ||--o{ Warehouse : "operates"
    Warehouse ||--o{ StockBalance : "stores"
    ProductVariant ||--o{ StockBalance : "stocked_as"
    StockBalance ||--o{ StockReservation : "locked_by"
    StockBalance ||--o{ StockMovementLedger : "audited_by"
    Warehouse ||--o{ StockMovementLedger : "originates"
    ProductVariant ||--o{ StockMovementLedger : "tracks"

    Warehouse {
        string id PK "whs_..."
        string sellerId FK "Nullable (null = Platform Hub)"
        string name "Facility Name"
        string code "Unique Code (e.g. DHK-HUB-01)"
        string division "Bangladesh Division"
        string district "Administrative District"
        string addressLine "Physical address"
        boolean isPlatformHub "Platform fulfillment vs seller depot"
        boolean isActive "Facility status"
        int version "OCC lock version"
        datetime deletedAt "Soft delete timestamp"
    }

    StockBalance {
        string id PK "stb_..."
        string warehouseId FK
        string variantId FK
        int onHand "Physical count"
        int reserved "Checkout locks"
        int damaged "Defective units"
        int quarantined "RMA inspection"
        int lowStockThreshold "Alert threshold"
        int reorderPoint "Reorder replenishment level"
        int version "OCC lock version"
        datetime deletedAt "Soft delete timestamp"
    }

    StockReservation {
        string id PK "res_..."
        string stockBalanceId FK
        string cartId "Checkout session reference"
        string orderId "Committed order reference"
        int quantity "Locked units"
        string status "ACTIVE | COMMITTED | RELEASED | EXPIRED"
        datetime expiresAt "Deterministic TTL cutoff"
        datetime committedAt "Order placement timestamp"
        datetime releasedAt "Cart abandon timestamp"
        int version "OCC lock version"
    }

    StockMovementLedger {
        string id PK "mov_..."
        string stockBalanceId FK
        string warehouseId FK
        string variantId FK
        string movementType "RECEIVE | RESERVE | RELEASE | COMMIT | ADJUST | DAMAGE"
        int quantityDelta "Signed unit delta"
        int onHandAfter "Physical balance snapshot"
        int reservedAfter "Reserved snapshot"
        int availableAfter "Available snapshot"
        string sourceType "PURCHASE_ORDER | CHECKOUT_RESERVATION | ORDER_FULFILLMENT | AUDIT_ADJUSTMENT"
        string sourceId "Reference ID"
        string actorId "Operator user ID"
        string reason "Mandatory audit justification"
        datetime createdAt "Immutable timestamp"
    }
```

---

## 4. Reservation State Lifecycle

```mermaid
stateDiagram-v2
    [*] --> ACTIVE : reserveStock(cartId, 15m TTL)
    note right of ACTIVE
      Balance: reserved += qty
      Available: decrements
      Movement: RESERVE logged
    end note

    ACTIVE --> COMMITTED : commitReservation(orderId)
    note right of COMMITTED
      Balance: onHand -= qty, reserved -= qty
      Available: remains constant
      Movement: COMMIT logged
    end note

    ACTIVE --> RELEASED : releaseReservation(manual or cancel)
    note right of RELEASED
      Balance: reserved -= qty
      Available: increments
      Movement: RELEASE logged
    end note

    ACTIVE --> EXPIRED : expireStaleReservations(TTL sweep)
    note right of EXPIRED
      Past expiresAt cutoff
      Balance: reserved -= qty
      Available: increments
      Movement: RELEASE logged
    end note

    COMMITTED --> [*]
    RELEASED --> [*]
    EXPIRED --> [*]
```

---

## 5. Concurrency Race Guarantee Proof

### Scenario: Two Buyers Competing for the Last Available Unit
- Initial state:
  - `onHand = 1`, `reserved = 0`, `damaged = 0`, `quarantined = 0`
  - $\text{Available} = 1 - 0 = 1$
  - `version = 1`
- **T1 (Buyer Alpha)**: Reads `version = 1, available = 1`. Prepares `atomicUpdate(expectedVersion = 1, reservedDelta = +1)`.
- **T2 (Buyer Beta)**: Reads `version = 1, available = 1`. Prepares `atomicUpdate(expectedVersion = 1, reservedDelta = +1)`.
- **Execution**:
  1. Transaction T1 executes in PostgreSQL:
     ```sql
     UPDATE stock_balances
     SET reserved = reserved + 1, version = version + 1, updated_at = NOW()
     WHERE id = 'stb_123' AND version = 1;
     ```
     Rows affected: 1. New version: 2. Available becomes 0.
  2. Transaction T2 executes:
     ```sql
     UPDATE stock_balances
     SET reserved = reserved + 1, version = version + 1, updated_at = NOW()
     WHERE id = 'stb_123' AND version = 1;
     ```
     Rows affected: 0 (version is now 2).
  3. Domain layer detects `rowsAffected === 0` (or version mismatch) and throws:
     `ConflictError: Optimistic concurrency conflict on stock balance 'stb_123'.`
  4. If T2 retries: T2 reads updated balance: `available = 0 < requested = 1` $\rightarrow$ Rejected with `ConflictError: Insufficient stock available.`
- **Result**: Exactly 1 unit sold. Overselling is mathematically impossible.
