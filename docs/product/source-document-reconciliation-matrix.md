# AlifWorld Source Document Reconciliation Matrix & Conflict Analysis

**Document Type**: Product Reconciliation & Conflict Governance  
**Milestone Reference**: [Milestone 002](../../AlifWorld-300-Milestones/002-source-document-reconciliation-and-decision-log.md)  
**Governing Precedence**: [Source Authority & Approval Gates](source-authority-and-approval-gates.md)  
**Status**: Authoritative & Reconciled  

---

## 1. Reconciled Source Documents

The AlifWorld platform specification is synthesized from five primary source inputs, evaluated according to the locked 6-tier precedence hierarchy:

1. **Source A (Tier 1/3)**: Single-Codebase Next.js Master Build Specification (Architecture, Invariants, Stack).
2. **Source B (Tier 2)**: 10-Page AlifWorld E-Commerce Wallet & Rewards Requirements Proposal (Authoritative business rules, percentages, and ledgers).
3. **Source C (Tier 4)**: Customer Wallet System & AlifWorld Customer-Rank Presentation (Slide deck on customer career ranks and club structure).
4. **Source D (Tier 5)**: Alifworld.click Marketing Presentation (Slide deck on ad packages, click-to-earn, and affiliate levels).
5. **Source E (Tier 6)**: Brand Guidelines (`colors.md` and `logo.png`).

---

## 2. Comprehensive Cross-Source Conflict Table

| Conflict ID | Domain / Feature | Source A (Master Build Spec) | Source B (10-Page Proposal) | Source C (Customer Wallet Deck) | Source D (Marketing Deck) | Reconciled Resolution & Source Authority | Approval Gate |
|:---:|:---|:---|:---|:---|:---|:---|:---:|
| **CONF-01** | **Customer Club Periods** | Configurable time periods via Asia/Dhaka cron. | Mentions 4 club cycles: Daily, Weekly, Monthly, Yearly. | Erroneously lists: Daily, Weekly, **Weekly (duplicate)**, Yearly. | Not mentioned. | **Adopt Daily, Weekly, Monthly, Yearly**. The duplicated "Weekly" in Source C is a typographical error for "Monthly", confirmed by Source B (Tier 2 > Tier 4). | **GATE-04** (Pending formal matrix sign-off) |
| **CONF-02** | **Product Points vs. Currency** | Mandatory independent integer points; no automatic BDT/PP conversion rate. | Confirms seller-defined points; points used for club qualifications and splits. | Implies direct point-to-cash redeemability in certain marketing slides. | References "Points" as marketing units for ad views. | **Product Points are strictly independent from BDT**. Never infer an exchange rate. Snapshot on order item; accrued only at eligible status. (Source A & B > Source C). | **Locked Core Invariant** |
| **CONF-03** | **Point Accrual Order Status** | Snapshot at checkout; posted only at final non-returnable eligible order status. | Points earned upon completed purchase. | Suggests points post immediately at checkout or order placement. | N/A. | **Points accrue in pending state; post to active balance only after return window expiration**. Immediate posting creates unacceptable risk of return/cancellation point fraud. | **GATE-01** (Pending business matrix sign-off) |
| **CONF-04** | **Customer Reward Split** | Configurable versioned template defaulting to 100% total. | Clarifies authoritative split: **50% Main, 20% Shopping, 15% Club, 5% Referral, 10% Community/Charity**. | Mentions various reward distributions without a balanced 100% double-entry ledger. | N/A. | **Adopt 50-20-15-5-10 split as versioned reference template**. Source B (Tier 2) governs. Ledger entries must total exactly 100% with integer poisha rounding conservation. | **Governed by Versioned Config** |
| **CONF-05** | **Seller Reward Split** | Configurable versioned template. | Clarifies authoritative seller split: **70% Main/Payout, 15% Seller Club, 5% Platform Reserve, 10% Growth/Support**. | Mentions generic seller earnings without ledger breakdown. | N/A. | **Adopt 70-15-5-10 split as versioned reference template**. Source B (Tier 2) governs. | **Governed by Versioned Config** |
| **CONF-06** | **Reward Pool Funding & Accounting** | All wallet entries require balanced double-entry funding source (`ESCROW` / `RESERVE`). | Calculates pools from eligible merchant sales and platform margin. | Assumes pools are funded magically from "company profit" without accounting definition. | N/A. | **Reward pools must be funded from an explicit debit ledger account** (`ESCROW_REWARD_RESERVE`). Pools cannot be distributed if the funding account balance is insufficient. | **GATE-02** (Pending accounting sign-off) |
| **CONF-07** | **Customer Rank Bonus vs. Career Gifts** | Configurable percentage bonus. | Authoritative **3% Customer Rank Bonus pool** distributed among qualified rank holders. | Lists luxury non-cash career prizes: smartphone, motorcycle, Umrah trip, luxury car, apartment. | Lists marketing ranks with cash bonuses. | **Decouple 3% Rank Bonus pool from non-cash physical incentives**. Implement 3% financial rank pool via versioned calculation engine. Non-cash incentive tracking is treated as an operational marketing milestone. | **GATE-03 & GATE-07** |
| **CONF-08** | **Advanced Shopping Wallet** | Stateless modular monolith; bank/interest models prohibited. | Mentions Advanced Shopping Wallet with 30/60/90-day deposit tenures and returns. | Describes fixed return on deposited shopping funds. | N/A. | **Lock behind GATE-05 (Disabled by default)**. High regulatory risk of unlicensed deposit-taking under Bangladesh Bank guidelines. Feature flag `FEATURE_ADVANCED_SHOPPING_ENABLED=false`. | **GATE-05** (Pending legal sign-off) |
| **CONF-09** | **Ad Packages & Currency Conversion** | Native BDT integer minor units (poisha); no dynamic currency conversion. | Focuses on BDT e-commerce catalog. | N/A. | Quotes packages in USD ($10, $25, $50, $100, $200). | **Prohibit automated USD-to-BDT conversion**. Admin must configure explicit, fixed BDT poisha prices in a dedicated package catalogue. | **GATE-06** (Pending BDT catalogue approval) |
| **CONF-10** | **Good-Luck Lottery & Weekly Draws** | Transactional, auditable, regulatory-gated. | Mentions coupon-based weekly prize draws. | Mentions customer promotional tickets. | Emphasizes "Good-Luck Lottery" ticket purchases from Good-Luck Wallet. | **Lock lottery behind GATE-07 (Disabled by default)**. Bangladesh law strictly regulates lotteries and games of chance. Feature flag `FEATURE_LOTTERY_ENABLED=false`. | **GATE-07** (Pending legal certification) |
| **CONF-11** | **Regional Commission Distribution** | Double-entry commission accounting across geographic tiers. | Authoritative hierarchy: **Division (0.5%), District (0.5%), Upazila (1.0%), Service Point (2.0%), Charity (1.0%), Service Charge (1.0%)**. | General references to merchant referrals. | N/A. | **Adopt Source B's exact regional distribution schema**. Commission calculations are pure functions with rounding residuals allocated to the platform reserve. | **Governed by Versioned Config** |
| **CONF-12** | **Brand Identity & Color Tokens** | Modern, high-contrast, black/white foundation with brand orange accent. | E-commerce UI guidelines. | Inconsistent mixed slide palettes. | Inconsistent marketing slide styling. | **Authoritative brand palette locked to `colors.md` and `logo.png`**: Deep Black (`#000000`), Pure White (`#FFFFFF`), Brand Orange (`#FF6A00`), Globe Blues (`#4F8FD9`, `#69B7E8`, `#3456A3`). | **Locked Brand Invariant** |

---

## 3. Reconciliation Rules for AI Agents

1. **Precedence Primacy**: When developing any feature, if Source C or Source D suggests a mechanism that contradicts Source A or Source B, Source A and Source B automatically supersede.
2. **Unresolved Gate Enforcement**: Any logic touching GATE-01 through GATE-07 must be developed with a complete schema and adapter interface, but deactivated via feature flags until formal sign-off.
3. **Audit Trail**: Any subsequent dispute or clarification from stakeholders must result in an update to this matrix and a corresponding ADR before code modification.
