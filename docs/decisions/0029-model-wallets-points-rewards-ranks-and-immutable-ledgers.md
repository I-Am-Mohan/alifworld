# ADR-0029: Model Wallets, Points, Rewards, Ranks, and Immutable Ledgers

**Status**: Accepted  
**Date**: 2026-09-22  
**Deciders**: Architecture Team, Financial Engineering, Compliance, Loyalty & Growth Operations  
**Milestone Reference**: [Milestone 029](../../AlifWorld-300-Milestones/029-model-wallets-points-rewards-ranks-and-immutable-ledgers.md)  
**Phase**: Phase 03: Data Architecture  
**Supporting Specification**: [Wallets, Points, Rewards, Ranks & Immutable Ledgers Architecture](../architecture/wallets-points-rewards-ranks-and-immutable-ledgers.md)  

---

## Context and Problem Statement

AlifWorld requires a comprehensive financial ledger, multi-account wallet architecture, decoupled loyalty rewards engine, and competitive rank qualification framework to power commerce incentives in Bangladesh.

The critical domain requirements and business rules include:
1. **Multi-Account Wallet Segregation**:
   - Customer balances must be strictly partitioned into:
     - `MAIN`: Spendable on storefront or withdrawable to verified commercial bank accounts (BEFTN/bKash).
     - `SHOPPING`: Non-withdrawable commercial store credits dedicated exclusively to marketplace checkout.
     - `GOOD_LUCK`: Promotional lottery / draw allocations.
     - `CHARITY`: Audited social donation allocations under NBR guidelines.
2. **Double-Entry Financial Conservation**:
   - Balances must never be mutated via ad-hoc database updates without balanced, auditable journal postings.
   - Every journal transaction must strictly enforce $\sum \text{Debits} == \sum \text{Credits} == \text{TotalPoisha}$.
   - All amounts operate in integer minor units (poisha, where $1\text{ BDT} = 100\text{ poisha}$).
3. **Decoupled Product Points (PP) System**:
   - Product Points are discrete loyalty tokens ($PP \in \mathbb{N}_0$) allocated per SKU.
   - **The platform never infers a conversion rate between BDT currency and Product Points.**
   - Points are snapshotted on order checkout, held in escrow (`pendingPoints`) during the consumer inspection/return window, and released to `availablePoints` upon window closure. On return, points are clawed back via signed negative events.
4. **Versioned Split Policies (100% Sum Invariant)**:
   - Administrative reward rules must be versioned (`v1.0.0`) and stored immutably on every allocation.
   - Customer reward splits (Main 50%, Shopping 20%, Good-Luck 15%, Charity 5%, Service Charge 10%) and Seller splits (Main 70%, Good-Luck 15%, Charity 5%, Service Charge 10%) must be validated to sum to exactly 10,000 basis points (100.00%) before activation.
5. **Ranks & Leaderboard Recognition**:
   - Customer Club (Bronze, Silver, Gold) and Seller Club (Bronze, Silver, Gold) qualification thresholds across Daily, Weekly, Monthly, and Yearly periods.
   - Star bands (Mega Star positions 1-10, Super Star 11-50, Star 51-100) referencing approved pool allocations.

---

## Decision Drivers

- **Zero-Sum Ledger Integrity**: Prevent unbacked wallet creation or phantom balances.
- **Auditing & Immutability**: All financial entries, point events, and reward allocations are classified as `IMMUTABLE`. Deletions and modifications in place are forbidden; adjustments must use countervailing reversal journals (`reversalOfId`).
- **Loyalty Decoupling**: Ensure legal and operational compliance by preventing speculative point-to-cash currency conversions.
- **Strict Multi-Tenant Isolation**: Merchants can only access ledger postings and wallets linked to their own store.

---

## Considered Options

1. **Single Flat Wallet Balance with Type Tags**:
   - *Pros*: Single table, simple queries.
   - *Cons*: High risk of balance commingling; inability to enforce double-entry auditability; difficult to distinguish withdrawable cash from promotional store credits.
2. **Synthetic BDT Conversion for Product Points**:
   - *Pros*: Unified currency representation.
   - *Cons*: Violates AlifWorld's foundational architecture; subjects loyalty tokens to financial regulator scrutiny; causes rounding leakage.
3. **Multi-Account Segregated Wallets with Formal Double-Entry Ledger & Decoupled Point Accounts (Selected)**:
   - *Pros*: Mathematically exact, satisfies double-entry bookkeeping standards, guarantees 100% split validation, and cleanly isolates loyalty points from fiat balances.

---

## Decision Outcome & Detailed Rationale

### 1. Relational Persistence Schema (Models 39–49)
Added to `prisma/schema.prisma`:
- `Wallet`: Multi-account segregated balance wallets (`MAIN`, `SHOPPING`, `GOOD_LUCK`, `CHARITY`, `SYSTEM_RESERVE`) with explicit `availablePoisha` and `pendingPoisha` attributes.
- `LedgerAccount`: Chart of accounts for double-entry bookkeeping (`ASSET`, `LIABILITY`, `EQUITY`, `REVENUE`, `EXPENSE`).
- `LedgerJournal`: Immutable journal transaction header enforcing $\sum \text{Debits} == \sum \text{Credits}$ with reversal linkage.
- `LedgerPosting`: Atomic debit and credit entries against chart of accounts and wallets.
- `PointAccount`: Dedicated customer loyalty token account (`availablePoints`, `pendingPoints`, `lifetimePoints`).
- `PointEvent`: Immutable chronological point adjustments (`ORDER_EARNED`, `ORDER_RELEASED`, `REFUND_REVERSED`).
- `RewardRule`: Versioned reward and split configuration with 10,000 bps (100.00%) validation.
- `RewardAllocation`: Calculation snapshot of reward distributions across wallets.
- `RankDefinition`: Recognition tier and star band definitions with point thresholds and pool shares.
- `UserRank`: User and seller rank achievements and qualifications per period.
- `LeaderboardSnapshot`: Immutable historical leaderboard snapshots.

### 2. Standardized Identifiers & Lifecycle Governance
- **ID Prefixes** (`src/shared/utils/id.ts`):
  - `WALLET`: `'wal'`
  - `LEDGER_ACCOUNT`: `'lac'`
  - `LEDGER_JOURNAL`: `'jrn'`
  - `LEDGER_POSTING`: `'pos'`
  - `POINT_ACCOUNT`: `'pac'`
  - `POINT_EVENT`: `'pev'`
  - `REWARD_RULE`: `'rwr'`
  - `REWARD_ALLOCATION`: `'rwa'`
  - `RANK_DEFINITION`: `'rnk'`
  - `USER_RANK`: `'urk'`
  - `LEADERBOARD_SNAPSHOT`: `'lbs'`
- **Lifecycle Policies** (`src/shared/database/lifecycle.ts`):
  - `IMMUTABLE`: `LedgerJournal`, `LedgerPosting`, `PointEvent`, `RewardAllocation`, `LeaderboardSnapshot`.
  - `SOFT_DELETE`: `Wallet`, `LedgerAccount`, `PointAccount`, `RewardRule`, `RankDefinition`, `UserRank`.

---

## Consequences

### Positive
- Strict mathematical conservation of money and loyalty tokens.
- Zero out-of-balance transactions via double-entry enforcement.
- Full compliance with Bangladesh Bank, NBR Mushak, and consumer protection guidelines.
- Clean separation between withdrawable customer cash and promotional store credits.

### Negative / Trade-offs
- Creating transactions requires writing multi-row journal postings rather than single-table updates.
- Reversing a journal requires creating an inverted journal rather than editing previous records.
