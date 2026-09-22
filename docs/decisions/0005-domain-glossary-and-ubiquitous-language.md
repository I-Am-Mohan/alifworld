# ADR 0005: Ubiquitous Language, Canonical Domain Glossary, and Monetary Typing

**Status**: Accepted  
**Date**: 2026-09-22  
**Deciders**: AlifWorld Architecture & Product Governance Team  
**Milestone Reference**: [Milestone 005](../../AlifWorld-300-Milestones/005-domain-glossary-and-ubiquitous-language.md)  
**Supporting Specification**: [Domain Glossary & Ubiquitous Language](../architecture/domain-glossary-and-ubiquitous-language.md)  

---

## Context and Problem Statement

Multi-vendor e-commerce platforms involving customer loyalty, affiliate commissions, and seller clubs frequently experience severe bugs due to terminology confusion:
1. Interchangeable use of terms like "Points", "Tokens", "Coins", and "Credits" leads to uncoordinated business logic.
2. Floating-point representations of currency ("10.50 Taka") create cumulative rounding leakage across split ledgers.
3. Inconsistent naming of club cycles (e.g. "Weekly 2" vs "Monthly") causes scheduling failures.
4. Mismatch between English developer terminology and Bangla customer-facing copy impairs user experience.

A definitive Architecture Decision Record is required to establish the platform's Ubiquitous Language and type-level primitives.

---

## Decision Drivers

- **Zero Semantic Ambiguity**: One single canonical term for every concept across requirements, code, database, and UI.
- **Financial Precision**: Type-safe monetary primitives in integer poisha (`Poisha`) and discrete Product Points (`ProductPoint`).
- **Bilingual Fidelity**: Seamless synchronization between English development terms and Bangla localized terms.

---

## Decision Outcome

The AlifWorld platform officially adopts the following Ubiquitous Language standards:

### 1. The Canonical Domain Glossary
All codebase models, Prisma schemas, API Route Handlers, and documentation must adhere strictly to the terms defined in [`docs/architecture/domain-glossary-and-ubiquitous-language.md`](../architecture/domain-glossary-and-ubiquitous-language.md).

### 2. Monetary & Loyalty Typing Standards
- **Currency**: Represented exclusively as **Poisha** (1 BDT = 100 poisha). In TypeScript, monetary fields must use the branded `Poisha` type. In database schemas, columns must be suffixed with `_poisha` (e.g. `unit_price_poisha`, `total_amount_poisha`) and typed as `BigInt` or `Int`.
- **Product Points**: Represented exclusively as discrete integers using the branded `ProductPoint` type. Automatic currency-point conversion is strictly prohibited.
- **Snapshot Mandate**: Every order item must record an immutable `PointSnapshot` capturing both price and points at the moment of order placement.

### 3. Canonical Club Cadences
The four authoritative club cycles are:
- `DAILY`
- `WEEKLY`
- `MONTHLY`
- `YEARLY`

### 4. Canonical Wallet Account Types
Double-entry ledgers must categorize accounts under one of eight standard types:
`MAIN_WITHDRAWABLE`, `SHOPPING_RESTRICTED`, `CUSTOMER_CLUB_POOL`, `SELLER_CLUB_POOL`, `REFERRAL_RESERVE`, `CHARITY_FUND`, `PLATFORM_RESERVE`, and `ESCROW` (with `ADVANCED_SHOPPING` and `GOOD_LUCK_LOTTERY` remaining disabled behind approval gates).

### 5. Bilingual Dictionary Enforcement
All user-facing copy and localized API error messages must map directly to the approved Bangla dictionary terms (e.g., `Poisha` -> `পয়সা`, `Product Point` -> `প্রোডাক্ট পয়েন্ট`, `Order` -> `অর্ডার`, `Fulfillment` -> `ডেলিভারি সম্পন্নকরণ`).

---

## Consequences

### Positive:
- Type safety eliminates floating-point bugs at compile time.
- Standardized terminology accelerates engineering velocity across all 300 milestones.
- Eliminates translation mismatches in mobile and web applications.

### Negative / Trade-offs:
- Developers must use explicit conversion utilities (`toPoisha`, `fromPoisha`) when displaying major currency units to end users.

---

## Compliance and Verification

- **Lint & Typecheck**: Pull requests will be rejected if floating-point numbers are used for monetary calculations.
- **Database Review**: Schema migrations introducing monetary fields without `_poisha` suffixes will fail CI checks.
