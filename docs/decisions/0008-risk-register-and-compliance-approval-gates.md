# ADR 0008: Risk Register and Compliance Approval Gates Framework

**Status**: Accepted  
**Date**: 2026-09-22  
**Deciders**: AlifWorld Architecture, Legal & Risk Governance Team  
**Milestone Reference**: [Milestone 008](../../AlifWorld-300-Milestones/008-risk-register-and-compliance-approval-gates.md)  
**Supporting Specification**: [Risk Register & Compliance Approval Gates](../architecture/risk-register-and-compliance-gates.md)  

---

## Context and Problem Statement

AlifWorld operates in a complex regulatory and commercial environment in Bangladesh. Marketing presentations and historical proposals contain ambitious business concepts—including term-deposit shopping accounts (Advanced Shopping), weekly lottery draws (Good-Luck Lottery), multi-tier affiliate referral chains, and unbacked reward pools—that present severe legal and financial hazards:
1. Deposit-taking without a banking license violates the Bangladesh Bank Companies Act.
2. Unlicensed lotteries violate the Public Gambling Act.
3. Multi-tier pyramid compensation structures violate Direct Selling regulations.
4. Premature point accrual creates high risk of post-cancellation reward fraud.

A formal Architecture Decision Record is required to lock these high-risk areas behind enforced compliance approval gates and establish the platform Risk Register.

---

## Decision Drivers

- **Zero Legal Liability**: Absolute compliance with Bangladesh banking, consumer protection, tax, and direct selling statutes.
- **Financial Defense-in-Depth**: Protection of platform solvency by prohibiting unfunded reward debits or premature point disbursements.
- **Fail-Safe Agent Execution**: Explicit rules preventing autonomous AI agents from activating unapproved capabilities.

---

## Decision Outcome

The AlifWorld architecture formally establishes the **Risk Register and Compliance Approval Gates Framework**:

### 1. Enterprise Risk Register Adoption
All platform engineering must comply with the mitigations established in the 12-point Risk Register ([`docs/architecture/risk-register-and-compliance-gates.md`](../architecture/risk-register-and-compliance-gates.md)), covering Regulatory, Financial, Security, Technical, Operational, and Governance risks.

### 2. Operationalization of the Seven Compliance Gates
The 7 compliance approval gates are codified in software:
- **GATE-01 (Eligible Order Status)**: Points snapshot at checkout but post to active balance only after return window expiration (`COMPLETED`).
- **GATE-02 (Reward Pool Funding)**: Reward distributions require verified double-entry pre-funding from `ESCROW_REWARD_RESERVE`.
- **GATE-03 (Rank Qualification)**: Governed by versioned Admin configuration; cash rank bonuses are decoupled from marketing non-cash gifts.
- **GATE-04 (Club Cadences)**: Standardized to `DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY`.
- **GATE-05 (Advanced Shopping)**: Hard-gated behind `FEATURE_ADVANCED_SHOPPING_ENABLED=false` until formal Bangladesh Bank clearance.
- **GATE-06 (Package Pricing)**: Fixed BDT catalogue prices only; dynamic USD exchange rate conversion is forbidden.
- **GATE-07 (Lottery / Gaming)**: Hard-gated behind `FEATURE_LOTTERY_ENABLED=false` pending legal certification.

### 3. Technical Behavior for Disabled Gates
When a requested capability is gated:
- Route Handlers must return HTTP `403 Forbidden` or `501 Not Implemented` with error code `FEATURE_PENDING_REGULATORY_APPROVAL`.
- UI surfaces must render clear disabled-state notices; fake success journeys or placeholder screens are prohibited.
- Background cron workers must skip execution runs and log an auditable skip record.

---

## Consequences

### Positive:
- Protects founders, operators, and platform infrastructure from severe legal sanctions and financial fraud.
- Eliminates speculative coding by AI agents while allowing schema and adapter scaffolding to proceed cleanly.
- Establishes a verifiable, auditable compliance trail for regulatory authorities.

### Negative / Trade-offs:
- Advanced Shopping and Good-Luck lottery will not be available to end-users at initial soft launch.

---

## Compliance and Verification

- **Automated Tests**: Unit tests must verify that disabled feature flags reject execution attempts with exact error codes.
- **Audit Logs**: Any attempt to toggle an approval gate in production requires Super Admin maker-checker authorization recorded in immutable audit logs.
