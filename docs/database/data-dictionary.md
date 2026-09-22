# AlifWorld Production PostgreSQL Data Dictionary

**Authoritative Specification**: Phase 03 - Data Architecture  
**Database**: PostgreSQL 16 (Managed AWS Aurora / RDS compatible)  
**ORM**: Prisma 5.20+ with raw connection poolers  
**Monetary Precision**: Integer minor units (poisha, where $1\text{ BDT} = 100\text{ poisha}$)  
**Total Canonical Models**: 49 Models  
**Reference Invariants**: ADR-0003, ADR-0022, ADR-0027, ADR-0028, ADR-0029, ADR-0030  

---

## 1. Overview & Deletion Policy Taxonomy

AlifWorld classifies all 49 relational tables into three strict lifecycle deletion categories:

| Deletion Policy | Description | Audit Strategy |
|---|---|---|
| **IMMUTABLE** | Append-only financial ledgers, audit logs, order snapshots, and payments. Updates and deletions (hard or soft) are strictly forbidden at the database and application boundary. | Compensating reversal entries (e.g. `reversalOfId`) |
| **SOFT_DELETE** | Core master domain entities (users, sellers, categories, products, orders). Never physically deleted; tracked via `deletedAt` and `deletedBy` timestamps. | Optimistic concurrency (`version`) + Tombstones |
| **EPHEMERAL** | Operational probes, telemetry, auth OTP tokens, and temporary cache sessions. Purged via automated TTL background tasks. | Scheduled retention sweeps |

---

## 2. Model & Table Summary Index

| # | Model Name | Database Table | Lifecycle Policy | Domain Module |
|---|---|---|---|---|
| 1 | `SystemConfig` | `system_configs` | **SOFT_DELETE** | 1. System, Observability & Auditing |
| 2 | `HealthProbe` | `health_probes` | **EPHEMERAL** | 1. System, Observability & Auditing |
| 3 | `OutboxEvent` | `outbox_events` | **IMMUTABLE** | 1. System, Observability & Auditing |
| 4 | `AuditLog` | `audit_logs` | **IMMUTABLE** | 1. System, Observability & Auditing |
| 5 | `User` | `users` | **SOFT_DELETE** | 2. IAM & Authentication |
| 6 | `Role` | `roles` | **SOFT_DELETE** | 2. IAM & Authentication |
| 7 | `Permission` | `permissions` | **SOFT_DELETE** | 2. IAM & Authentication |
| 8 | `UserRoleAssignment` | `user_role_assignments` | **SOFT_DELETE** | 2. IAM & Authentication |
| 9 | `RolePermission` | `role_permissions` | **SOFT_DELETE** | 2. IAM & Authentication |
| 10 | `Seller` | `sellers` | **SOFT_DELETE** | 3. Multi-Tenant Seller & Governance |
| 11 | `SellerStaff` | `seller_staff` | **SOFT_DELETE** | 3. Multi-Tenant Seller & Governance |
| 12 | `SellerKycDocument` | `seller_kyc_documents` | **SOFT_DELETE** | 3. Multi-Tenant Seller & Governance |
| 13 | `SellerStoreSettings` | `seller_store_settings` | **SOFT_DELETE** | 3. Multi-Tenant Seller & Governance |
| 14 | `Category` | `categories` | **SOFT_DELETE** | 4. Product Catalog & Taxonomy |
| 15 | `Brand` | `brands` | **SOFT_DELETE** | 4. Product Catalog & Taxonomy |
| 16 | `Product` | `products` | **SOFT_DELETE** | 4. Product Catalog & Taxonomy |
| 17 | `ProductVariant` | `product_variants` | **SOFT_DELETE** | 4. Product Catalog & Taxonomy |
| 18 | `ProductMedia` | `product_media` | **SOFT_DELETE** | 4. Product Catalog & Taxonomy |
| 19 | `ProductSlugHistory` | `product_slug_histories` | **IMMUTABLE** | 4. Product Catalog & Taxonomy |
| 20 | `Warehouse` | `warehouses` | **SOFT_DELETE** | 5. Warehousing, Stock & Inventory |
| 21 | `StockBalance` | `stock_balances` | **SOFT_DELETE** | 5. Warehousing, Stock & Inventory |
| 22 | `StockReservation` | `stock_reservations` | **SOFT_DELETE** | 5. Warehousing, Stock & Inventory |
| 23 | `StockMovementLedger` | `stock_movement_ledger` | **IMMUTABLE** | 5. Warehousing, Stock & Inventory |
| 24 | `Cart` | `carts` | **SOFT_DELETE** | 6. Carts, Orders, Fulfillment & Logistics |
| 25 | `CartItem` | `cart_items` | **SOFT_DELETE** | 6. Carts, Orders, Fulfillment & Logistics |
| 26 | `Order` | `orders` | **SOFT_DELETE** | 6. Carts, Orders, Fulfillment & Logistics |
| 27 | `SellerFulfillmentGroup` | `seller_fulfillment_groups` | **SOFT_DELETE** | 6. Carts, Orders, Fulfillment & Logistics |
| 28 | `OrderItem` | `order_items` | **SOFT_DELETE** | 6. Carts, Orders, Fulfillment & Logistics |
| 29 | `OrderStatusHistory` | `order_status_history` | **IMMUTABLE** | 6. Carts, Orders, Fulfillment & Logistics |
| 30 | `Shipment` | `shipments` | **SOFT_DELETE** | 6. Carts, Orders, Fulfillment & Logistics |
| 31 | `ShipmentEvent` | `shipment_events` | **IMMUTABLE** | 6. Carts, Orders, Fulfillment & Logistics |
| 32 | `Payment` | `payments` | **IMMUTABLE** | 7. Customer Payments & Gateway Inflows |
| 33 | `Refund` | `refunds` | **IMMUTABLE** | 7. Customer Payments & Gateway Inflows |
| 34 | `RefundItem` | `refund_items` | **IMMUTABLE** | 7. Customer Payments & Gateway Inflows |
| 35 | `CommissionLedger` | `commission_ledger` | **IMMUTABLE** | 7. Customer Payments & Gateway Inflows |
| 36 | `SellerSettlement` | `seller_settlements` | **SOFT_DELETE** | 7. Customer Payments & Gateway Inflows |
| 37 | `SellerPayout` | `seller_payouts` | **IMMUTABLE** | 7. Customer Payments & Gateway Inflows |
| 38 | `PaymentWebhookLog` | `payment_webhook_logs` | **IMMUTABLE** | 7. Customer Payments & Gateway Inflows |
| 39 | `Wallet` | `wallets` | **SOFT_DELETE** | 8. Wallets, Ledgers, Points & Ranks |
| 40 | `LedgerAccount` | `ledger_accounts` | **SOFT_DELETE** | 8. Wallets, Ledgers, Points & Ranks |
| 41 | `LedgerJournal` | `ledger_journals` | **IMMUTABLE** | 8. Wallets, Ledgers, Points & Ranks |
| 42 | `LedgerPosting` | `ledger_postings` | **IMMUTABLE** | 8. Wallets, Ledgers, Points & Ranks |
| 43 | `PointAccount` | `point_accounts` | **SOFT_DELETE** | 8. Wallets, Ledgers, Points & Ranks |
| 44 | `PointEvent` | `point_events` | **IMMUTABLE** | 8. Wallets, Ledgers, Points & Ranks |
| 45 | `RewardRule` | `reward_rules` | **SOFT_DELETE** | 8. Wallets, Ledgers, Points & Ranks |
| 46 | `RewardAllocation` | `reward_allocations` | **IMMUTABLE** | 8. Wallets, Ledgers, Points & Ranks |
| 47 | `RankDefinition` | `rank_definitions` | **SOFT_DELETE** | 8. Wallets, Ledgers, Points & Ranks |
| 48 | `UserRank` | `user_ranks` | **SOFT_DELETE** | 8. Wallets, Ledgers, Points & Ranks |
| 49 | `LeaderboardSnapshot` | `leaderboard_snapshots` | **IMMUTABLE** | 8. Wallets, Ledgers, Points & Ranks |

---

## 3. Detailed Module Specifications

### Module 1: System, Observability & Auditing
- **`SystemConfig` (`system_configs`)**: Administrative system flags, public/private configuration, and versioned rules. Primary key UUID (`cfg_...`).
- **`HealthProbe` (`health_probes`)**: Ephemeral readiness and operational probes. 30-day TTL purge.
- **`OutboxEvent` (`outbox_events`)**: Transactional outbox guaranteeing at-least-once message delivery to BullMQ/Redis. Immutable.
- **`AuditLog` (`audit_logs`)**: Security and IAM audit logs capturing actor, action, diffs, and IP metadata. Immutable.

### Module 2: IAM & Authentication
- **`User` (`users`)**: Central user identity. Email and phone unique constraints. Soft-deletable.
- **`Role` (`roles`)**: RBAC roles (`SUPER_ADMIN`, `ADMIN`, `OPERATIONS`, `SUPPORT`, `FINANCE`, `SELLER_OWNER`, `SELLER_STAFF`, `CUSTOMER`, `RIDER`).
- **`Permission` (`permissions`)**: Fine-grained authorization permissions (e.g. `orders:read`, `sellers:verify`).
- **`UserRoleAssignment` (`user_role_assignments`)**: User-to-role mappings with granter audit history.
- **`RolePermission` (`role_permissions`)**: Role-to-permission mapping matrices.

### Module 3: Multi-Tenant Seller & Governance
- **`Seller` (`sellers`)**: Multi-vendor merchant store profile. Tracks BIN, TIN, trade license, and verification workflow. Soft-deletable.
- **`SellerStaff` (`seller_staff`)**: Delegated store staff members operating strictly within the seller tenant boundary.
- **`SellerKycDocument` (`seller_kyc_documents`)**: Trade license, BIN certificate, and national ID document verification records.
- **`SellerStoreSettings` (`seller_store_settings`)**: Store operational configuration (shipping preferences, return policies).

### Module 4: Product Catalog & Taxonomy
- **`Category` (`categories`)**: Nested category taxonomy (Adjacency list with `parentId`).
- **`Brand` (`brands`)**: Verified brand records.
- **`Product` (`products`)**: Parent product specification. Contains slug, status (`DRAFT`, `PUBLISHED`, `ARCHIVED`), and VAT tax rate.
- **`ProductVariant` (`product_variants`)**: Purchaseable SKUs with integer price in poisha and discrete Product Points token snapshot.
- **`ProductMedia` (`product_media`)**: Gallery images and video metadata.
- **`ProductSlugHistory` (`product_slug_histories`)**: Immutable 301 SEO redirect tracking for slug modifications.

### Module 5: Warehousing, Stock & Inventory
- **`Warehouse` (`warehouses`)**: Merchant and platform distribution facilities across 8 Bangladesh administrative divisions.
- **`StockBalance` (`stock_balances`)**: Real-time on-hand, reserved, and available quantities per SKU.
- **`StockReservation` (`stock_reservations`)**: Time-limited cart checkout reservation locks (15-minute TTL).
- **`StockMovementLedger` (`stock_movement_ledger`)**: Immutable double-entry inventory ledger tracking every stock mutation with balance snapshot.

### Module 6: Carts, Orders, Multi-Vendor Fulfillment & Logistics
- **`Cart` (`carts`)**: Customer active and abandoned shopping carts.
- **`CartItem` (`cart_items`)**: Line items in active shopping carts with price and point snapshots.
- **`Order` (`orders`)**: Unified customer parent order recording gross transaction totals in integer poisha and Product Points snapshot.
- **`SellerFulfillmentGroup` (`seller_fulfillment_groups`)**: Vendor-scoped fulfillment partition ensuring tenant isolation. Stores merchant subtotal, shipping fee, tax, 5% platform commission, net merchant payout, and courier tracking numbers.
- **`OrderItem` (`order_items`)**: Line item snapshot freezing purchased title, variant, SKU, unit price in poisha, NBR VAT rate, and discrete Product Points snapshot.
- **`OrderStatusHistory` (`order_status_history`)**: Append-only, immutable audit trail recording every state transition.
- **`Shipment` (`shipments`)**: Physical parcel dispatched via third-party courier (Pathao, Steadfast).
- **`ShipmentEvent` (`shipment_events`)**: Append-only chronological timeline of parcel transit events.

### Module 7: Customer Payments, Gateway Inflows & Webhooks
- **`Payment` (`payments`)**: Inward customer payment captured via digital gateway (bKash, Nagad) or Cash on Delivery. Stores `amountPoisha` and `feePoisha` as `BigInt`. Immutable.
- **`Refund` (`refunds`)**: Customer refund transaction tracking approved amounts, gateway refund identifiers, and net seller deductions. Immutable.
- **`RefundItem` (`refund_items`)**: Itemized breakdown of returned units, refunded poisha, reversed VAT, and returned discrete Product Points. Immutable.
- **`CommissionLedger` (`commission_ledger`)**: Platform commission ledger tracking gross basis amount, basis points rate ($500\text{ bps} = 5.00\%$), rule version (`v1.0.0`), and signed negative reversal links (`reversalOfId`). Immutable.
- **`SellerSettlement` (`seller_settlements`)**: Periodic settlement statement batch aggregating delivered merchant groups, shipping fees, tax, platform commissions, and refund deductions into a net payout. Soft-deletable.
- **`SellerPayout` (`seller_payouts`)**: Physical electronic funds transfer (BEFTN, RTGS, bKash) disbursing net settled funds to verified merchant commercial bank accounts. Immutable.
- **`PaymentWebhookLog` (`payment_webhook_logs`)**: Gateway webhook ingestion log storing raw payloads, provider HMAC SHA-256 signatures, verification status, and replay deduplication (`externalEventId`). Immutable.

### Module 8: Multi-Account Wallets, Double-Entry Ledgers, Product Points & Ranks
- **`Wallet` (`wallets`)**: Segregated customer and merchant wallets (`MAIN`, `SHOPPING`, `GOOD_LUCK`, `CHARITY`, `SYSTEM_RESERVE`) with integer poisha available and pending balances.
- **`LedgerAccount` (`ledger_accounts`)**: Chart of accounts for double-entry bookkeeping (`ASSET`, `LIABILITY`, `EQUITY`, `REVENUE`, `EXPENSE`).
- **`LedgerJournal` (`ledger_journals`)**: Immutable journal transaction header strictly enforcing $\sum \text{Debits} == \sum \text{Credits}$ with reversal linkage (`reversalOfId`). Immutable.
- **`LedgerPosting` (`ledger_postings`)**: Immutable debit or credit postings in a journal.
- **`PointAccount` (`point_accounts`)**: Dedicated loyalty token account for customers with available and pending (escrow) points.
- **`PointEvent` (`point_events`)**: Immutable event stream recording points earned, released, reversed on refund, or awarded.
- **`RewardRule` (`reward_rules`)**: Versioned reward and commission split rules with 100% split JSON schema validation.
- **`RewardAllocation` (`reward_allocations`)**: Immutable calculation snapshot of reward distributions across customer/seller wallets.
- **`RankDefinition` (`rank_definitions`)**: Customer Club, Customer Star, Seller Club, and Seller Star tier bands with qualification thresholds and period pool shares.
- **`UserRank` (`user_ranks`)**: User and seller rank achievements and qualifications per period.
- **`LeaderboardSnapshot` (`leaderboard_snapshots`)**: Immutable periodic leaderboard snapshots.

---

## 4. Expand-and-Contract Migration Workflow

To support zero-downtime deployments under high concurrent traffic, AlifWorld strictly enforces the **Expand-and-Contract (Parallel Run)** database migration pattern:

1. **Phase 1: Expand (Additive Migration)**
   - Add new columns as optional (`nullable`) or with safe default values.
   - Deploy code that dual-writes to both legacy and new structures.
2. **Phase 2: Backfill**
   - Run asynchronous batch backfill jobs to populate historical rows.
3. **Phase 3: Contract (Subtractive Migration)**
   - Make new columns non-nullable.
   - Remove legacy column reads from application code.
   - Drop deprecated columns in a scheduled maintenance window.

---

## 5. Rollback & Forward-Fix Playbook

- **Standard Procedure: Forward-Fix**: For non-destructive schema anomalies, author and deploy a new timestamped migration (`migration.sql`).
- **Emergency Rollback**: If a deployment fails before code cutover, re-apply the previous migration snapshot using an idempotent migration script.
- **Strict Prohibition**: Never run `prisma migrate reset` in staging or production environments.
