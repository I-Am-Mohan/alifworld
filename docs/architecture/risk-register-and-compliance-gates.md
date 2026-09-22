# AlifWorld Risk Register & Compliance Approval Gates

**Document Type**: Architectural Governance, Risk Mitigation & Compliance Framework  
**Phase Reference**: Phase 01 — Governance and Architecture  
**Milestone Reference**: [Milestone 008](../../AlifWorld-300-Milestones/008-risk-register-and-compliance-approval-gates.md)  
**Regulatory Context**: Bangladesh Laws (Bank Companies Act, Direct Selling Act, Public Gambling Act, VAT Act 2012)  
**Status**: Authoritative & Active  

---

## 1. Enterprise Risk Matrix & Severity Scoring

AlifWorld evaluates platform risks across five core risk categories using a standardized `5x5` Probability and Impact scoring model:

$$\text{Risk Score} = \text{Probability (1–5)} \times \text{Impact (1–5)}$$

- **Critical (Score 20–25)**: Immediate project stoppage or legal shutdown; requires hard architectural gates.
- **High (Score 12–19)**: Significant financial loss or platform outage; requires automated code-level controls.
- **Medium (Score 6–11)**: Degraded customer experience or operational friction; requires monitoring and circuit breakers.
- **Low (Score 1–5)**: Minor inconvenience; handled by standard procedural documentation.

---

## 2. The Comprehensive Platform Risk Register

| Risk ID | Risk Category | Risk Description | Prob (1-5) | Impact (1-5) | Score | Mitigation Strategy & Controls | Residual Risk |
|:---:|:---|:---|:---:|:---:|:---:|:---|:---:|
| **RSK-01** | **Regulatory** | **Unlicensed Deposit-Taking (Advanced Shopping)**: Offering fixed-return deposit savings without Bangladesh Bank banking license. | 4 | 5 | **20 (Critical)** | **Hard Gate (GATE-05)**: Feature flag `FEATURE_ADVANCED_SHOPPING_ENABLED=false`. All deposit endpoints disabled in production. | Low |
| **RSK-02** | **Regulatory** | **Gaming / Lottery Violations (Good-Luck)**: Weekly cash/prize lottery draws violating Bangladesh Public Gambling Act. | 4 | 5 | **20 (Critical)** | **Hard Gate (GATE-07)**: Feature flag `FEATURE_LOTTERY_ENABLED=false`. Ticket sales and draw schedulers permanently disabled until certified. | Low |
| **RSK-03** | **Regulatory** | **Pyramid Scheme Perception (Multi-Tier Affiliate)**: Marketing slide affiliate structures violating Direct Selling Regulation 2013. | 3 | 5 | **15 (High)** | Restrict active commissions strictly to single-tier direct sponsor (5%) and geographic service point partners. Multi-tier chains gated. | Low |
| **RSK-04** | **Financial** | **Currency Rounding Leakage**: Floating-point math causing fractional poisha drift across millions of split reward transactions. | 5 | 4 | **20 (Critical)** | **Locked Invariant**: 100% integer poisha (`Poisha` branded type); zero floating-point money in code/db. Allocation remainders go to platform reserve. | Zero |
| **RSK-05** | **Financial** | **Reward Accrual / Cancellation Fraud**: Points credited upon order placement and redeemed before order is returned or cancelled. | 4 | 4 | **16 (High)** | **Hard Gate (GATE-01)**: Points accrue in `PENDING` state; post to active wallet only after return window expires (`COMPLETED`). Returns reverse points. | Low |
| **RSK-06** | **Financial** | **Unfunded Reward Pool Deficits**: Distributing Customer/Seller Club pools without verified underlying revenue reserves. | 3 | 5 | **15 (High)** | **Hard Gate (GATE-02)**: Double-entry debit ledger account (`ESCROW_REWARD_RESERVE`) must be pre-funded. Settlements halt automatically if reserve is insufficient. | Low |
| **RSK-07** | **Security** | **Multi-Tenant Data Leakage**: Seller A accessing orders, customer addresses, or financials belonging to Seller B. | 3 | 5 | **15 (High)** | Repository-level tenant enforcement (`where: { sellerId }`) on every Prisma query. Negative tenant authorization tests in CI. | Low |
| **RSK-08** | **Security** | **KYC Document & PII Exposure**: Unrestricted public access to seller NID, trade licenses, or customer phone records. | 3 | 4 | **12 (High)** | Private S3 bucket with short-lived presigned URLs (15-min expiry). Mandatory field redaction in all logging pipelines. | Low |
| **RSK-09** | **Technical** | **Inventory Race Overselling**: Simultaneous checkout of the last item in stock leading to unfulfillable orders. | 4 | 4 | **16 (High)** | Atomic Redis reservations with distributed locks (`Redlock`) + PostgreSQL row-level locks (`FOR UPDATE`) in Prisma transactions. | Low |
| **RSK-10** | **Technical** | **External Search Outage**: Meilisearch cluster crash rendering the customer storefront unable to search products. | 3 | 4 | **12 (High)** | **Resilient Adapter**: Automatic, boot-safe fallback to PostgreSQL trigram/full-text search within 250ms of Meilisearch timeout. | Low |
| **RSK-11** | **Operational** | **SMS Gateway Exhaustion / Failure**: OTP delivery failures locking customers out during login or checkout. | 3 | 3 | **9 (Med)** | Exponential backoff retries via BullMQ + secondary email OTP fallback option presented in UI. | Low |
| **RSK-12** | **Governance** | **AI Architectural Drift**: AI agents inventing conversion rates, mocking fake success paths, or skipping tests. | 4 | 4 | **16 (High)** | Strict 10-step AI execution protocol, automated commit quality gates, zero-placeholder policy, and mandatory ADR documentation. | Low |

---

## 3. Compliance Approval Gates Framework

To protect the platform against catastrophic financial or legal liabilities, high-risk capabilities are governed by a **Formal Compliance Gate Lifecycle**:

```
[ State: DOCUMENTED ] -> Business & technical specifications modeled in documentation
          │
          ▼
[ State: EVALUATING ] -> Schemas, disabled adapters, and unit tests implemented in code
          │
          ▼
[ State: APPROVED_WITH_CONDITIONS ] -> Formal legal/accounting sign-off recorded
          │
          ▼
[ State: ACTIVATED ] -> Feature flag toggled to true in production
```

### The 7 Operationalized Approval Gates

| Gate ID | Gated Domain | Enforcing Flag in Code | Default State | Activation Prerequisite |
|:---:|:---|:---|:---:|:---|
| **GATE-01** | **Eligible Order Status** | `CONFIG_ELIGIBLE_ORDER_STATUS` | `COMPLETED` | Dated sign-off on return window duration (e.g. 7 days post-delivery). |
| **GATE-02** | **Reward Pool Funding Ledger** | `CONFIG_REWARD_POOL_FUNDING_SOURCE` | `RESERVE_ESCROW` | Accounting sign-off on margin allocation formula and funding ledger. |
| **GATE-03** | **Rank Bonus Qualification** | `CONFIG_RANK_QUALIFICATION_RULES` | `VERSIONED_ADMIN` | Business sign-off on rolling vs. lifetime volume thresholds. |
| **GATE-04** | **Customer Club Cadences** | `CONFIG_CLUB_CYCLES` | `DAILY,WEEKLY,MONTHLY,YEARLY` | Formal confirmation that duplicated period in slide deck is Monthly. |
| **GATE-05** | **Advanced Shopping Wallet** | `FEATURE_ADVANCED_SHOPPING_ENABLED` | `false` (Disabled) | Legal certification of non-banking deposit compliance under Bangladesh Bank. |
| **GATE-06** | **Fixed BDT Package Catalogue** | `FEATURE_PACKAGE_FIXED_BDT_CATALOGUE` | `true` (No Dynamic FX) | Approved BDT price catalogue for subscription/ad packages. |
| **GATE-07** | **Lottery & Promotional Draws** | `FEATURE_LOTTERY_ENABLED` | `false` (Disabled) | Legal opinion certifying compliance with Bangladesh Public Gambling Act. |

---

## 4. Technical Enforcement of Disabled Gates

When a feature is protected behind an unapproved gate:
1. **API Endpoints**: Return HTTP `501 Not Implemented` or HTTP `403 Forbidden` with a standardized machine-readable error payload:
   ```json
   {
     "success": false,
     "error": {
       "code": "FEATURE_PENDING_REGULATORY_APPROVAL",
       "message": "This feature is pending formal regulatory compliance approval and is currently disabled.",
       "details": { "gateId": "GATE-05" }
     }
   }
   ```
2. **UI Surfaces**: Render an informative disabled state badge or hide navigation routes completely. Never display broken screens or mock success journeys.
3. **Automated CI Tests**: Unit tests must explicitly verify that disabled gates reject execution attempts and do not alter database balances.
