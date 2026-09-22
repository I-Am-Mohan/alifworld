# ADR 0002: Source-Document Reconciliation and Treatment of Ambiguities

**Status**: Accepted  
**Date**: 2026-09-22  
**Deciders**: AlifWorld Architecture & Product Governance Team  
**Milestone Reference**: [Milestone 002](../../AlifWorld-300-Milestones/002-source-document-reconciliation-and-decision-log.md)  
**Supporting Specification**: [Source Document Reconciliation Matrix](../product/source-document-reconciliation-matrix.md)  

---

## Context and Problem Statement

The AlifWorld project documentation includes multiple primary documents produced at different times by different stakeholders:
1. The Single-Codebase Next.js Master Build Specification.
2. The 10-Page AlifWorld E-Commerce Wallet & Rewards Requirements Proposal.
3. The Customer Wallet System & AlifWorld Customer-Rank Slide Presentation.
4. The Alifworld.click Marketing Slide Presentation (Ads, Packages, Affiliates).
5. Brand Assets (`colors.md` and `logo.png`).

Direct contradictions exist between these documents regarding customer club cycles, currency conversion vs. independent product points, wallet splits, reward pool funding, career gifts vs. rank bonus pools, and regulatory compliance around lotteries and deposit-taking.

A formal Architecture Decision Record is required to reconcile these documents, establish definitive interpretations, and lock unresolved items behind approval gates.

---

## Decision Drivers

- **Definitive Source Authority**: Eliminate guesswork by enforcing the 6-tier source precedence hierarchy.
- **Clarified Wallet & Rewards Rules**: Establish the 10-Page Proposal as the governing standard for mathematical splits and double-entry ledgers.
- **Regulatory & Legal Prudence**: Protect the platform against legal exposure under Bangladesh banking, taxation, and gaming laws.
- **Stateless Single-Monolith Integrity**: Prevent feature bloat or external service creep.

---

## Reconciled Decisions

### 1. Adoption of the 10-Page Proposal as Clarified Authority
The 10-Page AlifWorld E-Commerce Wallet & Rewards Requirements Proposal is adopted as the Tier 2 authoritative standard for all wallet ledger rules, cashback formulas, customer club tiers, seller clubs, and regional commission distributions.

### 2. Resolution of the Duplicated Customer Club Period (CONF-01 / GATE-04)
The Customer Wallet slide presentation listed four cycles: "Daily, Weekly, Weekly, Yearly". The second "Weekly" is officially resolved as a typographical error for **Monthly**. The four authoritative customer and seller club cycles are:
- **Daily** (Calculated daily at 23:59:59 Asia/Dhaka)
- **Weekly** (Calculated weekly on Sunday 23:59:59 Asia/Dhaka)
- **Monthly** (Calculated on the last day of each calendar month 23:59:59 Asia/Dhaka)
- **Yearly** (Calculated on December 31 23:59:59 Asia/Dhaka)
*Status*: Governed by GATE-04; configuration defaults to these four periods.

### 3. Absolute Independence of Product Points (CONF-02)
Product price (in BDT poisha) and Product Points (PP) are completely independent values. Sellers set both values explicitly on products. The application will never calculate, infer, or display a conversion rate (e.g. "1 PP = X BDT"). Points snapshot on order line items and are earned only when the order reaches an eligible non-returnable status.

### 4. Authoritative Reward Splits (CONF-04 & CONF-05)
The platform standardizes on balanced, 100% double-entry split templates:
- **Customer Reward Split (50-20-15-5-10)**:
  - 50% Main / Withdrawable Wallet
  - 20% Shopping Wallet (Restricted to platform purchases)
  - 15% Customer Club Pool
  - 5% Referral Bonus (Direct sponsor)
  - 10% Community / Charity Reserve
- **Seller Reward Split (70-15-5-10)**:
  - 70% Main / Payout Balance
  - 15% Seller Club Pool
  - 5% Platform Reserve
  - 10% Seller Growth & Service Fund

### 5. Regional Distribution Commission Structure (CONF-11)
Regional commissions for affiliated service points and territorial representatives are governed by the Tier 2 schedule:
- Division Commission: `0.5%`
- District Commission: `0.5%`
- Upazila Commission: `1.0%`
- Service Point Commission: `2.0%`
- Charity Fund: `1.0%`
- Platform Service Charge: `1.0%`

### 6. Isolation of Advanced Shopping Wallet (CONF-08 / GATE-05)
Because fixed-return customer deposit programs carry substantial regulatory risk under Bangladesh Bank financial guidelines, the Advanced Shopping Wallet is modeled in code but locked behind feature flag `FEATURE_ADVANCED_SHOPPING_ENABLED=false`. No customer deposits or interest yields will be activated without formal banking and legal clearance.

### 7. Fixed BDT Package Pricing (CONF-09 / GATE-06)
Packages quoted in USD in marketing slide decks will not be dynamically converted using exchange rates. Admin will configure fixed BDT poisha prices in a dedicated package catalogue.

### 8. Lottery & Gaming Feature Gate (CONF-10 / GATE-07)
The Good-Luck weekly lottery ticket and prize draw system is isolated behind `FEATURE_LOTTERY_ENABLED=false` pending certified legal compliance review under the Public Gambling Act and Bangladesh consumer protection regulations.

---

## Consequences

### Positive:
- Cross-document ambiguity is completely eliminated; all 300 milestones now share a unified reference standard.
- Legal and compliance risks are safely isolated behind feature flags without delaying core e-commerce delivery.
- Mathematical models for customer clubs, seller rewards, and regional commissions are fully defined as 100% balanced double-entry templates.

### Negative / Trade-offs:
- Certain marketing slide features (e.g. instant USD packages, lottery draws, deposit savings yields) remain disabled at launch until stakeholders provide formal clearance.

---

## Traceability & Compliance

- **Governing Precedence**: Tier 1 (Matrix) > Tier 2 (Proposal) > Tier 3 (Build Spec) > Tier 4 (Wallet Deck) > Tier 5 (Marketing Deck) > Tier 6 (Existing Code).
- **Enforcement**: Milestones 003–300 must conform to this ADR. Any deviation requires a dated amendment and unanimous architecture sign-off.
