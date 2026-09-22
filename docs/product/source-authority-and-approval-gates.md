# AlifWorld Source Authority Hierarchy & Approval Gates

**Document Type**: Governance Policy & Product Source Authority  
**Milestone Reference**: [Milestone 001](../../AlifWorld-300-Milestones/001-project-charter-source-authority-and-ai-execution-protocol.md)  
**Status**: Authoritative & Mandatory  

---

## 1. Source Precedence Hierarchy

When requirements, specifications, marketing materials, or existing codebase artifacts conflict, engineering teams and AI agents must resolve the discrepancy strictly according to this 6-tier hierarchy:

```
[ Tier 1: Approved Business Configuration Matrix & Explicit User Instructions ]
                                      │
                                      ▼
[ Tier 2: AlifWorld E-Commerce Wallet & Rewards Requirements Proposal ]
                                      │
                                      ▼
[ Tier 3: Single-Codebase Next.js Master Build Specification ]
                                      │
                                      ▼
[ Tier 4: Customer Wallet System & Customer-Rank Presentation ]
                                      │
                                      ▼
[ Tier 5: Alifworld.click Marketing Presentation (Ads/Packages/Affiliates) ]
                                      │
                                      ▼
[ Tier 6: Existing Codebase Implementation (Only when not contradicting higher tiers) ]
```

### Hierarchy Rules:
1. **Never Infer Monetary Conversions**: Never use an AI assumption, heuristic, or arbitrary calculation to resolve a monetary or reward ambiguity.
2. **Current Explicit User Instructions**: Direct instructions from the user take Tier 1 precedence, provided they do not violate locked platform invariants (single Next.js repo, BDT integer poisha, independent Product Points).
3. **Legacy Artifacts**: Existing code is Tier 6. If existing code implements an unapproved formula or violates architectural standards, it must be refactored or guarded behind an approved gate rather than preserved as an authority.

---

## 2. The Seven Locked Approval Gates

The following 7 capability areas represent critical business, financial, or legal boundaries. Engineering milestones may prepare database schemas, configuration tables, disabled adapter boundaries, and automated test fixtures, but **must not activate live financial behavior without explicit dated approval recorded in this document**.

| Gate ID | Domain Area | Description of Ambiguity / Risk | Permitted Milestone Action | Restricted Action | Approval Status |
|:---:|:---|:---|:---|:---|:---:|
| **GATE-01** | Eligible Order Status | Determination of the exact order fulfillment state that triggers non-reversible Product Point & reward credit. | Model order states (`DELIVERED`, `COMPLETED`, `RETURN_WINDOW_EXPIRED`). | Accruing points on unconfirmed orders or orders still within the return window. | **Pending Formal Business Matrix Sign-off** |
| **GATE-02** | Profit & Reward Pool Funding | Formal accounting definition and source ledger of funds for platform profit pools (Club Pools, Rank Bonuses). | Design double-entry ledger accounts (`SYSTEM_REWARD_RESERVE`, `ESCROW`). | Executing automatic pool debits without confirmed funding ledger balances. | **Pending Accounting Sign-off** |
| **GATE-03** | Rank Bonus Qualification | Precise qualification metrics (lifetime vs. rolling period sales/points, active referrals) for Customer & Seller Rank Bonuses. | Define versioned rank rule configuration schema and thresholds in Admin. | Auto-promoting accounts or disbursing rank bonuses without approved qualification logic. | **Pending Business Matrix Sign-off** |
| **GATE-04** | Customer Club Period Cadence | Source documents contained duplicate period listings for the third Customer Club tier (Daily, Weekly, Monthly, Yearly). | Implement configurable cron period engine supporting daily, weekly, monthly, and yearly cycles. | Hardcoding club cadences into core application logic. | **Pending Confirmation of Monthly Cycle** |
| **GATE-05** | Advanced Shopping Wallet | Deposit tenure, guaranteed or estimated returns, maturity intervals, early cancellation penalties, and withdrawal constraints. | Prepare schema models, wallet account types, and Admin configuration UI behind a disabled feature flag. | Accepting customer deposits or calculating returns on deposit balances. | **Pending Financial & Legal Approval** |
| **GATE-06** | Package BDT Price Catalogue | Marketing materials quote subscription and advertising packages in USD ($10, $25, $50, etc.). | Create BDT catalogue configuration tables with explicit poisha prices. | Performing dynamic or real-time currency exchange rate conversion from USD to BDT. | **Pending BDT Fixed Price Sign-off** |
| **GATE-07** | Regulatory & Territorial Compliance | Bangladesh compliance for lottery/draws (Good-Luck), micro-commissions, multi-tier affiliate marketing, consumer protection, and tax withholding. | Implement code behind strict feature flags (`FEATURE_LOTTERY_ENABLED=false`, `FEATURE_AFFILIATE_ENABLED=false`). | Enabling live ticket sales, draws, or multi-level affiliate commission disbursements. | **Pending Legal & Regulatory Certification** |

---

## 3. Engineering Protocol for Unapproved Gates

When an AI agent or engineer encounters a milestone that depends on an unapproved gate:

1. **Do Not Bypass**: The agent is strictly prohibited from inventing a formula or assuming approval.
2. **Implement the Safe Boundary**:
   - Model the typed schema and data structures.
   - Build the Admin configuration interface with validation rules.
   - Implement the business logic behind a verified feature gate (`enabled: false`).
   - Write comprehensive unit tests verifying that when the feature is disabled, the system returns a safe, localized error (`FEATURE_PENDING_APPROVAL`).
3. **Record in Milestone Completion Report**: Explicitly log the gate ID, the unapproved status, and the evidence that the feature remains safely disabled in production paths.
