# AlifWorld Scope Boundaries & Modular Domain Map

**Document Type**: Architectural Specification & Domain Boundary Definition  
**Phase Reference**: Phase 01 — Governance and Architecture  
**Milestone Reference**: [Milestone 003](../../AlifWorld-300-Milestones/003-scope-boundaries-and-modular-domain-map.md)  
**Architecture Model**: Single-Codebase Next.js Modular Monolith  
**Status**: Authoritative & Accepted  

---

## 1. Architectural Boundary Principles

To maintain strict modularity within a single deployable Next.js application, AlifWorld establishes 20 distinct **Bounded Contexts**. These contexts enforce Domain-Driven Design (DDD) principles:

```
+-----------------------------------------------------------------------------------+
|                            ALIFWORLD MONOLITH ROOT                                |
|                                                                                   |
|  [ Presentation Surfaces ]                                                        |
|   ├── app/(store)            --> Public Storefront & Localized SEO                |
|   ├── app/seller             --> Multi-Tenant Seller Operations Console           |
|   ├── app/admin              --> Platform Administration, Governance & Compliance |
|   └── app/api/v1             --> Versioned REST API for Web & Flutter Mobile      |
|                                                                                   |
|  [ Domain Modules (features/*, services/*) ]                                      |
|   ├── IAM & Security         ├── Catalog & Taxonomy       ├── Pricing & VAT       |
|   ├── Inventory & Stock      ├── Cart & Checkout          ├── Orders & RMA        |
|   ├── Payments & Gateway     ├── Double-Entry Ledger      ├── Points Engine       |
|   ├── Customer Rewards/Clubs ├── Seller Rewards/Clubs     ├── Regional Commission |
|   ├── Rider & Logistics      ├── Notifications & Outbox   ├── CMS & Support       |
|                                                                                   |
|  [ Persistence & Infrastructure (repositories/*, prisma/*, workers/*) ]           |
|   ├── PostgreSQL (Prisma)    ├── Redis Cache & Locks      ├── BullMQ Queues       |
|   └── S3 Object Storage      └── Meilisearch (+ Postgres Search Fallback)         |
+-----------------------------------------------------------------------------------+
```

### Core Modular Monolith Invariants:
1. **No Cross-Domain Direct Table Mutations**: Domain services must never write to Prisma tables owned by another domain. All state mutations cross boundaries via public Domain Service interfaces or asynchronous Outbox Events.
2. **Thin Route Handlers**: Route Handlers (`app/api/v1/*`) only validate HTTP requests using Zod, authenticate/authorize callers, invoke a single Domain Service, and serialize the response.
3. **Repository Encapsulation**: SQL queries and Prisma data access are strictly contained in `repositories/*`. Domain services never construct raw database queries.
4. **Pure Calculation Engines**: Sensitive pricing, commission, reward, and point calculations reside in pure, deterministic calculation modules with zero database or network side-effects.

---

## 2. Bounded Context Specifications

### 2.1 Identity, Authentication & Access Management (IAM)
- **Scope**: User account lifecycles, authentication, credential hashing, rotating refresh token families, Bangladesh phone normalization, SMS OTP, Google/Apple OAuth, role-based access control (RBAC), and session revocation.
- **Key Entities**: `User`, `UserCredential`, `Session`, `RefreshTokenFamily`, `Role`, `Permission`, `UserRoleAssignment`, `OtpRequest`.
- **States**: `ACTIVE`, `PENDING_VERIFICATION`, `SUSPENDED`, `DELETED`.
- **Invariants**:
  - Passwords hashed with argon2id / bcrypt.
  - Refresh tokens employ single-use rotating families with automatic reuse detection and revocation.
  - Bangladesh phone numbers strictly normalized to E.164 standard (`+8801XXXXXXXXX`).

### 2.2 Seller Management & Multi-Tenant KYC
- **Scope**: Seller registration, multi-step KYC submission (trade license, NID, bank check leaf), Admin verification workflow, public store profile, store settings, and staff delegation.
- **Key Entities**: `Seller`, `SellerKycDocument`, `SellerStoreProfile`, `SellerBankDetail`, `SellerStaff`.
- **States**: `DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`, `SUSPENDED`, `INACTIVE`.
- **Invariants**:
  - All seller data queries must enforce `seller_id` tenant scoping.
  - Unapproved sellers cannot publish products or accept orders.
  - KYC documents stored with signed private S3 URLs; never exposed publicly.

### 2.3 Catalog Taxonomy & Brand Authority
- **Scope**: Hierarchical categories, approved brand registries, attribute sets, variant option definitions, product drafts, versioned product edits, and catalog moderation.
- **Key Entities**: `Category`, `Brand`, `Attribute`, `AttributeValue`, `Product`, `ProductVariant`, `ProductMedia`.
- **States**: `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `PUBLISHED`, `ARCHIVED`.
- **Invariants**:
  - Every product must have an approved Category and Brand.
  - Every sellable product must define both a BDT price (poisha) and an explicit, seller-defined Product Point value.

### 2.4 Pricing, Discounts, VAT & Promotion Engine
- **Scope**: Server-side authoritative pricing calculations, compare-at prices, channel pricing, Bangladesh VAT rules, coupon lifecycles, and promotion stacking.
- **Key Entities**: `PriceSnapshot`, `TaxRule`, `DiscountRule`, `Coupon`, `CouponRedemption`.
- **Invariants**:
  - Currency calculations performed exclusively in 64-bit integer poisha (`1 BDT = 100 poisha`).
  - Tax and discounts are computed server-side; client-provided price totals are completely disregarded.
  - Historical order prices are immutable snapshots; price changes never alter placed orders.

### 2.5 Multi-Warehouse Inventory & Atomic Reservations
- **Scope**: Multi-location warehouse inventory, on-hand, reserved, available, damaged, and quarantine balances, atomic stock reservations, and stock movement ledgers.
- **Key Entities**: `Warehouse`, `InventoryItem`, `StockBalance`, `StockReservation`, `StockMovementLedger`.
- **States**: `AVAILABLE`, `RESERVED`, `COMMITTED`, `RELEASED`, `QUARANTINED`, `WRITTEN_OFF`.
- **Invariants**:
  - `Available = OnHand - Reserved - Damaged - Quarantined`.
  - Stock reservations are atomic, backed by Redis distributed locks or PostgreSQL row-level locks (`SELECT ... FOR UPDATE`).
  - Every stock delta writes an immutable entry to `StockMovementLedger`.

### 2.6 Search, Discovery & Fallback Engine
- **Scope**: Product indexing, typo-tolerant search, facet filtering, sorting, collection pages, and automatic PostgreSQL full-text search fallback during Meilisearch outages.
- **Key Entities**: `SearchIndexSyncJob`, `SearchSynonym`, `Collection`.
- **Invariants**:
  - Storefront search remains 100% operational via PostgreSQL fallback if Meilisearch becomes unavailable.
  - Index updates execute asynchronously via BullMQ workers triggered by catalog events.

### 2.7 Customer Experience, Carts & Engagement
- **Scope**: Customer profiles, address book (Bangladesh divisions, districts, upazilas), wishlists, product reviews with verified purchase badges, Q&A moderation, and carts.
- **Key Entities**: `CustomerProfile`, `CustomerAddress`, `Wishlist`, `ProductReview`, `ProductQuestion`, `Cart`, `CartItem`.
- **Invariants**:
  - Guest carts merge safely into customer carts upon authentication without duplicating items.
  - Cart line items revalidate price, stock availability, and seller eligibility prior to checkout transition.

### 2.8 Checkout Orchestration & Shipping Logistics
- **Scope**: Idempotent checkout sessions, multi-seller shipment grouping, delivery serviceability checks, Bangladesh courier adapters (Pathao, Steadfast, RedX, Paperfly, In-house), and COD limits.
- **Key Entities**: `CheckoutSession`, `ShipmentGroup`, `ShippingRate`, `CourierAdapterConfig`.
- **Invariants**:
  - Every checkout mutation requires an explicit `Idempotency-Key` header.
  - Multi-seller carts split automatically into distinct seller fulfillment shipment groups.
  - Cash on Delivery (COD) verifies fraud risk scoring and order value thresholds before acceptance.

### 2.9 Orders, Fulfillment & RMA Engine
- **Scope**: Parent customer orders, seller fulfillment sub-orders, state machines, pack/handover workflows, tracking numbers, customer cancellations, returns, inspections, and refunds.
- **Key Entities**: `Order`, `OrderItem`, `SellerFulfillmentOrder`, `Shipment`, `ReturnRequest`, `ReturnItem`, `RefundTransaction`.
- **Order State Machine**: `PLACED` -> `CONFIRMED` -> `PROCESSING` -> `HANDED_OVER` -> `IN_TRANSIT` -> `DELIVERED` -> `COMPLETED` (or `CANCELLED` / `RETURNED`).
- **Invariants**:
  - Parent order aggregates multiple seller fulfillment orders; cancellation and returns can execute at item or sub-order granularity.
  - Points and commissions are accrued only when the order reaches `COMPLETED` (post return window).

### 2.10 Payments, Gateway Integration & Seller Settlement
- **Scope**: Bangladesh payment gateway adapters (bKash, Nagad, Upay, COD, optional Stripe/Razorpay), payment intents, signed webhooks, capture recovery, and seller payout escrow.
- **Key Entities**: `PaymentIntent`, `PaymentAttempt`, `WebhookLog`, `SellerSettlementBatch`, `SellerPayout`.
- **Invariants**:
  - Webhooks enforce HMAC signature verification and replay prevention.
  - Seller funds are placed in escrow holds until fulfillment is confirmed and return eligibility expires.

### 2.11 Double-Entry Financial & Wallet Ledger
- **Scope**: Strict double-entry accounting ledger, typed wallet accounts, immutable transaction journal, balance projections, and maker-checker admin adjustments.
- **Key Entities**: `WalletAccount`, `LedgerTransaction`, `LedgerPosting`, `AdminAdjustmentRequest`.
- **Account Types**: `MAIN_WITHDRAWABLE`, `SHOPPING_RESTRICTED`, `CUSTOMER_CLUB_POOL`, `SELLER_CLUB_POOL`, `REFERRAL_RESERVE`, `CHARITY_FUND`, `PLATFORM_RESERVE`, `ESCROW`.
- **Invariants**:
  - `Sum(Debits) == Sum(Credits)` for every `LedgerTransaction`.
  - Account balances are derived projections of immutable postings.
  - Admin adjustments require two-party authorization (Maker-Checker).

### 2.12 Product Points Engine
- **Scope**: Mandatory seller-defined point management, order item snapshotting, non-convertible point accounting, event-driven point allocation, and point reversals.
- **Key Entities**: `ProductPointConfig`, `OrderItemPointSnapshot`, `PointEventLedger`.
- **Invariants**:
  - Points are independent of BDT price; no conversion rate exists.
  - Points accrue as `productPointSnapshot * eligibleQuantity`.
  - Reversals execute proportionally for returned line items.

### 2.13 Customer Loyalty, Star Clubs & Rank Bonuses
- **Scope**: Customer cashback (10% reference), direct referral bonus (5% reference), 50-20-15-5-10 reward splits, Customer Daily/Weekly/Monthly/Yearly Star Clubs, and 3% Customer Rank Bonus pool.
- **Key Entities**: `CustomerRewardConfig`, `CustomerClubCycle`, `CustomerClubSettlement`, `CustomerRankBonusPool`.
- **Invariants**:
  - Split allocations must balance to exactly 100% poisha.
  - Club settlements distribute equal shares of the accumulated pool to verified qualified members.

### 2.14 Seller Clubs, Levels & Leaderboards
- **Scope**: Seller sales/point ledgers, 70-15-5-10 reward splits, Seller Star Clubs, seller performance badges, and leaderboards.
- **Key Entities**: `SellerRewardConfig`, `SellerClubCycle`, `SellerClubSettlement`, `SellerLeaderboardEntry`.
- **Invariants**:
  - Seller reward splits require immutable versioned templates.
  - Club pools are funded from explicit debit accounts; deficits halt distribution runs safely.

### 2.15 Regional Distribution & Commissions
- **Scope**: Bangladesh administrative divisions, districts, upazilas, affiliated service points, commission distribution, and platform service charge accounting.
- **Key Entities**: `GeoHierarchy`, `ServicePointPartner`, `CommissionDistributionRule`, `CommissionPosting`.
- **Invariants**:
  - Commission rates: Division 0.5%, District 0.5%, Upazila 1.0%, Service Point 2.0%, Charity 1.0%, Service Charge 1.0%.
  - Residual poisha rounding remainders are credited to the platform reserve.

### 2.16 Lottery, Advertisement & Affiliate Network (Gated)
- **Scope**: Good-Luck lottery ticket purchases (GATE-07), ad view tracking, subscription packages (GATE-06), and multi-tier marketing referrals.
- **Key Entities**: `LotteryCampaign`, `LotteryTicket`, `AdCampaign`, `AdImpressionLog`, `SubscriptionPackage`.
- **Invariants**:
  - Strictly gated behind `FEATURE_LOTTERY_ENABLED=false` and `FEATURE_AFFILIATE_ENABLED=false`.
  - Packages use fixed BDT catalogue prices; no USD dynamic conversion.

### 2.17 Rider Onboarding & Delivery Logistics
- **Scope**: Rider registration, vehicle KYC, task dispatch, GPS location updates via Redis, OTP proof-of-delivery, and rider earnings.
- **Key Entities**: `RiderProfile`, `DeliveryTask`, `GpsCheckpoint`, `RiderEarning`.
- **Invariants**:
  - Handover requires customer OTP verification.
  - Rate-limited GPS ingestion through Redis prevents database write saturation.

### 2.18 Operations Console, Moderation & CMS
- **Scope**: Role-based Admin console, customer support tickets, disputes, CMS banners, homepage layout management, and KPI dashboards.
- **Key Entities**: `CmsSection`, `CmsBanner`, `SupportTicket`, `SupportNote`, `PlatformKpiSnapshot`.
- **Invariants**:
  - Support agents view redacted customer PII.
  - High-value operations require fresh authentication and explicit reason codes.

### 2.19 Background Jobs, Realtime Events & Outbox
- **Scope**: BullMQ queue topology, transactional outbox pattern, scheduled recurring jobs in `Asia/Dhaka`, notification delivery (Email, SMS, Push, WhatsApp), and audit logging.
- **Key Entities**: `OutboxEvent`, `NotificationQueueItem`, `AuditLogEntry`, `ScheduledJobRecord`.
- **Invariants**:
  - Events written atomically inside the primary database transaction via Outbox pattern.
  - Job processors are strictly idempotent using deterministic job identifiers.

### 2.20 Versioned REST Route Handlers (`/app/api/v1`)
- **Scope**: External and mobile API entrypoints, Zod payload validation, standard HTTP status codes, standard JSON envelopes, and generated OpenAPI specifications.
- **Envelopes**:
  - Success: `{ "success": true, "data": T, "pagination"?: P }`
  - Error: `{ "success": false, "error": { "code": string, "message": string, "details"?: unknown } }`
- **Invariants**:
  - Route Handlers contain zero business logic or SQL queries.
  - All contracts are 100% compatible with Flutter mobile clients.

---

## 3. Domain Interaction & Decoupling Matrix

| Triggering Domain | Interacting Domain | Interaction Type | Decoupling Mechanism |
|:---|:---|:---:|:---|
| **Checkout** | **Inventory** | Synchronous | `InventoryService.reserveStock()` with distributed lock |
| **Checkout** | **Payments** | Synchronous | `PaymentService.createIntent()` |
| **Orders** | **Points Engine** | Asynchronous | Outbox Event: `order.completed` -> BullMQ Point Worker |
| **Orders** | **Wallet Ledger** | Asynchronous | Outbox Event: `order.completed` -> BullMQ Settlement Worker |
| **Orders** | **Notifications** | Asynchronous | Outbox Event: `order.placed` -> BullMQ Notification Queue |
| **Catalog** | **Search Engine** | Asynchronous | Outbox Event: `product.published` -> BullMQ Indexer |
| **Rider** | **Orders** | Synchronous | `OrderService.confirmDeliveryWithOtp()` |
