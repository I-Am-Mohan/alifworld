# AlifWorld Production PostgreSQL Data Dictionary

**Authoritative Specification**: Phase 03 - Data Architecture  
**Database**: PostgreSQL 16 (Managed AWS Aurora / RDS compatible)  
**ORM**: Prisma 5.20+ with raw connection poolers  
**Monetary Precision**: Integer minor units (poisha, where $1\text{ BDT} = 100\text{ poisha}$)  
**Total Canonical Models**: 52 Models  
**Reference Invariants**: ADR-0003, ADR-0022, ADR-0027, ADR-0028, ADR-0029, ADR-0030  

---

## 1. Overview & Deletion Policy Taxonomy

AlifWorld classifies all relational tables into three strict lifecycle deletion categories:

| Deletion Policy | Description | Audit Strategy |
|---|---|---|
| **IMMUTABLE** | Append-only financial ledgers, audit logs, order snapshots, and payments. Updates and deletions (hard or soft) are strictly forbidden at the database and application boundary. | Compensating reversal entries (e.g. `reversalOfId`) |
| **SOFT_DELETE** | Core master domain entities (users, sellers, categories, products, orders). Never physically deleted; tracked via `deletedAt` and `deletedBy` timestamps. | Optimistic concurrency (`version`) + Tombstones |
| **EPHEMERAL** | Operational probes, telemetry, auth OTP tokens, and temporary cache sessions. Purged via automated TTL background tasks. | Scheduled retention sweeps |

---

## 2. Model & Table Summary Index

| # | Model Name | Database Table | Lifecycle Policy | Primary Entity Purpose |
|---|---|---|---|---|
| 1 | `SystemConfig` | `system_configs` | **SOFT_DELETE** | Platform configuration parameters, financial rule versions, and feature toggles |
| 2 | `HealthProbe` | `health_probes` | **EPHEMERAL** | Readiness and operational probe logs for system health monitoring (TTL ephemeral) |
| 3 | `OutboxEvent` | `outbox_events` | **IMMUTABLE** | Guarantees at-least-once asynchronous domain event processing via BullMQ |
| 4 | `AuditLog` | `audit_logs` | **IMMUTABLE** | Security and compliance audit log for sensitive operations and state changes |
| 5 | `User` | `users` | **SOFT_DELETE** | Core user account representing customers, sellers, admins, operations, and riders |
| 6 | `Role` | `roles` | **SOFT_DELETE** | RBAC roles determining functional capabilities and access tiers across the platform |
| 7 | `Permission` | `permissions` | **SOFT_DELETE** | Atomic authorization permission grants mapped to bounded contexts and operations |
| 8 | `RolePermission` | `role_permissions` | **SOFT_DELETE** | Associates roles with their granular permissions |
| 9 | `UserRoleAssignment` | `user_role_assignments` | **SOFT_DELETE** | Assigns roles to users with optional multi-tenant seller scoping |
| 10 | `Seller` | `sellers` | **SOFT_DELETE** | Registered merchant entity operating a storefront within the AlifWorld ecosystem |
| 11 | `SellerStaff` | `seller_staff` | **SOFT_DELETE** | Delegated staff members operating within an isolated seller tenant boundary |
| 12 | `SellerKycDocument` | `seller_kyc_documents` | **SOFT_DELETE** | Cryptographically protected and audited KYC regulatory verification documents |
| 13 | `SellerStoreSettings` | `seller_store_settings` | **SOFT_DELETE** | Physical store profile, pickup/return logistics addresses, and courier routing |
| 14 | `Category` | `categories` | **SOFT_DELETE** | Hierarchical category tree with self-referencing parent/child relations and NBR VAT rules |
| 15 | `Brand` | `brands` | **SOFT_DELETE** | Approved brand registry for catalog categorization and trademark compliance |
| 16 | `Product` | `products` | **SOFT_DELETE** | Merchant products with strict BDT integer poisha pricing and independent Product Points |
| 17 | `ProductVariant` | `product_variants` | **SOFT_DELETE** | Sellable inventory variants (e.g. Color, Size, Storage) with SKU and pricing |
| 18 | `ProductMedia` | `product_media` | **SOFT_DELETE** | Visual assets (images, videos) associated with products and variants |
| 19 | `ProductSlugHistory` | `product_slug_history` | **IMMUTABLE** | Preserves SEO redirects and permalinks when product slugs are updated |
| 20 | `Warehouse` | `warehouses` | **SOFT_DELETE** | Platform fulfillment centers and merchant warehouse facilities across Bangladesh |
| 21 | `StockBalance` | `stock_balances` | **SOFT_DELETE** | Physical on-hand, reserved, damaged, and quarantined stock balances per warehouse/variant |
| 22 | `StockReservation` | `stock_reservations` | **SOFT_DELETE** | Time-limited atomic stock reservations during buyer checkout with deterministic expiry |
| 23 | `StockMovementLedger` | `stock_movement_ledger` | **IMMUTABLE** | Append-only audit trail recording every inventory balance adjustment and reservation |
| 24 | `Cart` | `carts` | **SOFT_DELETE** | Active or abandoned customer shopping cart and checkout session |
| 25 | `CartItem` | `cart_items` | **SOFT_DELETE** | Line items stored inside an active shopping cart with variant and pricing snapshots |
| 26 | `Order` | `orders` | **SOFT_DELETE** | Customer parent order consolidating multi-vendor purchases into a unified checkout |
| 27 | `SellerFulfillmentGroup` | `seller_fulfillment_groups` | **SOFT_DELETE** | Merchant-scoped fulfillment partition ensuring tenant isolation (merchants see only their group) |
| 28 | `OrderItem` | `order_items` | **SOFT_DELETE** | Line item snapshot freezing purchased product, variant, pricing, and independent Product Points |
| 29 | `OrderStatusHistory` | `order_status_history` | **IMMUTABLE** | Immutable chronological log tracking every parent order state transition |
| 30 | `Shipment` | `shipments` | **SOFT_DELETE** | Physical parcel package dispatched via courier service (Pathao, Steadfast, etc.) |
| 31 | `ShipmentEvent` | `shipment_events` | **IMMUTABLE** | Immutable chronological tracking event timeline for a shipment package |
| 32 | `Payment` | `payments` | **IMMUTABLE** | Inward customer payment transaction executed through digital gateway or COD |
| 33 | `Refund` | `refunds` | **IMMUTABLE** | Full or partial refund with item-level tracking and automatic ledger reversals |
| 34 | `RefundItem` | `refund_items` | **IMMUTABLE** | Itemized breakdown of returned units, refund amount, and reversed Product Points |
| 35 | `CommissionLedger` | `commission_ledger` | **IMMUTABLE** | Immutable financial ledger tracking platform commissions, rule versions, and reversals |
| 36 | `SellerSettlement` | `seller_settlements` | **SOFT_DELETE** | Periodic settlement statement batch aggregating seller fulfilled orders, commissions, and adjustments |
| 37 | `SellerPayout` | `seller_payouts` | **IMMUTABLE** | Physical electronic funds transfer (BEFTN, RTGS, bKash) disbursing net settled funds to merchant |
| 38 | `PaymentWebhookLog` | `payment_webhook_logs` | **IMMUTABLE** | Idempotent webhook event log storing raw payloads, provider signatures, and replay deduplication |
| 39 | `Wallet` | `wallets` | **SOFT_DELETE** | Segregated balance wallets for customers and sellers with explicit holds |
| 40 | `LedgerAccount` | `ledger_accounts` | **SOFT_DELETE** | Formal chart of accounts defining double-entry asset, liability, equity, revenue, and expense categories |
| 41 | `LedgerJournal` | `ledger_journals` | **IMMUTABLE** | Atomic, balanced financial transaction header strictly conserving Sum(Debits) == Sum(Credits) |
| 42 | `LedgerPosting` | `ledger_postings` | **IMMUTABLE** | Atomic debit or credit posting against a chart of account and optional wallet |
| 43 | `PointAccount` | `point_accounts` | **SOFT_DELETE** | Dedicated loyalty Product Point balance strictly isolated from BDT fiat balances |
| 44 | `PointEvent` | `point_events` | **IMMUTABLE** | Append-only chronological stream of loyalty token adjustments (earn, release, refund clawback) |
| 45 | `RewardRule` | `reward_rules` | **SOFT_DELETE** | Versioned administrative split configuration with mandatory 100% basis point sum invariant |
| 46 | `RewardAllocation` | `reward_allocations` | **IMMUTABLE** | Verifiable calculation snapshot recording reward distributions linked to double-entry journals |
| 47 | `RankDefinition` | `rank_definitions` | **SOFT_DELETE** | Recognition tier and star band definitions with qualification thresholds and pool shares |
| 48 | `UserRank` | `user_ranks` | **SOFT_DELETE** | Chronological log of achieved ranks per evaluation period |
| 49 | `LeaderboardSnapshot` | `leaderboard_snapshots` | **IMMUTABLE** | Historical competitive ranking leaderboard snapshots for daily, weekly, monthly, and yearly awards |
| 50 | `UserSession` | `user_sessions` | **EPHEMERAL** | Active authentication sessions, device metadata, and refresh token tracking |
| 51 | `OtpToken` | `otp_tokens` | **EPHEMERAL** | One-time verification tokens for email confirmation, phone SMS OTP, and 2FA |
| 52 | `OAuthAccount` | `oauth_accounts` | **SOFT_DELETE** | Federated identity mappings for third-party providers (Google, Facebook, Apple) |

---

## 3. Comprehensive Entity & Attribute Dictionary

### SystemConfig (`system_configs`)

**Purpose**: Platform configuration parameters, financial rule versions, and feature toggles  
**Lifecycle Deletion Policy**: `SOFT_DELETE`  

| Column Name | Type | Nullable | Default | Constraints & Relations |
|---|---|---|---|---|
| `id` | `String` | No | `uuid(` | PRIMARY KEY |
| `key` | `String` | No | - | UNIQUE |
| `value` | `String` | No | - | - |
| `description` | `String` | Yes | - | - |
| `isPublic` | `Boolean` | No | `false` | - |
| `version` | `Int` | No | `1` | - |
| `updatedBy` | `String` | Yes | - | - |
| `deletedAt` | `DateTime` | Yes | - | - |
| `deletedBy` | `String` | Yes | - | - |
| `createdAt` | `DateTime` | No | `now(` | - |
| `updatedAt` | `DateTime` | No | - | - |

**Indexes & Constraints**:
- Index: `@@index([deletedAt])`

---

### HealthProbe (`health_probes`)

**Purpose**: Readiness and operational probe logs for system health monitoring (TTL ephemeral)  
**Lifecycle Deletion Policy**: `EPHEMERAL`  

| Column Name | Type | Nullable | Default | Constraints & Relations |
|---|---|---|---|---|
| `id` | `String` | No | `uuid(` | PRIMARY KEY |
| `probeType` | `String` | No | - | - |
| `status` | `String` | No | - | - |
| `latencyMs` | `Int` | No | - | - |
| `metadata` | `Json` | Yes | - | - |
| `createdAt` | `DateTime` | No | `now(` | - |

**Indexes & Constraints**:
- Index: `@@index([probeType, createdAt])`
- Index: `@@index([createdAt])`

---

### OutboxEvent (`outbox_events`)

**Purpose**: Guarantees at-least-once asynchronous domain event processing via BullMQ  
**Lifecycle Deletion Policy**: `IMMUTABLE`  

| Column Name | Type | Nullable | Default | Constraints & Relations |
|---|---|---|---|---|
| `id` | `String` | No | `uuid(` | PRIMARY KEY |
| `eventType` | `String` | No | - | - |
| `aggregateType` | `String` | No | - | - |
| `aggregateId` | `String` | No | - | - |
| `payload` | `Json` | No | - | - |
| `status` | `String` | No | `"PENDING"` | - |
| `attempts` | `Int` | No | `0` | - |
| `version` | `Int` | No | `1` | - |
| `lastError` | `String` | Yes | - | - |
| `processedAt` | `DateTime` | Yes | - | - |
| `createdAt` | `DateTime` | No | `now(` | - |
| `updatedAt` | `DateTime` | No | - | - |

**Indexes & Constraints**:
- Index: `@@index([status, createdAt])`
- Index: `@@index([aggregateType, aggregateId])`
- Index: `@@index([processedAt])`

---

### AuditLog (`audit_logs`)

**Purpose**: Security and compliance audit log for sensitive operations and state changes  
**Lifecycle Deletion Policy**: `IMMUTABLE`  

| Column Name | Type | Nullable | Default | Constraints & Relations |
|---|---|---|---|---|
| `id` | `String` | No | `uuid(` | PRIMARY KEY |
| `actorId` | `String` | Yes | - | - |
| `actorRole` | `String` | Yes | - | - |
| `action` | `String` | No | - | - |
| `resource` | `String` | No | - | - |
| `resourceId` | `String` | Yes | - | - |
| `ipAddress` | `String` | Yes | - | - |
| `userAgent` | `String` | Yes | - | - |
| `metadata` | `Json` | Yes | - | - |
| `createdAt` | `DateTime` | No | `now(` | - |

**Indexes & Constraints**:
- Index: `@@index([actorId, createdAt])`
- Index: `@@index([resource, resourceId])`

---

### User (`users`)

**Purpose**: Core user account representing customers, sellers, admins, operations, and riders  
**Lifecycle Deletion Policy**: `SOFT_DELETE`  

| Column Name | Type | Nullable | Default | Constraints & Relations |
|---|---|---|---|---|
| `id` | `String` | No | `uuid(` | PRIMARY KEY |
| `email` | `String` | Yes | - | UNIQUE |
| `phone` | `String` | Yes | - | UNIQUE |
| `name` | `String` | Yes | - | - |
| `avatarUrl` | `String` | Yes | - | - |
| `status` | `String` | No | `"ACTIVE"` | - |
| `passwordHash` | `String` | Yes | - | - |
| `tokenVersion` | `Int` | No | `1` | - |
| `isEmailVerified` | `Boolean` | No | `false` | - |
| `isPhoneVerified` | `Boolean` | No | `false` | - |
| `lastLoginAt` | `DateTime` | Yes | - | - |
| `version` | `Int` | No | `1` | - |
| `deletedAt` | `DateTime` | Yes | - | - |
| `deletedBy` | `String` | Yes | - | - |
| `createdAt` | `DateTime` | No | `now(` | - |
| `updatedAt` | `DateTime` | No | - | - |
| `roleAssignments` | `UserRoleAssignment[]` | No | - | - |
| `ownedSellers` | `Seller[]` | No | - | FOREIGN KEY |
| `sellerStaff` | `SellerStaff[]` | No | - | - |
| `orders` | `Order[]` | No | - | - |
| `carts` | `Cart[]` | No | - | - |
| `payments` | `Payment[]` | No | - | - |
| `wallets` | `Wallet[]` | No | - | - |
| `pointAccount` | `PointAccount` | Yes | - | - |
| `userRanks` | `UserRank[]` | No | - | - |
| `sessions` | `UserSession[]` | No | - | - |
| `otpTokens` | `OtpToken[]` | No | - | - |
| `oauthAccounts` | `OAuthAccount[]` | No | - | - |

**Indexes & Constraints**:
- Index: `@@index([status])`
- Index: `@@index([deletedAt])`
- Index: `@@index([createdAt])`

---

### Role (`roles`)

**Purpose**: RBAC roles determining functional capabilities and access tiers across the platform  
**Lifecycle Deletion Policy**: `SOFT_DELETE`  

| Column Name | Type | Nullable | Default | Constraints & Relations |
|---|---|---|---|---|
| `id` | `String` | No | `uuid(` | PRIMARY KEY |
| `code` | `String` | No | - | UNIQUE |
| `name` | `String` | No | - | - |
| `description` | `String` | Yes | - | - |
| `isSystem` | `Boolean` | No | `false` | - |
| `version` | `Int` | No | `1` | - |
| `deletedAt` | `DateTime` | Yes | - | - |
| `deletedBy` | `String` | Yes | - | - |
| `createdAt` | `DateTime` | No | `now(` | - |
| `updatedAt` | `DateTime` | No | - | - |
| `rolePermissions` | `RolePermission[]` | No | - | - |
| `userAssignments` | `UserRoleAssignment[]` | No | - | - |

**Indexes & Constraints**:
- Index: `@@index([isSystem])`
- Index: `@@index([deletedAt])`

---

### Permission (`permissions`)

**Purpose**: Atomic authorization permission grants mapped to bounded contexts and operations  
**Lifecycle Deletion Policy**: `SOFT_DELETE`  

| Column Name | Type | Nullable | Default | Constraints & Relations |
|---|---|---|---|---|
| `id` | `String` | No | `uuid(` | PRIMARY KEY |
| `code` | `String` | No | - | UNIQUE |
| `name` | `String` | No | - | - |
| `module` | `String` | No | - | - |
| `description` | `String` | Yes | - | - |
| `version` | `Int` | No | `1` | - |
| `deletedAt` | `DateTime` | Yes | - | - |
| `deletedBy` | `String` | Yes | - | - |
| `createdAt` | `DateTime` | No | `now(` | - |
| `updatedAt` | `DateTime` | No | - | - |
| `rolePermissions` | `RolePermission[]` | No | - | - |

**Indexes & Constraints**:
- Index: `@@index([module])`
- Index: `@@index([deletedAt])`

---

### RolePermission (`role_permissions`)

**Purpose**: Associates roles with their granular permissions  
**Lifecycle Deletion Policy**: `SOFT_DELETE`  

| Column Name | Type | Nullable | Default | Constraints & Relations |
|---|---|---|---|---|
| `id` | `String` | No | `uuid(` | PRIMARY KEY |
| `roleId` | `String` | No | - | - |
| `permissionId` | `String` | No | - | - |
| `version` | `Int` | No | `1` | - |
| `deletedAt` | `DateTime` | Yes | - | - |
| `deletedBy` | `String` | Yes | - | - |
| `createdAt` | `DateTime` | No | `now(` | - |
| `updatedAt` | `DateTime` | No | - | - |
| `role` | `Role` | No | - | FOREIGN KEY |
| `permission` | `Permission` | No | - | FOREIGN KEY |

**Indexes & Constraints**:
- Unique: `@@unique([roleId, permissionId])`
- Index: `@@index([permissionId])`
- Index: `@@index([deletedAt])`

---

### UserRoleAssignment (`user_role_assignments`)

**Purpose**: Assigns roles to users with optional multi-tenant seller scoping  
**Lifecycle Deletion Policy**: `SOFT_DELETE`  

| Column Name | Type | Nullable | Default | Constraints & Relations |
|---|---|---|---|---|
| `id` | `String` | No | `uuid(` | PRIMARY KEY |
| `userId` | `String` | No | - | - |
| `roleId` | `String` | No | - | - |
| `sellerId` | `String` | Yes | - | - |
| `assignedBy` | `String` | Yes | - | - |
| `version` | `Int` | No | `1` | - |
| `deletedAt` | `DateTime` | Yes | - | - |
| `deletedBy` | `String` | Yes | - | - |
| `createdAt` | `DateTime` | No | `now(` | - |
| `updatedAt` | `DateTime` | No | - | - |
| `user` | `User` | No | - | FOREIGN KEY |
| `role` | `Role` | No | - | FOREIGN KEY |

**Indexes & Constraints**:
- Index: `@@index([userId])`
- Index: `@@index([roleId])`
- Index: `@@index([sellerId])`
- Index: `@@index([deletedAt])`

---

### Seller (`sellers`)

**Purpose**: Registered merchant entity operating a storefront within the AlifWorld ecosystem  
**Lifecycle Deletion Policy**: `SOFT_DELETE`  

| Column Name | Type | Nullable | Default | Constraints & Relations |
|---|---|---|---|---|
| `id` | `String` | No | `uuid(` | PRIMARY KEY |
| `ownerUserId` | `String` | No | - | - |
| `businessName` | `String` | No | - | - |
| `slug` | `String` | No | - | UNIQUE |
| `tradeLicenseNumber` | `String` | Yes | - | - |
| `binNumber` | `String` | Yes | - | - |
| `tinNumber` | `String` | Yes | - | - |
| `status` | `String` | No | `"DRAFT"` | - |
| `rejectionReason` | `String` | Yes | - | - |
| `verifiedAt` | `DateTime` | Yes | - | - |
| `verifiedBy` | `String` | Yes | - | - |
| `version` | `Int` | No | `1` | - |
| `deletedAt` | `DateTime` | Yes | - | - |
| `deletedBy` | `String` | Yes | - | - |
| `createdAt` | `DateTime` | No | `now(` | - |
| `updatedAt` | `DateTime` | No | - | - |
| `owner` | `User` | No | - | FOREIGN KEY |
| `staff` | `SellerStaff[]` | No | - | - |
| `kycDocuments` | `SellerKycDocument[]` | No | - | - |
| `settings` | `SellerStoreSettings` | Yes | - | - |
| `products` | `Product[]` | No | - | - |
| `warehouses` | `Warehouse[]` | No | - | - |
| `fulfillmentGroups` | `SellerFulfillmentGroup[]` | No | - | - |
| `orderItems` | `OrderItem[]` | No | - | - |
| `cartItems` | `CartItem[]` | No | - | - |
| `commissions` | `CommissionLedger[]` | No | - | - |
| `settlements` | `SellerSettlement[]` | No | - | - |
| `payouts` | `SellerPayout[]` | No | - | - |
| `wallets` | `Wallet[]` | No | - | - |
| `sellerRanks` | `UserRank[]` | No | - | - |

**Indexes & Constraints**:
- Index: `@@index([ownerUserId])`
- Index: `@@index([status])`
- Index: `@@index([deletedAt])`
- Index: `@@index([createdAt])`

---

### SellerStaff (`seller_staff`)

**Purpose**: Delegated staff members operating within an isolated seller tenant boundary  
**Lifecycle Deletion Policy**: `SOFT_DELETE`  

| Column Name | Type | Nullable | Default | Constraints & Relations |
|---|---|---|---|---|
| `id` | `String` | No | `uuid(` | PRIMARY KEY |
| `sellerId` | `String` | No | - | - |
| `userId` | `String` | No | - | - |
| `roleCode` | `String` | No | `"SELLER_STAFF"` | - |
| `permissions` | `String[]` | No | `[]` | - |
| `version` | `Int` | No | `1` | - |
| `deletedAt` | `DateTime` | Yes | - | - |
| `deletedBy` | `String` | Yes | - | - |
| `createdAt` | `DateTime` | No | `now(` | - |
| `updatedAt` | `DateTime` | No | - | - |
| `seller` | `Seller` | No | - | FOREIGN KEY |
| `user` | `User` | No | - | FOREIGN KEY |

**Indexes & Constraints**:
- Unique: `@@unique([sellerId, userId])`
- Index: `@@index([userId])`
- Index: `@@index([deletedAt])`

---

### SellerKycDocument (`seller_kyc_documents`)

**Purpose**: Cryptographically protected and audited KYC regulatory verification documents  
**Lifecycle Deletion Policy**: `SOFT_DELETE`  

| Column Name | Type | Nullable | Default | Constraints & Relations |
|---|---|---|---|---|
| `id` | `String` | No | `uuid(` | PRIMARY KEY |
| `sellerId` | `String` | No | - | - |
| `documentType` | `String` | No | - | - |
| `documentNumber` | `String` | Yes | - | - |
| `fileUrl` | `String` | No | - | - |
| `fileSize` | `Int` | No | - | - |
| `mimeType` | `String` | No | - | - |
| `status` | `String` | No | `"PENDING"` | - |
| `rejectionReason` | `String` | Yes | - | - |
| `verifiedAt` | `DateTime` | Yes | - | - |
| `verifiedBy` | `String` | Yes | - | - |
| `version` | `Int` | No | `1` | - |
| `deletedAt` | `DateTime` | Yes | - | - |
| `deletedBy` | `String` | Yes | - | - |
| `createdAt` | `DateTime` | No | `now(` | - |
| `updatedAt` | `DateTime` | No | - | - |
| `seller` | `Seller` | No | - | FOREIGN KEY |

**Indexes & Constraints**:
- Index: `@@index([sellerId, documentType])`
- Index: `@@index([status])`
- Index: `@@index([deletedAt])`

---

### SellerStoreSettings (`seller_store_settings`)

**Purpose**: Physical store profile, pickup/return logistics addresses, and courier routing  
**Lifecycle Deletion Policy**: `SOFT_DELETE`  

| Column Name | Type | Nullable | Default | Constraints & Relations |
|---|---|---|---|---|
| `id` | `String` | No | `uuid(` | PRIMARY KEY |
| `sellerId` | `String` | No | - | UNIQUE |
| `logoUrl` | `String` | Yes | - | - |
| `bannerUrl` | `String` | Yes | - | - |
| `supportEmail` | `String` | Yes | - | - |
| `supportPhone` | `String` | Yes | - | - |
| `pickupAddress` | `Json` | Yes | - | - |
| `returnAddress` | `Json` | Yes | - | - |
| `defaultCourier` | `String` | Yes | - | - |
| `vacationMode` | `Boolean` | No | `false` | - |
| `vacationMessage` | `String` | Yes | - | - |
| `version` | `Int` | No | `1` | - |
| `deletedAt` | `DateTime` | Yes | - | - |
| `deletedBy` | `String` | Yes | - | - |
| `createdAt` | `DateTime` | No | `now(` | - |
| `updatedAt` | `DateTime` | No | - | - |
| `seller` | `Seller` | No | - | FOREIGN KEY |

**Indexes & Constraints**:
- Index: `@@index([deletedAt])`

---

### Category (`categories`)

**Purpose**: Hierarchical category tree with self-referencing parent/child relations and NBR VAT rules  
**Lifecycle Deletion Policy**: `SOFT_DELETE`  

| Column Name | Type | Nullable | Default | Constraints & Relations |
|---|---|---|---|---|
| `id` | `String` | No | `uuid(` | PRIMARY KEY |
| `name` | `String` | No | - | - |
| `nameBn` | `String` | Yes | - | - |
| `slug` | `String` | No | - | UNIQUE |
| `description` | `String` | Yes | - | - |
| `parentId` | `String` | Yes | - | - |
| `imageUrl` | `String` | Yes | - | - |
| `icon` | `String` | Yes | - | - |
| `displayOrder` | `Int` | No | `0` | - |
| `isActive` | `Boolean` | No | `true` | - |
| `taxRatePercent` | `Decimal` | No | `0.00` | - |
| `version` | `Int` | No | `1` | - |
| `deletedAt` | `DateTime` | Yes | - | - |
| `deletedBy` | `String` | Yes | - | - |
| `createdAt` | `DateTime` | No | `now(` | - |
| `updatedAt` | `DateTime` | No | - | - |
| `parent` | `Category` | Yes | - | FOREIGN KEY |
| `children` | `Category[]` | No | - | FOREIGN KEY |
| `products` | `Product[]` | No | - | - |

**Indexes & Constraints**:
- Index: `@@index([parentId])`
- Index: `@@index([isActive])`
- Index: `@@index([deletedAt])`

---

### Brand (`brands`)

**Purpose**: Approved brand registry for catalog categorization and trademark compliance  
**Lifecycle Deletion Policy**: `SOFT_DELETE`  

| Column Name | Type | Nullable | Default | Constraints & Relations |
|---|---|---|---|---|
| `id` | `String` | No | `uuid(` | PRIMARY KEY |
| `name` | `String` | No | - | - |
| `slug` | `String` | No | - | UNIQUE |
| `logoUrl` | `String` | Yes | - | - |
| `website` | `String` | Yes | - | - |
| `isVerified` | `Boolean` | No | `true` | - |
| `isActive` | `Boolean` | No | `true` | - |
| `version` | `Int` | No | `1` | - |
| `deletedAt` | `DateTime` | Yes | - | - |
| `deletedBy` | `String` | Yes | - | - |
| `createdAt` | `DateTime` | No | `now(` | - |
| `updatedAt` | `DateTime` | No | - | - |
| `products` | `Product[]` | No | - | - |

**Indexes & Constraints**:
- Index: `@@index([isActive])`
- Index: `@@index([deletedAt])`

---

### Product (`products`)

**Purpose**: Merchant products with strict BDT integer poisha pricing and independent Product Points  
**Lifecycle Deletion Policy**: `SOFT_DELETE`  

| Column Name | Type | Nullable | Default | Constraints & Relations |
|---|---|---|---|---|
| `id` | `String` | No | `uuid(` | PRIMARY KEY |
| `sellerId` | `String` | No | - | - |
| `categoryId` | `String` | No | - | - |
| `brandId` | `String` | Yes | - | - |
| `title` | `String` | No | - | - |
| `titleBn` | `String` | Yes | - | - |
| `slug` | `String` | No | - | UNIQUE |
| `description` | `String` | No | - | - |
| `descriptionBn` | `String` | Yes | - | - |
| `status` | `String` | No | `"DRAFT"` | - |
| `basePricePoisha` | `BigInt` | No | - | - |
| `compareAtPricePoisha` | `BigInt` | Yes | - | - |
| `currency` | `String` | No | `"BDT"` | - |
| `productPoint` | `Int` | No | `0` | - |
| `sku` | `String` | Yes | - | UNIQUE |
| `barcode` | `String` | Yes | - | - |
| `isPhysical` | `Boolean` | No | `true` | - |
| `weightGrams` | `Int` | Yes | - | - |
| `warranty` | `String` | Yes | - | - |
| `tags` | `String[]` | No | `[]` | - |
| `taxRatePercent` | `Decimal` | Yes | - | - |
| `version` | `Int` | No | `1` | - |
| `deletedAt` | `DateTime` | Yes | - | - |
| `deletedBy` | `String` | Yes | - | - |
| `createdAt` | `DateTime` | No | `now(` | - |
| `updatedAt` | `DateTime` | No | - | - |
| `seller` | `Seller` | No | - | FOREIGN KEY |
| `category` | `Category` | No | - | FOREIGN KEY |
| `brand` | `Brand` | Yes | - | FOREIGN KEY |
| `variants` | `ProductVariant[]` | No | - | - |
| `media` | `ProductMedia[]` | No | - | - |
| `slugHistory` | `ProductSlugHistory[]` | No | - | - |

**Indexes & Constraints**:
- Index: `@@index([sellerId])`
- Index: `@@index([categoryId])`
- Index: `@@index([brandId])`
- Index: `@@index([status])`
- Index: `@@index([deletedAt])`
- Index: `@@index([createdAt])`

---

### ProductVariant (`product_variants`)

**Purpose**: Sellable inventory variants (e.g. Color, Size, Storage) with SKU and pricing  
**Lifecycle Deletion Policy**: `SOFT_DELETE`  

| Column Name | Type | Nullable | Default | Constraints & Relations |
|---|---|---|---|---|
| `id` | `String` | No | `uuid(` | PRIMARY KEY |
| `productId` | `String` | No | - | - |
| `sku` | `String` | No | - | UNIQUE |
| `title` | `String` | No | - | - |
| `pricePoisha` | `BigInt` | No | - | - |
| `compareAtPricePoisha` | `BigInt` | Yes | - | - |
| `productPoint` | `Int` | Yes | - | - |
| `barcode` | `String` | Yes | - | - |
| `weightGrams` | `Int` | Yes | - | - |
| `option1Name` | `String` | Yes | - | - |
| `option1Value` | `String` | Yes | - | - |
| `option2Name` | `String` | Yes | - | - |
| `option2Value` | `String` | Yes | - | - |
| `option3Name` | `String` | Yes | - | - |
| `option3Value` | `String` | Yes | - | - |
| `imageUrl` | `String` | Yes | - | - |
| `isActive` | `Boolean` | No | `true` | - |
| `displayOrder` | `Int` | No | `0` | - |
| `version` | `Int` | No | `1` | - |
| `deletedAt` | `DateTime` | Yes | - | - |
| `deletedBy` | `String` | Yes | - | - |
| `createdAt` | `DateTime` | No | `now(` | - |
| `updatedAt` | `DateTime` | No | - | - |
| `product` | `Product` | No | - | FOREIGN KEY |
| `stockBalances` | `StockBalance[]` | No | - | - |
| `stockMovements` | `StockMovementLedger[]` | No | - | - |
| `cartItems` | `CartItem[]` | No | - | - |
| `orderItems` | `OrderItem[]` | No | - | - |

**Indexes & Constraints**:
- Index: `@@index([productId])`
- Index: `@@index([isActive])`
- Index: `@@index([deletedAt])`

---

### ProductMedia (`product_media`)

**Purpose**: Visual assets (images, videos) associated with products and variants  
**Lifecycle Deletion Policy**: `SOFT_DELETE`  

| Column Name | Type | Nullable | Default | Constraints & Relations |
|---|---|---|---|---|
| `id` | `String` | No | `uuid(` | PRIMARY KEY |
| `productId` | `String` | No | - | - |
| `mediaType` | `String` | No | `"IMAGE"` | - |
| `url` | `String` | No | - | - |
| `altText` | `String` | Yes | - | - |
| `altTextBn` | `String` | Yes | - | - |
| `isPrimary` | `Boolean` | No | `false` | - |
| `displayOrder` | `Int` | No | `0` | - |
| `fileSize` | `Int` | Yes | - | - |
| `mimeType` | `String` | Yes | - | - |
| `width` | `Int` | Yes | - | - |
| `height` | `Int` | Yes | - | - |
| `deletedAt` | `DateTime` | Yes | - | - |
| `deletedBy` | `String` | Yes | - | - |
| `createdAt` | `DateTime` | No | `now(` | - |
| `updatedAt` | `DateTime` | No | - | - |
| `product` | `Product` | No | - | FOREIGN KEY |

**Indexes & Constraints**:
- Index: `@@index([productId, isPrimary])`
- Index: `@@index([displayOrder])`
- Index: `@@index([deletedAt])`

---

### ProductSlugHistory (`product_slug_history`)

**Purpose**: Preserves SEO redirects and permalinks when product slugs are updated  
**Lifecycle Deletion Policy**: `IMMUTABLE`  

| Column Name | Type | Nullable | Default | Constraints & Relations |
|---|---|---|---|---|
| `id` | `String` | No | `uuid(` | PRIMARY KEY |
| `productId` | `String` | No | - | - |
| `oldSlug` | `String` | No | - | UNIQUE |
| `createdAt` | `DateTime` | No | `now(` | - |
| `product` | `Product` | No | - | FOREIGN KEY |

**Indexes & Constraints**:
- Index: `@@index([productId])`

---

### Warehouse (`warehouses`)

**Purpose**: Platform fulfillment centers and merchant warehouse facilities across Bangladesh  
**Lifecycle Deletion Policy**: `SOFT_DELETE`  

| Column Name | Type | Nullable | Default | Constraints & Relations |
|---|---|---|---|---|
| `id` | `String` | No | `uuid(` | PRIMARY KEY |
| `sellerId` | `String` | Yes | - | - |
| `name` | `String` | No | - | - |
| `code` | `String` | No | - | UNIQUE |
| `division` | `String` | No | - | - |
| `district` | `String` | No | - | - |
| `upazila` | `String` | Yes | - | - |
| `addressLine` | `String` | No | - | - |
| `postalCode` | `String` | Yes | - | - |
| `isPlatformHub` | `Boolean` | No | `false` | - |
| `isActive` | `Boolean` | No | `true` | - |
| `version` | `Int` | No | `1` | - |
| `deletedAt` | `DateTime` | Yes | - | - |
| `deletedBy` | `String` | Yes | - | - |
| `createdAt` | `DateTime` | No | `now(` | - |
| `updatedAt` | `DateTime` | No | - | - |
| `seller` | `Seller` | Yes | - | FOREIGN KEY |
| `stockBalances` | `StockBalance[]` | No | - | - |
| `movements` | `StockMovementLedger[]` | No | - | - |
| `fulfillmentGroups` | `SellerFulfillmentGroup[]` | No | - | - |

**Indexes & Constraints**:
- Index: `@@index([sellerId])`
- Index: `@@index([division, district])`
- Index: `@@index([isActive])`
- Index: `@@index([deletedAt])`

---

### StockBalance (`stock_balances`)

**Purpose**: Physical on-hand, reserved, damaged, and quarantined stock balances per warehouse/variant  
**Lifecycle Deletion Policy**: `SOFT_DELETE`  

| Column Name | Type | Nullable | Default | Constraints & Relations |
|---|---|---|---|---|
| `id` | `String` | No | `uuid(` | PRIMARY KEY |
| `warehouseId` | `String` | No | - | - |
| `variantId` | `String` | No | - | - |
| `onHand` | `Int` | No | `0` | - |
| `reserved` | `Int` | No | `0` | - |
| `damaged` | `Int` | No | `0` | - |
| `quarantined` | `Int` | No | `0` | - |
| `lowStockThreshold` | `Int` | No | `5` | - |
| `reorderPoint` | `Int` | No | `10` | - |
| `version` | `Int` | No | `1` | - |
| `deletedAt` | `DateTime` | Yes | - | - |
| `deletedBy` | `String` | Yes | - | - |
| `createdAt` | `DateTime` | No | `now(` | - |
| `updatedAt` | `DateTime` | No | - | - |
| `warehouse` | `Warehouse` | No | - | FOREIGN KEY |
| `variant` | `ProductVariant` | No | - | FOREIGN KEY |
| `reservations` | `StockReservation[]` | No | - | - |
| `movements` | `StockMovementLedger[]` | No | - | - |

**Indexes & Constraints**:
- Unique: `@@unique([warehouseId, variantId])`
- Index: `@@index([variantId])`
- Index: `@@index([warehouseId])`
- Index: `@@index([deletedAt])`

---

### StockReservation (`stock_reservations`)

**Purpose**: Time-limited atomic stock reservations during buyer checkout with deterministic expiry  
**Lifecycle Deletion Policy**: `SOFT_DELETE`  

| Column Name | Type | Nullable | Default | Constraints & Relations |
|---|---|---|---|---|
| `id` | `String` | No | `uuid(` | PRIMARY KEY |
| `stockBalanceId` | `String` | No | - | - |
| `orderId` | `String` | Yes | - | - |
| `cartId` | `String` | Yes | - | - |
| `quantity` | `Int` | No | - | - |
| `status` | `String` | No | `"ACTIVE"` | - |
| `expiresAt` | `DateTime` | No | - | - |
| `committedAt` | `DateTime` | Yes | - | - |
| `releasedAt` | `DateTime` | Yes | - | - |
| `version` | `Int` | No | `1` | - |
| `deletedAt` | `DateTime` | Yes | - | - |
| `deletedBy` | `String` | Yes | - | - |
| `createdAt` | `DateTime` | No | `now(` | - |
| `updatedAt` | `DateTime` | No | - | - |
| `stockBalance` | `StockBalance` | No | - | FOREIGN KEY |

**Indexes & Constraints**:
- Index: `@@index([stockBalanceId, status])`
- Index: `@@index([expiresAt, status])`
- Index: `@@index([orderId])`
- Index: `@@index([cartId])`

---

### StockMovementLedger (`stock_movement_ledger`)

**Purpose**: Append-only audit trail recording every inventory balance adjustment and reservation  
**Lifecycle Deletion Policy**: `IMMUTABLE`  

| Column Name | Type | Nullable | Default | Constraints & Relations |
|---|---|---|---|---|
| `id` | `String` | No | `uuid(` | PRIMARY KEY |
| `stockBalanceId` | `String` | No | - | - |
| `warehouseId` | `String` | No | - | - |
| `variantId` | `String` | No | - | - |
| `movementType` | `String` | No | - | - |
| `quantityDelta` | `Int` | No | - | - |
| `onHandAfter` | `Int` | No | - | - |
| `reservedAfter` | `Int` | No | - | - |
| `availableAfter` | `Int` | No | - | - |
| `sourceType` | `String` | No | - | - |
| `sourceId` | `String` | No | - | - |
| `actorId` | `String` | Yes | - | - |
| `reason` | `String` | Yes | - | - |
| `createdAt` | `DateTime` | No | `now(` | - |
| `stockBalance` | `StockBalance` | No | - | FOREIGN KEY |
| `warehouse` | `Warehouse` | No | - | FOREIGN KEY |
| `variant` | `ProductVariant` | No | - | FOREIGN KEY |

**Indexes & Constraints**:
- Index: `@@index([variantId, warehouseId])`
- Index: `@@index([stockBalanceId, createdAt])`
- Index: `@@index([sourceType, sourceId])`

---

### Cart (`carts`)

**Purpose**: Active or abandoned customer shopping cart and checkout session  
**Lifecycle Deletion Policy**: `SOFT_DELETE`  

| Column Name | Type | Nullable | Default | Constraints & Relations |
|---|---|---|---|---|
| `id` | `String` | No | `uuid(` | PRIMARY KEY |
| `userId` | `String` | Yes | - | - |
| `currency` | `String` | No | `"BDT"` | - |
| `status` | `String` | No | `"ACTIVE"` | - |
| `couponCode` | `String` | Yes | - | - |
| `notes` | `String` | Yes | - | - |
| `version` | `Int` | No | `1` | - |
| `deletedAt` | `DateTime` | Yes | - | - |
| `deletedBy` | `String` | Yes | - | - |
| `createdAt` | `DateTime` | No | `now(` | - |
| `updatedAt` | `DateTime` | No | - | - |
| `user` | `User` | Yes | - | FOREIGN KEY |
| `items` | `CartItem[]` | No | - | - |

**Indexes & Constraints**:
- Index: `@@index([userId, status])`
- Index: `@@index([status, createdAt])`
- Index: `@@index([deletedAt])`

---

### CartItem (`cart_items`)

**Purpose**: Line items stored inside an active shopping cart with variant and pricing snapshots  
**Lifecycle Deletion Policy**: `SOFT_DELETE`  

| Column Name | Type | Nullable | Default | Constraints & Relations |
|---|---|---|---|---|
| `id` | `String` | No | `uuid(` | PRIMARY KEY |
| `cartId` | `String` | No | - | - |
| `variantId` | `String` | No | - | - |
| `sellerId` | `String` | No | - | - |
| `quantity` | `Int` | No | - | - |
| `pricePoisha` | `BigInt` | No | - | - |
| `productPoint` | `Int` | No | `0` | - |
| `version` | `Int` | No | `1` | - |
| `deletedAt` | `DateTime` | Yes | - | - |
| `deletedBy` | `String` | Yes | - | - |
| `createdAt` | `DateTime` | No | `now(` | - |
| `updatedAt` | `DateTime` | No | - | - |
| `cart` | `Cart` | No | - | FOREIGN KEY |
| `variant` | `ProductVariant` | No | - | FOREIGN KEY |
| `seller` | `Seller` | No | - | FOREIGN KEY |

**Indexes & Constraints**:
- Index: `@@index([cartId])`
- Index: `@@index([variantId])`
- Index: `@@index([sellerId])`
- Index: `@@index([deletedAt])`

---

### Order (`orders`)

**Purpose**: Customer parent order consolidating multi-vendor purchases into a unified checkout  
**Lifecycle Deletion Policy**: `SOFT_DELETE`  

| Column Name | Type | Nullable | Default | Constraints & Relations |
|---|---|---|---|---|
| `id` | `String` | No | `uuid(` | PRIMARY KEY |
| `orderNumber` | `String` | No | - | UNIQUE |
| `customerId` | `String` | No | - | - |
| `status` | `String` | No | `"PENDING_PAYMENT"` | - |
| `paymentStatus` | `String` | No | `"UNPAID"` | - |
| `fulfillmentStatus` | `String` | No | `"UNFULFILLED"` | - |
| `currency` | `String` | No | `"BDT"` | - |
| `subtotalPoisha` | `BigInt` | No | - | - |
| `discountPoisha` | `BigInt` | No | `0` | - |
| `shippingFeePoisha` | `BigInt` | No | `0` | - |
| `taxPoisha` | `BigInt` | No | `0` | - |
| `totalPoisha` | `BigInt` | No | - | - |
| `totalProductPoints` | `Int` | No | `0` | - |
| `pointsReleased` | `Boolean` | No | `false` | - |
| `pointsReleasedAt` | `DateTime` | Yes | - | - |
| `shippingName` | `String` | No | - | - |
| `shippingPhone` | `String` | No | - | - |
| `shippingDivision` | `String` | No | - | - |
| `shippingDistrict` | `String` | No | - | - |
| `shippingUpazila` | `String` | Yes | - | - |
| `shippingAddress` | `String` | No | - | - |
| `shippingPostalCode` | `String` | Yes | - | - |
| `billingAddress` | `String` | Yes | - | - |
| `ruleVersion` | `String` | No | `"v1.0.0"` | - |
| `customerNotes` | `String` | Yes | - | - |
| `adminNotes` | `String` | Yes | - | - |
| `cancelReason` | `String` | Yes | - | - |
| `cancelledAt` | `DateTime` | Yes | - | - |
| `confirmedAt` | `DateTime` | Yes | - | - |
| `completedAt` | `DateTime` | Yes | - | - |
| `version` | `Int` | No | `1` | - |
| `deletedAt` | `DateTime` | Yes | - | - |
| `deletedBy` | `String` | Yes | - | - |
| `createdAt` | `DateTime` | No | `now(` | - |
| `updatedAt` | `DateTime` | No | - | - |
| `customer` | `User` | No | - | FOREIGN KEY |
| `items` | `OrderItem[]` | No | - | - |
| `fulfillmentGroups` | `SellerFulfillmentGroup[]` | No | - | - |
| `statusHistory` | `OrderStatusHistory[]` | No | - | - |
| `payments` | `Payment[]` | No | - | - |
| `refunds` | `Refund[]` | No | - | - |
| `commissions` | `CommissionLedger[]` | No | - | - |

**Indexes & Constraints**:
- Index: `@@index([customerId, status])`
- Index: `@@index([orderNumber])`
- Index: `@@index([status, createdAt])`
- Index: `@@index([paymentStatus])`
- Index: `@@index([shippingDivision, shippingDistrict])`
- Index: `@@index([deletedAt])`

---

### SellerFulfillmentGroup (`seller_fulfillment_groups`)

**Purpose**: Merchant-scoped fulfillment partition ensuring tenant isolation (merchants see only their group)  
**Lifecycle Deletion Policy**: `SOFT_DELETE`  

| Column Name | Type | Nullable | Default | Constraints & Relations |
|---|---|---|---|---|
| `id` | `String` | No | `uuid(` | PRIMARY KEY |
| `orderId` | `String` | No | - | - |
| `sellerId` | `String` | No | - | - |
| `warehouseId` | `String` | Yes | - | - |
| `groupNumber` | `String` | No | - | UNIQUE |
| `status` | `String` | No | `"PENDING"` | - |
| `subtotalPoisha` | `BigInt` | No | - | - |
| `shippingFeePoisha` | `BigInt` | No | `0` | - |
| `taxPoisha` | `BigInt` | No | `0` | - |
| `totalPoisha` | `BigInt` | No | - | - |
| `sellerCommissionPoisha` | `BigInt` | No | `0` | - |
| `sellerPayoutPoisha` | `BigInt` | No | `0` | - |
| `totalProductPoints` | `Int` | No | `0` | - |
| `courierProvider` | `String` | Yes | - | - |
| `trackingNumber` | `String` | Yes | - | - |
| `consignmentId` | `String` | Yes | - | - |
| `pickupDate` | `DateTime` | Yes | - | - |
| `estimatedDelivery` | `DateTime` | Yes | - | - |
| `deliveredAt` | `DateTime` | Yes | - | - |
| `version` | `Int` | No | `1` | - |
| `deletedAt` | `DateTime` | Yes | - | - |
| `deletedBy` | `String` | Yes | - | - |
| `createdAt` | `DateTime` | No | `now(` | - |
| `updatedAt` | `DateTime` | No | - | - |
| `order` | `Order` | No | - | FOREIGN KEY |
| `seller` | `Seller` | No | - | FOREIGN KEY |
| `warehouse` | `Warehouse` | Yes | - | FOREIGN KEY |
| `items` | `OrderItem[]` | No | - | - |
| `shipments` | `Shipment[]` | No | - | - |
| `refunds` | `Refund[]` | No | - | - |
| `commissions` | `CommissionLedger[]` | No | - | - |

**Indexes & Constraints**:
- Index: `@@index([sellerId, status])`
- Index: `@@index([orderId])`
- Index: `@@index([warehouseId])`
- Index: `@@index([status, createdAt])`
- Index: `@@index([deletedAt])`

---

### OrderItem (`order_items`)

**Purpose**: Line item snapshot freezing purchased product, variant, pricing, and independent Product Points  
**Lifecycle Deletion Policy**: `SOFT_DELETE`  

| Column Name | Type | Nullable | Default | Constraints & Relations |
|---|---|---|---|---|
| `id` | `String` | No | `uuid(` | PRIMARY KEY |
| `orderId` | `String` | No | - | - |
| `fulfillmentGroupId` | `String` | No | - | - |
| `sellerId` | `String` | No | - | - |
| `variantId` | `String` | No | - | - |
| `productTitle` | `String` | No | - | - |
| `variantTitle` | `String` | No | - | - |
| `sku` | `String` | No | - | - |
| `unitPricePoisha` | `BigInt` | No | - | - |
| `quantity` | `Int` | No | - | - |
| `totalPoisha` | `BigInt` | No | - | - |
| `taxRatePercent` | `Decimal` | Yes | - | - |
| `taxPoisha` | `BigInt` | No | `0` | - |
| `productPointSnapshot` | `Int` | No | `0` | - |
| `totalProductPoints` | `Int` | No | `0` | - |
| `status` | `String` | No | `"PENDING"` | - |
| `version` | `Int` | No | `1` | - |
| `deletedAt` | `DateTime` | Yes | - | - |
| `deletedBy` | `String` | Yes | - | - |
| `createdAt` | `DateTime` | No | `now(` | - |
| `updatedAt` | `DateTime` | No | - | - |
| `order` | `Order` | No | - | FOREIGN KEY |
| `fulfillmentGroup` | `SellerFulfillmentGroup` | No | - | FOREIGN KEY |
| `seller` | `Seller` | No | - | FOREIGN KEY |
| `variant` | `ProductVariant` | No | - | FOREIGN KEY |
| `refundItems` | `RefundItem[]` | No | - | - |

**Indexes & Constraints**:
- Index: `@@index([orderId])`
- Index: `@@index([fulfillmentGroupId])`
- Index: `@@index([sellerId])`
- Index: `@@index([variantId])`
- Index: `@@index([deletedAt])`

---

### OrderStatusHistory (`order_status_history`)

**Purpose**: Immutable chronological log tracking every parent order state transition  
**Lifecycle Deletion Policy**: `IMMUTABLE`  

| Column Name | Type | Nullable | Default | Constraints & Relations |
|---|---|---|---|---|
| `id` | `String` | No | `uuid(` | PRIMARY KEY |
| `orderId` | `String` | No | - | - |
| `fromStatus` | `String` | Yes | - | - |
| `toStatus` | `String` | No | - | - |
| `actorId` | `String` | Yes | - | - |
| `actorRole` | `String` | Yes | - | - |
| `reason` | `String` | Yes | - | - |
| `metadata` | `Json` | Yes | - | - |
| `createdAt` | `DateTime` | No | `now(` | - |
| `order` | `Order` | No | - | FOREIGN KEY |

**Indexes & Constraints**:
- Index: `@@index([orderId, createdAt])`

---

### Shipment (`shipments`)

**Purpose**: Physical parcel package dispatched via courier service (Pathao, Steadfast, etc.)  
**Lifecycle Deletion Policy**: `SOFT_DELETE`  

| Column Name | Type | Nullable | Default | Constraints & Relations |
|---|---|---|---|---|
| `id` | `String` | No | `uuid(` | PRIMARY KEY |
| `fulfillmentGroupId` | `String` | No | - | - |
| `sellerId` | `String` | No | - | - |
| `shipmentNumber` | `String` | No | - | UNIQUE |
| `courierProvider` | `String` | No | - | - |
| `trackingNumber` | `String` | Yes | - | - |
| `consignmentId` | `String` | Yes | - | - |
| `status` | `String` | No | `"PENDING"` | - |
| `weightGrams` | `Int` | Yes | - | - |
| `packageCount` | `Int` | No | `1` | - |
| `shippingCostPoisha` | `BigInt` | No | `0` | - |
| `shippedAt` | `DateTime` | Yes | - | - |
| `deliveredAt` | `DateTime` | Yes | - | - |
| `recipientName` | `String` | No | - | - |
| `recipientPhone` | `String` | No | - | - |
| `deliveryAddress` | `String` | No | - | - |
| `division` | `String` | No | - | - |
| `district` | `String` | No | - | - |
| `version` | `Int` | No | `1` | - |
| `deletedAt` | `DateTime` | Yes | - | - |
| `deletedBy` | `String` | Yes | - | - |
| `createdAt` | `DateTime` | No | `now(` | - |
| `updatedAt` | `DateTime` | No | - | - |
| `fulfillmentGroup` | `SellerFulfillmentGroup` | No | - | FOREIGN KEY |
| `events` | `ShipmentEvent[]` | No | - | - |

**Indexes & Constraints**:
- Index: `@@index([fulfillmentGroupId])`
- Index: `@@index([sellerId, status])`
- Index: `@@index([trackingNumber])`
- Index: `@@index([division, district])`
- Index: `@@index([deletedAt])`

---

### ShipmentEvent (`shipment_events`)

**Purpose**: Immutable chronological tracking event timeline for a shipment package  
**Lifecycle Deletion Policy**: `IMMUTABLE`  

| Column Name | Type | Nullable | Default | Constraints & Relations |
|---|---|---|---|---|
| `id` | `String` | No | `uuid(` | PRIMARY KEY |
| `shipmentId` | `String` | No | - | - |
| `status` | `String` | No | - | - |
| `location` | `String` | Yes | - | - |
| `description` | `String` | No | - | - |
| `carrierPayload` | `Json` | Yes | - | - |
| `occurredAt` | `DateTime` | No | `now(` | - |
| `createdAt` | `DateTime` | No | `now(` | - |
| `shipment` | `Shipment` | No | - | FOREIGN KEY |

**Indexes & Constraints**:
- Index: `@@index([shipmentId, occurredAt])`

---

### Payment (`payments`)

**Purpose**: Inward customer payment transaction executed through digital gateway or COD  
**Lifecycle Deletion Policy**: `IMMUTABLE`  

| Column Name | Type | Nullable | Default | Constraints & Relations |
|---|---|---|---|---|
| `id` | `String` | No | `uuid(` | PRIMARY KEY |
| `orderId` | `String` | No | - | - |
| `customerId` | `String` | No | - | - |
| `paymentNumber` | `String` | No | - | UNIQUE |
| `gatewayProvider` | `String` | No | - | - |
| `gatewayTransactionId` | `String` | Yes | - | - |
| `status` | `String` | No | `"PENDING"` | - |
| `amountPoisha` | `BigInt` | No | - | - |
| `currency` | `String` | No | `"BDT"` | - |
| `feePoisha` | `BigInt` | No | `0` | - |
| `clientIp` | `String` | Yes | - | - |
| `idempotencyKey` | `String` | Yes | - | UNIQUE |
| `gatewayPayload` | `Json` | Yes | - | - |
| `authorizedAt` | `DateTime` | Yes | - | - |
| `capturedAt` | `DateTime` | Yes | - | - |
| `failedAt` | `DateTime` | Yes | - | - |
| `failureReason` | `String` | Yes | - | - |
| `createdAt` | `DateTime` | No | `now(` | - |
| `updatedAt` | `DateTime` | No | - | - |
| `order` | `Order` | No | - | FOREIGN KEY |
| `customer` | `User` | No | - | FOREIGN KEY |
| `refunds` | `Refund[]` | No | - | - |

**Indexes & Constraints**:
- Index: `@@index([orderId])`
- Index: `@@index([customerId])`
- Index: `@@index([status, createdAt])`
- Index: `@@index([gatewayProvider, gatewayTransactionId])`

---

### Refund (`refunds`)

**Purpose**: Full or partial refund with item-level tracking and automatic ledger reversals  
**Lifecycle Deletion Policy**: `IMMUTABLE`  

| Column Name | Type | Nullable | Default | Constraints & Relations |
|---|---|---|---|---|
| `id` | `String` | No | `uuid(` | PRIMARY KEY |
| `paymentId` | `String` | No | - | - |
| `orderId` | `String` | No | - | - |
| `fulfillmentGroupId` | `String` | Yes | - | - |
| `refundNumber` | `String` | No | - | UNIQUE |
| `amountPoisha` | `BigInt` | No | - | - |
| `currency` | `String` | No | `"BDT"` | - |
| `status` | `String` | No | `"PENDING"` | - |
| `gatewayRefundId` | `String` | Yes | - | - |
| `reason` | `String` | No | - | - |
| `idempotencyKey` | `String` | Yes | - | UNIQUE |
| `reversalPoints` | `Int` | No | `0` | - |
| `sellerDeductionPoisha` | `BigInt` | No | `0` | - |
| `taxReversalPoisha` | `BigInt` | No | `0` | - |
| `commissionReversalPoisha` | `BigInt` | No | `0` | - |
| `initiatedBy` | `String` | Yes | - | - |
| `approvedBy` | `String` | Yes | - | - |
| `processedAt` | `DateTime` | Yes | - | - |
| `createdAt` | `DateTime` | No | `now(` | - |
| `updatedAt` | `DateTime` | No | - | - |
| `payment` | `Payment` | No | - | FOREIGN KEY |
| `order` | `Order` | No | - | FOREIGN KEY |
| `fulfillmentGroup` | `SellerFulfillmentGroup` | Yes | - | FOREIGN KEY |
| `items` | `RefundItem[]` | No | - | - |

**Indexes & Constraints**:
- Index: `@@index([paymentId])`
- Index: `@@index([orderId])`
- Index: `@@index([fulfillmentGroupId])`
- Index: `@@index([status, createdAt])`

---

### RefundItem (`refund_items`)

**Purpose**: Itemized breakdown of returned units, refund amount, and reversed Product Points  
**Lifecycle Deletion Policy**: `IMMUTABLE`  

| Column Name | Type | Nullable | Default | Constraints & Relations |
|---|---|---|---|---|
| `id` | `String` | No | `uuid(` | PRIMARY KEY |
| `refundId` | `String` | No | - | - |
| `orderItemId` | `String` | No | - | - |
| `quantity` | `Int` | No | - | - |
| `amountPoisha` | `BigInt` | No | - | - |
| `taxPoisha` | `BigInt` | No | `0` | - |
| `productPoints` | `Int` | No | `0` | - |
| `createdAt` | `DateTime` | No | `now(` | - |
| `refund` | `Refund` | No | - | FOREIGN KEY |
| `orderItem` | `OrderItem` | No | - | FOREIGN KEY |

**Indexes & Constraints**:
- Index: `@@index([refundId])`
- Index: `@@index([orderItemId])`

---

### CommissionLedger (`commission_ledger`)

**Purpose**: Immutable financial ledger tracking platform commissions, rule versions, and reversals  
**Lifecycle Deletion Policy**: `IMMUTABLE`  

| Column Name | Type | Nullable | Default | Constraints & Relations |
|---|---|---|---|---|
| `id` | `String` | No | `uuid(` | PRIMARY KEY |
| `sellerId` | `String` | No | - | - |
| `orderId` | `String` | No | - | - |
| `fulfillmentGroupId` | `String` | No | - | - |
| `basisAmountPoisha` | `BigInt` | No | - | - |
| `commissionRateBps` | `Int` | No | - | - |
| `commissionPoisha` | `BigInt` | No | - | - |
| `ruleVersion` | `String` | No | `"v1.0.0"` | - |
| `status` | `String` | No | `"EARNED"` | - |
| `reversalOfId` | `String` | Yes | - | UNIQUE |
| `notes` | `String` | Yes | - | - |
| `createdAt` | `DateTime` | No | `now(` | - |
| `seller` | `Seller` | No | - | FOREIGN KEY |
| `order` | `Order` | No | - | FOREIGN KEY |
| `fulfillmentGroup` | `SellerFulfillmentGroup` | No | - | FOREIGN KEY |
| `originalCommission` | `CommissionLedger` | Yes | - | FOREIGN KEY |
| `reversalCommission` | `CommissionLedger` | Yes | - | FOREIGN KEY |

**Indexes & Constraints**:
- Index: `@@index([sellerId, status])`
- Index: `@@index([orderId])`
- Index: `@@index([fulfillmentGroupId])`
- Index: `@@index([createdAt])`

---

### SellerSettlement (`seller_settlements`)

**Purpose**: Periodic settlement statement batch aggregating seller fulfilled orders, commissions, and adjustments  
**Lifecycle Deletion Policy**: `SOFT_DELETE`  

| Column Name | Type | Nullable | Default | Constraints & Relations |
|---|---|---|---|---|
| `id` | `String` | No | `uuid(` | PRIMARY KEY |
| `sellerId` | `String` | No | - | - |
| `settlementNumber` | `String` | No | - | UNIQUE |
| `periodStart` | `DateTime` | No | - | - |
| `periodEnd` | `DateTime` | No | - | - |
| `grossOrderPoisha` | `BigInt` | No | - | - |
| `shippingFeePoisha` | `BigInt` | No | - | - |
| `taxPoisha` | `BigInt` | No | - | - |
| `commissionPoisha` | `BigInt` | No | - | - |
| `refundDeductionPoisha` | `BigInt` | No | `0` | - |
| `netPayoutPoisha` | `BigInt` | No | - | - |
| `status` | `String` | No | `"PENDING"` | - |
| `auditedBy` | `String` | Yes | - | - |
| `auditedAt` | `DateTime` | Yes | - | - |
| `approvedBy` | `String` | Yes | - | - |
| `approvedAt` | `DateTime` | Yes | - | - |
| `disbursedAt` | `DateTime` | Yes | - | - |
| `version` | `Int` | No | `1` | - |
| `deletedAt` | `DateTime` | Yes | - | - |
| `deletedBy` | `String` | Yes | - | - |
| `createdAt` | `DateTime` | No | `now(` | - |
| `updatedAt` | `DateTime` | No | - | - |
| `seller` | `Seller` | No | - | FOREIGN KEY |
| `payouts` | `SellerPayout[]` | No | - | - |

**Indexes & Constraints**:
- Index: `@@index([sellerId, status])`
- Index: `@@index([periodStart, periodEnd])`
- Index: `@@index([deletedAt])`

---

### SellerPayout (`seller_payouts`)

**Purpose**: Physical electronic funds transfer (BEFTN, RTGS, bKash) disbursing net settled funds to merchant  
**Lifecycle Deletion Policy**: `IMMUTABLE`  

| Column Name | Type | Nullable | Default | Constraints & Relations |
|---|---|---|---|---|
| `id` | `String` | No | `uuid(` | PRIMARY KEY |
| `settlementId` | `String` | No | - | - |
| `sellerId` | `String` | No | - | - |
| `payoutNumber` | `String` | No | - | UNIQUE |
| `channel` | `String` | No | - | - |
| `bankName` | `String` | Yes | - | - |
| `accountNumber` | `String` | Yes | - | - |
| `accountTitle` | `String` | Yes | - | - |
| `routingNumber` | `String` | Yes | - | - |
| `amountPoisha` | `BigInt` | No | - | - |
| `currency` | `String` | No | `"BDT"` | - |
| `status` | `String` | No | `"PENDING"` | - |
| `gatewayReference` | `String` | Yes | - | - |
| `disbursedAt` | `DateTime` | Yes | - | - |
| `failureReason` | `String` | Yes | - | - |
| `version` | `Int` | No | `1` | - |
| `deletedAt` | `DateTime` | Yes | - | - |
| `deletedBy` | `String` | Yes | - | - |
| `createdAt` | `DateTime` | No | `now(` | - |
| `updatedAt` | `DateTime` | No | - | - |
| `settlement` | `SellerSettlement` | No | - | FOREIGN KEY |
| `seller` | `Seller` | No | - | FOREIGN KEY |

**Indexes & Constraints**:
- Index: `@@index([settlementId])`
- Index: `@@index([sellerId, status])`
- Index: `@@index([channel])`
- Index: `@@index([deletedAt])`

---

### PaymentWebhookLog (`payment_webhook_logs`)

**Purpose**: Idempotent webhook event log storing raw payloads, provider signatures, and replay deduplication  
**Lifecycle Deletion Policy**: `IMMUTABLE`  

| Column Name | Type | Nullable | Default | Constraints & Relations |
|---|---|---|---|---|
| `id` | `String` | No | `uuid(` | PRIMARY KEY |
| `gatewayProvider` | `String` | No | - | - |
| `eventType` | `String` | No | - | - |
| `externalEventId` | `String` | Yes | - | - |
| `signature` | `String` | Yes | - | - |
| `payload` | `Json` | No | - | - |
| `status` | `String` | No | `"PENDING"` | - |
| `processedAt` | `DateTime` | Yes | - | - |
| `createdAt` | `DateTime` | No | `now(` | - |

**Indexes & Constraints**:
- Index: `@@index([gatewayProvider, externalEventId])`
- Index: `@@index([status, createdAt])`

---

### Wallet (`wallets`)

**Purpose**: Segregated balance wallets for customers and sellers with explicit holds  
**Lifecycle Deletion Policy**: `SOFT_DELETE`  

| Column Name | Type | Nullable | Default | Constraints & Relations |
|---|---|---|---|---|
| `id` | `String` | No | `uuid(` | PRIMARY KEY |
| `userId` | `String` | Yes | - | - |
| `sellerId` | `String` | Yes | - | - |
| `type` | `String` | No | - | - |
| `currency` | `String` | No | `"BDT"` | - |
| `availablePoisha` | `BigInt` | No | `0` | - |
| `pendingPoisha` | `BigInt` | No | `0` | - |
| `status` | `String` | No | `"ACTIVE"` | - |
| `version` | `Int` | No | `1` | - |
| `deletedAt` | `DateTime` | Yes | - | - |
| `deletedBy` | `String` | Yes | - | - |
| `createdAt` | `DateTime` | No | `now(` | - |
| `updatedAt` | `DateTime` | No | - | - |
| `user` | `User` | Yes | - | FOREIGN KEY |
| `seller` | `Seller` | Yes | - | FOREIGN KEY |
| `postings` | `LedgerPosting[]` | No | - | - |

**Indexes & Constraints**:
- Unique: `@@unique([userId, type])`
- Unique: `@@unique([sellerId, type])`
- Index: `@@index([userId, status])`
- Index: `@@index([sellerId, status])`
- Index: `@@index([type, status])`
- Index: `@@index([deletedAt])`

---

### LedgerAccount (`ledger_accounts`)

**Purpose**: Formal chart of accounts defining double-entry asset, liability, equity, revenue, and expense categories  
**Lifecycle Deletion Policy**: `SOFT_DELETE`  

| Column Name | Type | Nullable | Default | Constraints & Relations |
|---|---|---|---|---|
| `id` | `String` | No | `uuid(` | PRIMARY KEY |
| `code` | `String` | No | - | UNIQUE |
| `name` | `String` | No | - | - |
| `type` | `String` | No | - | - |
| `currency` | `String` | No | `"BDT"` | - |
| `description` | `String` | Yes | - | - |
| `isActive` | `Boolean` | No | `true` | - |
| `version` | `Int` | No | `1` | - |
| `deletedAt` | `DateTime` | Yes | - | - |
| `deletedBy` | `String` | Yes | - | - |
| `createdAt` | `DateTime` | No | `now(` | - |
| `updatedAt` | `DateTime` | No | - | - |
| `postings` | `LedgerPosting[]` | No | - | - |

**Indexes & Constraints**:
- Index: `@@index([type, isActive])`
- Index: `@@index([deletedAt])`

---

### LedgerJournal (`ledger_journals`)

**Purpose**: Atomic, balanced financial transaction header strictly conserving Sum(Debits) == Sum(Credits)  
**Lifecycle Deletion Policy**: `IMMUTABLE`  

| Column Name | Type | Nullable | Default | Constraints & Relations |
|---|---|---|---|---|
| `id` | `String` | No | `uuid(` | PRIMARY KEY |
| `journalNumber` | `String` | No | - | UNIQUE |
| `description` | `String` | No | - | - |
| `referenceType` | `String` | No | - | - |
| `referenceId` | `String` | Yes | - | - |
| `totalPoisha` | `BigInt` | No | - | - |
| `idempotencyKey` | `String` | Yes | - | UNIQUE |
| `ruleVersion` | `String` | Yes | - | - |
| `reversalOfId` | `String` | Yes | - | UNIQUE |
| `postedAt` | `DateTime` | No | `now(` | - |
| `createdAt` | `DateTime` | No | `now(` | - |
| `originalJournal` | `LedgerJournal` | Yes | - | FOREIGN KEY |
| `reversalJournal` | `LedgerJournal` | Yes | - | FOREIGN KEY |
| `postings` | `LedgerPosting[]` | No | - | - |

**Indexes & Constraints**:
- Index: `@@index([referenceType, referenceId])`
- Index: `@@index([postedAt])`

---

### LedgerPosting (`ledger_postings`)

**Purpose**: Atomic debit or credit posting against a chart of account and optional wallet  
**Lifecycle Deletion Policy**: `IMMUTABLE`  

| Column Name | Type | Nullable | Default | Constraints & Relations |
|---|---|---|---|---|
| `id` | `String` | No | `uuid(` | PRIMARY KEY |
| `journalId` | `String` | No | - | - |
| `accountId` | `String` | No | - | - |
| `walletId` | `String` | Yes | - | - |
| `direction` | `String` | No | - | - |
| `amountPoisha` | `BigInt` | No | - | - |
| `currency` | `String` | No | `"BDT"` | - |
| `description` | `String` | Yes | - | - |
| `createdAt` | `DateTime` | No | `now(` | - |
| `journal` | `LedgerJournal` | No | - | FOREIGN KEY |
| `account` | `LedgerAccount` | No | - | FOREIGN KEY |
| `wallet` | `Wallet` | Yes | - | FOREIGN KEY |

**Indexes & Constraints**:
- Index: `@@index([journalId])`
- Index: `@@index([accountId])`
- Index: `@@index([walletId])`
- Index: `@@index([direction, createdAt])`

---

### PointAccount (`point_accounts`)

**Purpose**: Dedicated loyalty Product Point balance strictly isolated from BDT fiat balances  
**Lifecycle Deletion Policy**: `SOFT_DELETE`  

| Column Name | Type | Nullable | Default | Constraints & Relations |
|---|---|---|---|---|
| `id` | `String` | No | `uuid(` | PRIMARY KEY |
| `userId` | `String` | No | - | UNIQUE |
| `availablePoints` | `Int` | No | `0` | - |
| `pendingPoints` | `Int` | No | `0` | - |
| `lifetimePoints` | `Int` | No | `0` | - |
| `version` | `Int` | No | `1` | - |
| `deletedAt` | `DateTime` | Yes | - | - |
| `deletedBy` | `String` | Yes | - | - |
| `createdAt` | `DateTime` | No | `now(` | - |
| `updatedAt` | `DateTime` | No | - | - |
| `user` | `User` | No | - | FOREIGN KEY |
| `events` | `PointEvent[]` | No | - | - |

**Indexes & Constraints**:
- Index: `@@index([userId])`
- Index: `@@index([deletedAt])`

---

### PointEvent (`point_events`)

**Purpose**: Append-only chronological stream of loyalty token adjustments (earn, release, refund clawback)  
**Lifecycle Deletion Policy**: `IMMUTABLE`  

| Column Name | Type | Nullable | Default | Constraints & Relations |
|---|---|---|---|---|
| `id` | `String` | No | `uuid(` | PRIMARY KEY |
| `pointAccountId` | `String` | No | - | - |
| `eventType` | `String` | No | - | - |
| `points` | `Int` | No | - | - |
| `orderId` | `String` | Yes | - | - |
| `orderItemId` | `String` | Yes | - | - |
| `ruleVersion` | `String` | No | `"v1.0.0"` | - |
| `notes` | `String` | Yes | - | - |
| `createdAt` | `DateTime` | No | `now(` | - |
| `pointAccount` | `PointAccount` | No | - | FOREIGN KEY |

**Indexes & Constraints**:
- Index: `@@index([pointAccountId, createdAt])`
- Index: `@@index([orderId, orderItemId])`
- Index: `@@index([eventType])`

---

### RewardRule (`reward_rules`)

**Purpose**: Versioned administrative split configuration with mandatory 100% basis point sum invariant  
**Lifecycle Deletion Policy**: `SOFT_DELETE`  

| Column Name | Type | Nullable | Default | Constraints & Relations |
|---|---|---|---|---|
| `id` | `String` | No | `uuid(` | PRIMARY KEY |
| `ruleCode` | `String` | No | - | - |
| `version` | `String` | No | `"v1.0.0"` | - |
| `name` | `String` | No | - | - |
| `description` | `String` | Yes | - | - |
| `splits` | `Json` | No | - | - |
| `isActive` | `Boolean` | No | `true` | - |
| `effectiveFrom` | `DateTime` | No | `now(` | - |
| `effectiveTo` | `DateTime` | Yes | - | - |
| `deletedAt` | `DateTime` | Yes | - | - |
| `deletedBy` | `String` | Yes | - | - |
| `createdAt` | `DateTime` | No | `now(` | - |
| `updatedAt` | `DateTime` | No | - | - |
| `allocations` | `RewardAllocation[]` | No | - | - |

**Indexes & Constraints**:
- Unique: `@@unique([ruleCode, version])`
- Index: `@@index([ruleCode, isActive])`
- Index: `@@index([deletedAt])`

---

### RewardAllocation (`reward_allocations`)

**Purpose**: Verifiable calculation snapshot recording reward distributions linked to double-entry journals  
**Lifecycle Deletion Policy**: `IMMUTABLE`  

| Column Name | Type | Nullable | Default | Constraints & Relations |
|---|---|---|---|---|
| `id` | `String` | No | `uuid(` | PRIMARY KEY |
| `ruleId` | `String` | No | - | - |
| `ruleVersion` | `String` | No | - | - |
| `sourceType` | `String` | No | - | - |
| `sourceId` | `String` | No | - | - |
| `beneficiaryType` | `String` | No | - | - |
| `beneficiaryId` | `String` | No | - | - |
| `basisPoisha` | `BigInt` | No | - | - |
| `allocatedPoisha` | `BigInt` | No | - | - |
| `splitBreakdown` | `Json` | No | - | - |
| `journalId` | `String` | Yes | - | - |
| `reversalOfId` | `String` | Yes | - | UNIQUE |
| `createdAt` | `DateTime` | No | `now(` | - |
| `rule` | `RewardRule` | No | - | FOREIGN KEY |

**Indexes & Constraints**:
- Index: `@@index([beneficiaryType, beneficiaryId])`
- Index: `@@index([sourceType, sourceId])`
- Index: `@@index([createdAt])`

---

### RankDefinition (`rank_definitions`)

**Purpose**: Recognition tier and star band definitions with qualification thresholds and pool shares  
**Lifecycle Deletion Policy**: `SOFT_DELETE`  

| Column Name | Type | Nullable | Default | Constraints & Relations |
|---|---|---|---|---|
| `id` | `String` | No | `uuid(` | PRIMARY KEY |
| `category` | `String` | No | - | - |
| `code` | `String` | No | - | - |
| `title` | `String` | No | - | - |
| `period` | `String` | No | - | - |
| `pointThreshold` | `Int` | Yes | - | - |
| `starPositionMin` | `Int` | Yes | - | - |
| `starPositionMax` | `Int` | Yes | - | - |
| `poolShareBps` | `Int` | Yes | - | - |
| `effectiveFrom` | `DateTime` | No | `now(` | - |
| `effectiveTo` | `DateTime` | Yes | - | - |
| `isActive` | `Boolean` | No | `true` | - |
| `deletedAt` | `DateTime` | Yes | - | - |
| `deletedBy` | `String` | Yes | - | - |
| `createdAt` | `DateTime` | No | `now(` | - |
| `updatedAt` | `DateTime` | No | - | - |
| `userRanks` | `UserRank[]` | No | - | - |

**Indexes & Constraints**:
- Unique: `@@unique([category, code, period])`
- Index: `@@index([category, isActive])`
- Index: `@@index([deletedAt])`

---

### UserRank (`user_ranks`)

**Purpose**: Chronological log of achieved ranks per evaluation period  
**Lifecycle Deletion Policy**: `SOFT_DELETE`  

| Column Name | Type | Nullable | Default | Constraints & Relations |
|---|---|---|---|---|
| `id` | `String` | No | `uuid(` | PRIMARY KEY |
| `userId` | `String` | Yes | - | - |
| `sellerId` | `String` | Yes | - | - |
| `rankDefinitionId` | `String` | No | - | - |
| `period` | `String` | No | - | - |
| `periodDate` | `DateTime` | No | - | - |
| `qualifyingPoints` | `Int` | No | - | - |
| `position` | `Int` | Yes | - | - |
| `rewardAllocatedPoisha` | `BigInt` | No | `0` | - |
| `status` | `String` | No | `"ACTIVE"` | - |
| `deletedAt` | `DateTime` | Yes | - | - |
| `deletedBy` | `String` | Yes | - | - |
| `createdAt` | `DateTime` | No | `now(` | - |
| `updatedAt` | `DateTime` | No | - | - |
| `user` | `User` | Yes | - | FOREIGN KEY |
| `seller` | `Seller` | Yes | - | FOREIGN KEY |
| `rankDefinition` | `RankDefinition` | No | - | FOREIGN KEY |

**Indexes & Constraints**:
- Index: `@@index([userId, rankDefinitionId])`
- Index: `@@index([sellerId, rankDefinitionId])`
- Index: `@@index([period, periodDate])`
- Index: `@@index([deletedAt])`

---

### LeaderboardSnapshot (`leaderboard_snapshots`)

**Purpose**: Historical competitive ranking leaderboard snapshots for daily, weekly, monthly, and yearly awards  
**Lifecycle Deletion Policy**: `IMMUTABLE`  

| Column Name | Type | Nullable | Default | Constraints & Relations |
|---|---|---|---|---|
| `id` | `String` | No | `uuid(` | PRIMARY KEY |
| `category` | `String` | No | - | - |
| `period` | `String` | No | - | - |
| `periodStart` | `DateTime` | No | - | - |
| `periodEnd` | `DateTime` | No | - | - |
| `actorId` | `String` | No | - | - |
| `actorName` | `String` | No | - | - |
| `rankPosition` | `Int` | No | - | - |
| `accumulatedPoints` | `Int` | No | - | - |
| `starBand` | `String` | Yes | - | - |
| `poolShareBps` | `Int` | Yes | - | - |
| `createdAt` | `DateTime` | No | `now(` | - |

**Indexes & Constraints**:
- Unique: `@@unique([category, period, periodStart, rankPosition])`
- Index: `@@index([actorId, period])`
- Index: `@@index([category, period, periodStart])`

---

### UserSession (`user_sessions`)

**Purpose**: Active authentication sessions, device metadata, and refresh token tracking  
**Lifecycle Deletion Policy**: `EPHEMERAL`  

| Column Name | Type | Nullable | Default | Constraints & Relations |
|---|---|---|---|---|
| `id` | `String` | No | `uuid(` | PRIMARY KEY |
| `userId` | `String` | No | - | - |
| `sessionToken` | `String` | No | - | UNIQUE |
| `refreshTokenHash` | `String` | Yes | - | - |
| `deviceInfo` | `String` | Yes | - | - |
| `ipAddress` | `String` | Yes | - | - |
| `userAgent` | `String` | Yes | - | - |
| `clientType` | `String` | No | `"WEB"` | - |
| `expiresAt` | `DateTime` | No | - | - |
| `lastActiveAt` | `DateTime` | No | `now(` | - |
| `isRevoked` | `Boolean` | No | `false` | - |
| `revokedAt` | `DateTime` | Yes | - | - |
| `revokedReason` | `String` | Yes | - | - |
| `createdAt` | `DateTime` | No | `now(` | - |
| `updatedAt` | `DateTime` | No | - | - |
| `user` | `User` | No | - | FOREIGN KEY |

**Indexes & Constraints**:
- Index: `@@index([userId, isRevoked])`
- Index: `@@index([sessionToken])`
- Index: `@@index([expiresAt])`

---

### OtpToken (`otp_tokens`)

**Purpose**: One-time verification tokens for email confirmation, phone SMS OTP, and 2FA  
**Lifecycle Deletion Policy**: `EPHEMERAL`  

| Column Name | Type | Nullable | Default | Constraints & Relations |
|---|---|---|---|---|
| `id` | `String` | No | `uuid(` | PRIMARY KEY |
| `userId` | `String` | Yes | - | - |
| `identifier` | `String` | No | - | - |
| `purpose` | `String` | No | - | - |
| `tokenHash` | `String` | No | - | - |
| `attempts` | `Int` | No | `0` | - |
| `maxAttempts` | `Int` | No | `3` | - |
| `isUsed` | `Boolean` | No | `false` | - |
| `expiresAt` | `DateTime` | No | - | - |
| `createdAt` | `DateTime` | No | `now(` | - |
| `user` | `User` | Yes | - | FOREIGN KEY |

**Indexes & Constraints**:
- Index: `@@index([identifier, purpose, isUsed])`
- Index: `@@index([expiresAt])`

---

### OAuthAccount (`oauth_accounts`)

**Purpose**: Federated identity mappings for third-party providers (Google, Facebook, Apple)  
**Lifecycle Deletion Policy**: `SOFT_DELETE`  

| Column Name | Type | Nullable | Default | Constraints & Relations |
|---|---|---|---|---|
| `id` | `String` | No | `uuid(` | PRIMARY KEY |
| `userId` | `String` | No | - | - |
| `provider` | `String` | No | - | - |
| `providerUserId` | `String` | No | - | - |
| `email` | `String` | Yes | - | - |
| `displayName` | `String` | Yes | - | - |
| `avatarUrl` | `String` | Yes | - | - |
| `accessToken` | `String` | Yes | - | - |
| `refreshToken` | `String` | Yes | - | - |
| `expiresAt` | `DateTime` | Yes | - | - |
| `scope` | `String` | Yes | - | - |
| `metadata` | `Json` | Yes | - | - |
| `createdAt` | `DateTime` | No | `now(` | - |
| `updatedAt` | `DateTime` | No | - | - |
| `user` | `User` | No | - | FOREIGN KEY |

**Indexes & Constraints**:
- Unique: `@@unique([provider, providerUserId])`
- Index: `@@index([userId])`
- Index: `@@index([email])`

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
