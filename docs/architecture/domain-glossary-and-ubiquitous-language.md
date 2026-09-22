# AlifWorld Domain Glossary & Ubiquitous Language

**Document Type**: Architectural Specification & Terminology Authority  
**Phase Reference**: Phase 01 — Governance and Architecture  
**Milestone Reference**: [Milestone 005](../../AlifWorld-300-Milestones/005-domain-glossary-and-ubiquitous-language.md)  
**Locales**: `en-BD` (English), `bn-BD` (Bangla)  
**Status**: Authoritative & Mandatory  

---

## 1. Governance & Purpose of the Ubiquitous Language

To eliminate semantic drift between business requirements, database schemas, TypeScript interfaces, REST API contracts, and user-facing copy, this glossary establishes the **single source of truth for terminology** across AlifWorld. 

### Core Terminology Invariants:
1. **Zero Synonym Drift**: Do not use "Points", "Coins", "Credits", and "Tokens" interchangeably. Only **Product Points (PP)** is valid.
2. **Zero Currency Ambiguity**: Never use "Money", "Taka", "Amount", or "Cash" without specifying whether the unit is **BDT** or **Poisha**. In code and database columns, monetary amounts are always suffixed with `_poisha` or typed as `Poisha`.
3. **Bilingual Exactitude**: Every core domain term maps to an authoritative Bangla counterpart.

---

## 2. Core Financial, Currency & Ledger Glossary

| Canonical Term (Code/DB) | English Definition | Bangla Term (`bn-BD`) | Semantic Role & Units |
|:---|:---|:---|:---|
| **`BDT`** | The legal tender of Bangladesh (ISO 4217 code `BDT`). | **টাকা** (Taka) | Major currency denomination. 1 BDT = 100 Poisha. |
| **`Poisha`** | The integer minor unit of BDT (`1 BDT = 100 poisha`). | **পয়সা** (Poisha) | **Mandatory internal financial representation**. All database columns and API monetary primitives use integer poisha. |
| **`ProductPoint` (`PP`)** | Non-convertible loyalty metric defined independently by the seller on products. | **প্রোডাক্ট পয়েন্ট** (Product Point) | Discrete integer units. Independent from BDT; no exchange rate exists. |
| **`PointSnapshot`** | Immutable record of a product's price and Product Points at the exact time of order checkout. | **পয়েন্ট স্ন্যাপশট** | Prevents retrospective price/point modifications from affecting placed orders. |
| **`DoubleEntryLedger`** | Accounting system where every financial movement is balanced (`Sum(Debits) == Sum(Credits)`). | **দ্বৈত-দাখিলা লেজার** | Mandatory for all wallet transactions. Single-entry balance updates are forbidden. |
| **`LedgerPosting`** | An individual debit or credit entry linked to a specific wallet account and journal transaction. | **লেজার পোস্টিং** | Immutable, append-only posting row. |
| **`WalletAccount`** | A typed financial account holding balance projections for a user, seller, or system pool. | **ওয়ালেট অ্যাকাউন্ট** | Types: Main, Shopping, Customer Club, Seller Club, Referral, Charity, Platform Reserve, Escrow. |
| **`MakerChecker`** | Dual-authorization workflow where one admin initiates a transaction and a second admin approves it. | **মেকার-চেকার অনুমোদন** | Mandatory for manual financial adjustments above 100,000 poisha (BDT 1,000). |

---

## 3. Customer Rewards, Clubs & Rank Glossary

| Canonical Term (Code/DB) | English Definition | Bangla Term (`bn-BD`) | Semantic Role & Rules |
|:---|:---|:---|:---|
| **`CustomerCashback`** | Platform loyalty incentive credited to the customer based on eligible purchases (reference: 10%). | **গ্রাহক ক্যাশব্যাক** | Governed by versioned admin config. Credited upon order completion. |
| **`ReferralBonus`** | Direct commission credited to a customer for sponsoring a purchasing customer (reference: 5%). | **রেফারেল বোনাস** | Credited to direct sponsor's wallet upon order completion. |
| **`CustomerRewardSplit`** | 100% balanced allocation formula for customer rewards. Reference: 50% Main, 20% Shopping, 15% Club, 5% Referral, 10% Charity. | **গ্রাহক রিওয়ার্ড বিভাজন** | Versioned configuration template. All ledger distributions sum to 100%. |
| **`CustomerStarClub`** | Periodic revenue-sharing reward pool distributed equally among qualified customers. | **কাস্টমার স্টার ক্লাব** | 4 authoritative cycles: Daily Star, Weekly Star, Monthly Star, Yearly Star. |
| **`CustomerRankBonus`** | Performance pool (reference: 3%) distributed among qualified rank holders. | **গ্রাহক র‍্যাংক বোনাস** | Decoupled from non-cash physical marketing prizes. Governed by GATE-03. |
| **`CustomerCareerRank`** | Marketing tier based on lifetime volume and network achievements. | **কাস্টমার ক্যারিয়ার র‍্যাংক** | Levels: Star, Bronze, Silver, Gold, Platinum, Diamond, Crown, Ambassador. |

---

## 4. Seller Lifecycle, Catalog & Fulfillment Glossary

| Canonical Term (Code/DB) | English Definition | Bangla Term (`bn-BD`) | Semantic Role & Rules |
|:---|:---|:---|:---|
| **`Seller`** | Independent merchant registered on the platform. Multi-tenant boundary. | **বিক্রেতা / সেলার** | Root tenant identifier (`seller_id`). Enforced on all catalog and inventory records. |
| **`SellerKyc`** | Know-Your-Customer verification process requiring Trade License, NID, and Bank details. | **সেলার কেওয়াইসি** | Required prior to publishing products or receiving payouts. |
| **`SellerRewardSplit`** | Balanced allocation formula for seller earnings. Reference: 70% Main, 15% Club, 5% Reserve, 10% Growth Fund. | **সেলার রিওয়ার্ড বিভাজন** | Versioned configuration template totaling 100%. |
| **`SellerStarClub`** | Periodic reward pool distributed equally among top-performing sellers. | **সেলার স্টার ক্লাব** | 4 authoritative cycles: Daily, Weekly, Monthly, Yearly. |
| **`ParentOrder`** | The top-level customer order representing the entire checkout transaction. | **মূল অর্ডার** | Aggregates one or more Seller Fulfillment Orders. |
| **`SellerFulfillmentOrder`** | A sub-order containing items sold and fulfilled by a single specific seller. | **সেলার ডেলিভারি সাব-অর্ডার** | Operates an independent fulfillment state machine (`PACKED`, `HANDED_OVER`). |
| **`RMA` (`ReturnMerchandiseAuthorization`)** | Formal process governing item returns, quality inspection, and refunds. | **পণ্য ফেরত অনুমোদন (আরএমএ)** | States: Requested, Authorized, Inspected, Accepted, Restocked/Quarantined, Refunded. |

---

## 5. Regional Distribution & Logistics Glossary

| Canonical Term (Code/DB) | English Definition | Bangla Term (`bn-BD`) | Semantic Role & Rules |
|:---|:---|:---|:---|
| **`DivisionPartner`** | Regional beneficiary for an administrative division of Bangladesh (0.5% commission). | **বিভাগীয় পার্টনার** | Highest tier in geographic commission hierarchy. |
| **`DistrictPartner`** | Regional beneficiary for a district (Zila) of Bangladesh (0.5% commission). | **জেলা পার্টনার** | Second tier in geographic commission hierarchy. |
| **`UpazilaPartner`** | Regional beneficiary for an upazila/sub-district of Bangladesh (1.0% commission). | **উপজেলা পার্টনার** | Third tier in geographic commission hierarchy. |
| **`ServicePoint`** | Affiliated local merchant / pick-up point partner (2.0% commission). | **সার্ভিস পয়েন্ট** | Local service hub handling customer assistance and pickups. |
| **`CharityFund`** | Platform fund allocated for social welfare and disaster relief (1.0% contribution). | **চ্যারিটি ফান্ড** | Segregated ledger account credited from platform margin. |
| **`ServiceCharge`** | Platform operational service levy (1.0%). | **সার্ভিস চার্জ** | Platform operational maintenance ledger account. |
| **`Rider`** | On-demand delivery courier handling last-mile package delivery. | **রাইডার** | Performs delivery verification using customer OTP. |
| **`ProofOfDelivery` (`POD`)** | Cryptographic or OTP verification confirming package receipt by customer. | **ডেলিভারির প্রমাণপত্র** | Handover complete only after matching 4-digit SMS OTP. |

---

## 6. Gated Capabilities & Ambiguity Boundaries

| Canonical Term (Code/DB) | English Definition | Bangla Term (`bn-BD`) | Governance Gate |
|:---|:---|:---|:---:|
| **`AdvancedShoppingWallet`** | Term-deposit shopping wallet offering returns on committed funds. | **অ্যাডভান্সড শপিং ওয়ালেট** | **GATE-05** (`FEATURE_ADVANCED_SHOPPING_ENABLED=false`) |
| **`GoodLuckLottery`** | Weekly promotional lottery ticket draw system funded by Good-Luck wallet. | **গুড-লাক লটারি** | **GATE-07** (`FEATURE_LOTTERY_ENABLED=false`) |
| **`SubscriptionPackage`** | Fixed-tier advertising and service access package. | **সাবস্ক্রিপশন প্যাকেজ** | **GATE-06** (Must use fixed BDT catalogue; no USD conversion) |
| **`EligibleOrderStatus`** | The explicit order state at which points and commissions legally mature. | **পয়েন্ট প্রাপ্তির উপযুক্ত অর্ডার স্ট্যাটাস** | **GATE-01** (Default: Return window expired) |

---

## 7. Standardized Code Enums & Identifiers

```typescript
// Canonical Wallet Account Types
export enum WalletAccountType {
  MAIN_WITHDRAWABLE = 'MAIN_WITHDRAWABLE',
  SHOPPING_RESTRICTED = 'SHOPPING_RESTRICTED',
  CUSTOMER_CLUB_POOL = 'CUSTOMER_CLUB_POOL',
  SELLER_CLUB_POOL = 'SELLER_CLUB_POOL',
  REFERRAL_RESERVE = 'REFERRAL_RESERVE',
  CHARITY_FUND = 'CHARITY_FUND',
  PLATFORM_RESERVE = 'PLATFORM_RESERVE',
  ESCROW = 'ESCROW',
  ADVANCED_SHOPPING = 'ADVANCED_SHOPPING', // Gated
  GOOD_LUCK_LOTTERY = 'GOOD_LUCK_LOTTERY', // Gated
}

// Canonical Club Period Cadence
export enum ClubPeriodCadence {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

// Canonical Order Lifecycle States
export enum OrderStatus {
  PLACED = 'PLACED',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  PACKED = 'PACKED',
  HANDED_OVER = 'HANDED_OVER',
  IN_TRANSIT = 'IN_TRANSIT',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  COMPLETED = 'COMPLETED', // Return window expired -> Triggers points & commissions
  CANCELLED = 'CANCELLED',
  RETURN_REQUESTED = 'RETURN_REQUESTED',
  RETURNED = 'RETURNED',
}
```
