# AlifWorld Project Charter & System Architecture

**Project Name**: AlifWorld  
**Document Type**: Architectural Charter & Governance Foundation  
**Phase**: Phase 01 — Governance and Architecture  
**Milestone Reference**: [Milestone 001](../../AlifWorld-300-Milestones/001-project-charter-source-authority-and-ai-execution-protocol.md)  
**Launch Currency**: Bangladeshi Taka (BDT, represented in integer poisha)  
**Launch Locales**: `en-BD` (English - Bangladesh), `bn-BD` (Bangla - Bangladesh)  
**Platform Timezone**: `Asia/Dhaka` (UTC+06:00)  
**Architecture Model**: Single-Codebase Next.js Modular Monolith  

---

## 1. Executive Summary & Vision

AlifWorld is an enterprise multi-vendor e-commerce platform and digital commercial ecosystem purpose-built for high-concurrency commerce in Bangladesh and connected regional markets. The platform seamlessly integrates:

1. **Multi-Vendor Retail Commerce**: Scalable storefront, hierarchical catalog, multi-warehouse inventory, and split-order fulfillment across independent sellers.
2. **Dynamic Reward & Club Ledgers**: High-volume customer reward tiers, loyalty cashback, customer star clubs, seller star clubs, and rank bonuses governed by strict accounting ledgers.
3. **Regional Distribution & Partner Commissions**: Multi-tier geographic division, district, and upazila commission distribution for affiliated service points and regional representatives.
4. **Omnichannel & Mobile Integration**: Flutter-compatible REST Route Handlers (`/app/api/v1`) with generated OpenAPI specifications, synchronized with web storefront and portal experiences.
5. **Brand Authority & Aesthetic Precision**: A distinctive visual identity built on deep black, pure white, energetic brand orange, and international world blues.

---

## 2. Locked Architectural Constraints

To prevent architectural drift, maintain operational simplicity, and guarantee high system reliability, the following constraints are immutable across all milestones:

### 2.1 Single-Deployable Next.js Modular Monolith
- All platform capabilities—Customer Storefront, Admin Operations, Seller Center, REST APIs (`/app/api/v1`), and BullMQ background workers—reside in **one deployable Next.js application repository**.
- Microservices, separate backend frameworks (e.g. Express/NestJS/Django), or external API gateways are strictly prohibited.
- Modular isolation is enforced within the directory structure (`app/`, `features/`, `services/`, `repositories/`, `prisma/`, `workers/`).

### 2.2 Core Technology Stack
- **Language & Runtime**: TypeScript (strict mode enabled, zero `any` policy), executed on Bun runtime.
- **Framework**: Next.js (App Router, Server Components by default, Client Components strictly for local interactivity).
- **API Surface**: Next.js Route Handlers strictly located under `/app/api/v1`.
- **Primary Persistence**: PostgreSQL managed exclusively through Prisma ORM.
- **Distributed Cache & Coordination**: Redis for distributed caching, session tracking, distributed locks, and API rate limiting.
- **Asynchronous Task Processing**: BullMQ queues with separate worker processes, employing transactional outbox patterns.
- **Permanent File Storage**: S3-compatible object storage (e.g., AWS S3, Cloudflare R2, or MinIO). The application filesystem remains 100% stateless.
- **Search & Discovery**: Meilisearch search adapter equipped with an automatic, boot-safe PostgreSQL fallback to ensure uninterrupted operation during external search engine downtime.

### 2.3 Financial Invariants & Currency Engineering
- **Monetary Unit**: All monetary values are recorded exclusively in Bangladeshi Taka (BDT) as **64-bit integer minor units (poisha)**, where `1 BDT = 100 poisha`. Floating-point arithmetic for currency is strictly prohibited.
- **Independent Product Points**: Product price (BDT) and Product Points (PP) are distinct, independent dimensions. Product Points are explicitly defined by the seller during product creation. **The system must never infer or compute an automatic conversion rate between BDT and Product Points.**
- **Point Snapshotting**: Both product price and Product Point values are immutably snapshotted onto order items at the time of checkout. Points are accrued as `productPointSnapshot * eligibleQuantity` only when the order reaches the confirmed, non-returnable eligible order status.
- **Double-Entry Wallet Accounting**: All financial, wallet, and point ledger entries are recorded as balanced double-entry transactions (debit = credit). Wallets never modify raw balances in place without an immutable ledger posting.

### 2.4 Business Rule Versioning & Historical Immutability
- All commission splits, reward percentages, customer/seller club tiers, qualification thresholds, and period cutoffs are managed through **versioned Admin configurations**.
- Every financial calculation, reward accrual, and commission distribution references an explicit rule configuration version ID. Historical transactions retain their original rule version and are never recalculated retrospectively.

### 2.5 Security, Authorization & Tenant Isolation
- Every protected endpoint and mutation enforces server-side authentication, role-based permission evaluation, and strict seller-tenant scoping.
- UI visibility toggles are never treated as authorization boundaries.
- The platform enforces Super Admin vs. Admin privilege separation, seller staff scoped roles, and complete multi-tenant database query scoping.

### 2.6 Contract-Driven Mobile Integration
- Route Handlers under `/app/api/v1` are designed to be consumed by Flutter mobile clients and web interfaces alike.
- Schemas are defined in typed Zod validators that automatically produce OpenAPI documentation. Manual or divergent API documentation is forbidden.

---

## 3. Brand Authority & Visual Identity Governance

Derived from the authoritative brand assets (`colors.md` and `logo.png`), the AlifWorld design system follows a clear visual language:

```
+-------------------------------------------------------------------------+
|                                ALIF [Globe]                             |
|                                \___________/                            |
|                                (Orange Smile)                           |
+-------------------------------------------------------------------------+
```

### 3.1 Authoritative Color Tokens

| Token Name | Hex Code | Primary UI Application |
|:---|:---:|:---|
| **Alif Black** | `#000000` | Main application background, primary navigation, footers, dark mode cards, high-contrast surfaces |
| **Alif White** | `#FFFFFF` | Primary typography, logos, inverted cards, icons, high-contrast badges |
| **Brand Orange** | `#FF6A00` | Primary interactive buttons (CTAs), focus rings, active links, accents, brand smiles |
| **Globe Blue** | `#4F8FD9` | Primary globe body, international accents, secondary brand elements |
| **Globe Light Blue** | `#69B7E8` | Globe landmass highlights, soft badges, subtle secondary accents |
| **Globe Dark Blue** | `#3456A3` | Globe depth, shadow contours, dark accents |

### 3.2 Standardized CSS Variable Specification
```css
:root {
  --alif-black: #000000;
  --alif-white: #FFFFFF;
  --alif-orange: #FF6A00;
  --alif-globe-blue: #4F8FD9;
  --alif-globe-light: #69B7E8;
  --alif-globe-dark: #3456A3;

  /* Derived functional semantics */
  --alif-bg-primary: var(--alif-black);
  --alif-text-primary: var(--alif-white);
  --alif-accent-interactive: var(--alif-orange);
  --alif-brand-globe: var(--alif-globe-blue);
}
```

### 3.3 Visual Rules & Invariants
1. **Foundation**: Pure black (`#000000`) and crisp white (`#FFFFFF`) form the foundational contrast.
2. **Interactive Hierarchy**: Brand Orange (`#FF6A00`) is reserved for primary actions, critical interactive cues, and brand emphasis. It is never diluted by competing bright colors.
3. **Globe Symbolism**: The blue globe is an authoritative emblem of global reach and connection. **The globe must never be rendered as a typographical replacement for the letter 'O'**. It sits alongside "ALIF" as a dedicated brand emblem.
4. **Color Discipline**: Avoid introducing unnecessary peripheral color palettes to ensure consistent brand recognition across Storefront, Seller, Admin, and Mobile experiences.

---

## 4. User Personas & System Actors

| Actor | Security Scope | Primary Responsibilities |
|:---|:---|:---|
| **Customer** | Scoped to own account (`customer_id`) | Browse catalog, manage carts, execute checkout, track orders, view loyalty points, participate in Customer Clubs and Star leaderboards, manage address books. |
| **Seller** | Scoped to own tenant (`seller_id`) | Manage store profile, configure shipping/tax defaults, manage products & inventory, pack and fulfill order items, inspect seller ledger, join Seller Clubs. |
| **Seller Staff** | Scoped to assigned store and permissions | Sub-role under seller tenant (e.g., Inventory Manager, Order Processor) with restricted capabilities. |
| **Rider / Delivery** | Scoped to assigned deliveries (`rider_id`) | Accept available delivery tasks, record GPS checkpoints, verify pickup, deliver packages with OTP verification. |
| **Admin** | Role-based operational access | Approve seller KYC, moderate catalog submissions, review support tickets, oversee daily operational metrics, configure platform settings. |
| **Super Admin** | Unrestricted platform authority | Manage system administrators, configure financial rule versions, review audit logs, execute maker-checker approvals on financial ledger adjustments. |
| **Support Agent** | Scoped to customer service queues | Handle customer disputes, view redacted order logs, process return reviews within authorization thresholds. |
| **System Worker** | Machine token / internal identity | Process background queues (BullMQ), reconcile payments, calculate periodic club settlements, generate scheduled reports. |

---

## 5. Domain Architecture & Separation of Concerns

The codebase enforces strict separation of concerns across four primary tiers:

```
[ HTTP Route Handlers / Pages ] (app/api/v1, app/(store), app/admin, app/seller)
              │
              ▼
[ Domain Services ] (services/*, features/* - Pure business logic & transactions)
              │
              ▼
[ Data Repositories ] (repositories/* - Scoped Prisma queries, field selections)
              │
              ▼
[ Persistence & State ] (PostgreSQL / Redis / BullMQ / S3)
```

1. **Route Handlers (`app/api/v1`)**: Thin controllers responsible only for HTTP envelope handling, authentication extraction, Zod payload validation, calling domain services, and returning standard HTTP status codes.
2. **Domain Services (`services/`)**: The sole owners of transactional integrity, domain state machines, business rule execution, audit emission, and outbox event publishing. Pure business decisions; no raw HTTP request/response handling.
3. **Pure Calculation Engines (`services/calculations/`)**: Stateless, deterministic pure functions with explicit time and configuration parameters. Responsible for price calculations, commission splits, and point awards. Highly unit-tested.
4. **Data Repositories (`repositories/`)**: Encapsulate all database interaction via Prisma. Enforce tenant filtering (`seller_id`, `user_id`), optimized field selection, and pagination constraints.
5. **Background Workers (`workers/`)**: Process asynchronous tasks via BullMQ (e.g. notifications, invoice PDF generation, search index updates, periodic club settlement jobs).

---

## 6. Approval Gates & Financial Ambiguity Safeguards

Later milestones must not bypass unresolved business-rule gates. The 7 explicit approval gates defined in the project charter:

1. **Eligible Order Status Gate**: Final determination of order state triggering Product Point and reward issuance.
2. **Profit/Reward Pool Funding Gate**: Authoritative accounting definition and funding source for each profit pool.
3. **Rank Bonus Qualification Gate**: Verified qualification formulas for Customer and Seller Rank bonuses.
4. **Customer Club Period Gate**: Confirmation of club cycle cadences.
5. **Advanced Shopping Wallet Gate**: Complete legal and operational rule sign-off for deposit tenures, returns, and withdrawals.
6. **BDT Package Pricing Gate**: Formal BDT catalogue pricing for advertising/subscription packages.
7. **Territory Compliance Gate**: Legal, tax, and consumer-protection certification for launch jurisdictions.

---

## 7. Sign-off & Authority

This charter stands as the baseline governance document for AlifWorld. Any future architectural modification requires an explicit Architecture Decision Record (ADR) approved in compliance with the Source Authority hierarchy.
