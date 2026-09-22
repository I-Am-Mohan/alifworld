# ADR-0028: Model Payments, Refunds, Commissions, Settlements, and Payouts

**Status**: Accepted  
**Date**: 2026-09-22  
**Deciders**: Architecture Team, Financial Engineering, Compliance, Multi-Vendor Operations  
**Milestone Reference**: [Milestone 028](../../AlifWorld-300-Milestones/028-model-payments-refunds-commissions-settlements-and-payouts.md)  
**Phase**: Phase 03: Data Architecture  
**Supporting Specification**: [Payments, Refunds, Commissions, Settlements & Payouts Architecture](../architecture/payments-refunds-commissions-settlements-and-payouts.md)  

---

## Context and Problem Statement

AlifWorld requires a robust financial architecture to manage customer payment transactions, gateway webhook notifications, item-level partial refunds, platform commission accounting, periodic merchant clearing batches, and electronic payout disbursals in Bangladesh.

The key engineering and business constraints include:
1. **Zero Floating-Point Representation**: All monetary values across customer payments, gateway processing charges, line-item refunds, platform commissions, seller settlements, and electronic bank wire payouts must operate strictly on integer minor units (poisha, where $1\text{ BDT} = 100\text{ poisha}$). Floating-point arithmetic (`number`) is strictly prohibited.
2. **Independent Product Points (PP) Loyalty Reversals**: Product price and Product Points are decoupled, independent values. On item return or partial refund, the exact snapshotted Product Points associated with the returned units must be reversed without applying synthetic BDT conversion rates.
3. **Item-Level Bounded Partial Refunds**: Customers may request refunds for specific line items or quantities. The cumulative refund amount must never exceed the captured payment amount.
4. **Platform Commission Ledger with Rule Versioning**: The platform charges a standard commission rate (e.g., $5.00\% = 500\text{ bps}$) on gross item subtotals. Commission rules must record immutable rule version identifiers (`v1.0.0`). In the event of refunds, reversals must be recorded as signed negative commission adjustments referencing the original ledger entry (`reversalOfId`).
5. **Multi-Tenant Seller Settlement & Disbursal**: Delivered fulfillment groups are aggregated into periodic settlement statement batches (`SellerSettlement`). Payouts (`SellerPayout`) disburse net cleared funds electronically via Bangladesh Bank clearing channels (BEFTN, RTGS, NPSB) or Mobile Financial Services (bKash, Nagad).
6. **Immutable Financial Auditing & Webhook Idempotency**: Financial transactions, refunds, commission logs, payouts, and webhook events are append-only (`IMMUTABLE`). Webhook payloads from payment gateways must be verified using HMAC SHA-256 signatures and deduplicated via unique provider event identifiers (`externalEventId`).

---

## Decision Drivers

- **Bangladeshi Banking & Gateway Alignment**: First-class support for bKash, Nagad, Upay, Rocket, SSLCommerz, and BEFTN clearing.
- **Strict Immutability & Financial Non-Repudiation**: Ledgers and audit logs cannot be updated or deleted in place; adjustments are made via countervailing signed entries.
- **Idempotency & Replay Protection**: Webhook ingestion and payment capture enforce idempotency keys to eliminate double-crediting or duplicate orders.
- **Tenant Isolation**: Merchants can view only their own settlement statements, commission deductions, and payout wire transfers.

---

## Considered Options

1. **Direct Mutation of Order Totals on Refund**:
   - *Pros*: Simple single-row update.
   - *Cons*: Violates financial audit principles; destroys historical transaction records; creates reconciliation discrepancies with payment gateway statements.
2. **Floating-Point Currency Storage (`DECIMAL(12, 2)`)**:
   - *Pros*: Native human-readable format.
   - *Cons*: Subject to IEEE 754 precision drift and rounding errors across multiplication and division; violates AlifWorld's integer minor unit rule.
3. **Double-Entry Integer Minor Unit Ledger Architecture (Selected)**:
   - *Pros*: Provides mathematically exact poisha bookkeeping, strict append-only auditability, decoupled Product Points reversal, verifiable rule versioning, and secure multi-tenant clearing.

---

## Decision Outcome & Detailed Rationale

### 1. Relational Persistence Schema (Models 32–38)
Added to `prisma/schema.prisma`:
- `Payment`: Inward customer payment captured via digital gateway (bKash, Nagad) or Cash on Delivery. Stores `amountPoisha` and `feePoisha` as `BigInt`.
- `Refund`: Customer refund transaction tracking approved amounts, gateway refund identifiers, and net seller deductions.
- `RefundItem`: Itemized breakdown of returned units, refunded poisha, reversed VAT, and returned discrete Product Points.
- `CommissionLedger`: Platform commission ledger tracking gross basis amount, basis points rate ($500\text{ bps}$), rule version (`v1.0.0`), and negative reversal links (`reversalOfId`).
- `SellerSettlement`: Periodic settlement statement batch aggregating delivered merchant groups, shipping fees, tax, platform commissions, and refund deductions into a net payout.
- `SellerPayout`: Physical electronic funds transfer (BEFTN, RTGS, bKash) disbursing net settled funds to verified merchant commercial bank accounts.
- `PaymentWebhookLog`: Gateway webhook ingestion log storing raw payloads, provider signatures, verification status, and replay deduplication (`externalEventId`).

### 2. Standardized Identifiers & Lifecycle Governance
- **ID Prefixes** (`src/shared/utils/id.ts`):
  - `PAYMENT`: `'pay'`
  - `REFUND`: `'ref'`
  - `REFUND_ITEM`: `'rfi'`
  - `COMMISSION`: `'com'`
  - `SETTLEMENT`: `'stl'`
  - `PAYOUT`: `'pot'`
  - `WEBHOOK_LOG`: `'pwl'`
- **Lifecycle Policies** (`src/shared/database/lifecycle.ts`):
  - `Payment`: `IMMUTABLE`
  - `Refund`: `IMMUTABLE`
  - `RefundItem`: `IMMUTABLE`
  - `CommissionLedger`: `IMMUTABLE`
  - `SellerSettlement`: `SOFT_DELETE`
  - `SellerPayout`: `IMMUTABLE`
  - `PaymentWebhookLog`: `IMMUTABLE`

### 3. Data Integrity & Financial Invariants
- **Poisha Conservation**:
  $$\text{Net Payout} = \text{Gross Subtotal} + \text{Shipping Fee} + \text{Tax} - \text{Commission} - \text{Refund Deductions}$$
  Calculated strictly using `BigInt` integer arithmetic.
- **Refund Ceiling Invariant**:
  $$\sum \text{Refunds} \le \text{Captured Payment Amount}$$
- **Decoupled Loyalty Reversal**:
  When a refund is approved, discrete Product Points ($PP$) are decremented directly from the user's pending or earned balance without altering monetary exchange rates.

---

## Consequences

### Positive
- Zero floating-point rounding errors across checkout, refunds, and merchant payouts.
- Full compliance with Bangladesh Bank BEFTN clearing standards and NBR VAT rules.
- Cryptographic verification and deduplication prevent replay attacks on payment webhook endpoints.
- Complete transparency for sellers regarding 5% platform deductions and payout schedules.

### Negative / Trade-offs
- Client applications must convert `BigInt` poisha strings to formatted BDT currency strings (`৳25,348.50`).
- Strict immutability requires negative reversal records rather than inline edits for commission and refund corrections.
