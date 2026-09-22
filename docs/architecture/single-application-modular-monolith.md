# AlifWorld Single-Application Modular Monolith Architecture

**Document Type**: System Architecture Specification & Engineering Blueprint  
**Phase Reference**: Phase 01 — Governance and Architecture  
**Milestone Reference**: [Milestone 006](../../AlifWorld-300-Milestones/006-single-application-modular-monolith-architecture-decisions.md)  
**Status**: Authoritative & Mandatory  

---

## 1. Architectural Philosophy & Monolith Rationale

AlifWorld adopts a **Single-Codebase Next.js Modular Monolith** architecture. While modern enterprise platforms frequently fall into the trap of premature microservices—introducing distributed network overhead, complex saga orchestration, eventual consistency failures, and deployment friction—AlifWorld unifies all operational surfaces into a single TypeScript repository while maintaining strict internal domain boundaries.

```
+---------------------------------------------------------------------------------------+
|                                ALIFWORLD SYSTEM TOPOLOGY                              |
|                                                                                       |
|  [ Ingress / Load Balancer (SSL Termination, DDoS Mitigation, Geo-Routing) ]          |
|                                       │                                               |
|                    ┌──────────────────┴──────────────────┐                            |
|                    ▼                                     ▼                            |
|        [ Web Container Instances ]           [ Worker Container Instances ]           |
|        - Next.js App Router (Port 3000)      - BullMQ Queue Processors                |
|        - Storefront / Seller / Admin UI      - Recurring Cron Jobs (Asia/Dhaka)       |
|        - Route Handlers (/app/api/v1)        - Outbox Event Dispatchers               |
|                    │                                     │                            |
|                    └──────────────────┬──────────────────┘                            |
|                                       │                                               |
|                    ┌──────────────────┼──────────────────┐                            |
|                    ▼                  ▼                  ▼                            |
|          [ PostgreSQL Database ]   [ Redis Cluster ]   [ S3 Storage / Meilisearch ]   |
|          - Master (Read/Write)     - Locks & Cache     - Permanent Media Assets       |
|          - Read Replicas           - BullMQ Queues     - Product Index + PG Fallback  |
+---------------------------------------------------------------------------------------+
```

### Key Architectural Benefits:
1. **Atomic Cross-Domain Transactions**: Consistent checkout and ledger postings execute inside native PostgreSQL transactions without distributed 2PC or complex sagas.
2. **Zero In-Process Network Latency**: Internal domain communication executes in memory via typed TypeScript service calls with sub-millisecond overhead.
3. **Single Build & Deployment Pipeline**: A single Docker container image packages both the Next.js web application and the BullMQ background worker daemon.
4. **Code Reuse & Type Sharing**: Zod validation schemas, domain types, and brand constants are shared seamlessly between frontend views, route handlers, and asynchronous jobs.

---

## 2. Directory Structure & Module Packaging

The codebase organizes boundaries strictly by capability:

```
alifworld/
├── app/                                # Presentation Tier (Next.js App Router)
│   ├── (store)/                        # Public Customer Storefront & SEO SSR Pages
│   │   ├── [locale]/                   # Bilingual Routing (en-BD / bn-BD)
│   │   │   ├── catalog/                # Product Browsing, Facets, Categories
│   │   │   ├── cart/                   # Shopping Cart Experience
│   │   │   └── checkout/               # Multi-vendor Checkout Flow
│   ├── seller/                         # Multi-Tenant Seller Operations Console
│   ├── admin/                          # Professional Platform Governance Console
│   └── api/v1/                         # REST Route Handlers (Flutter & Web API)
├── features/                           # Feature-Level Modules (Components, Hooks, UI state)
│   ├── auth/                           # Authentication, OTP & Session UI
│   ├── catalog/                        # Product Card, Gallery, Variant Picker
│   ├── checkout/                       # Checkout Steps, Address Selector
│   └── wallet/                         # Ledger Statement, Passbook, Club UI
├── services/                           # Domain Services Tier (Pure Business Logic)
│   ├── calculations/                   # Pure Stateless Calculation Engines (Prices, Splits)
│   ├── outbox/                         # Transactional Outbox Event Dispatcher
│   ├── iam.service.ts                  # User, Auth & RBAC Operations
│   ├── seller.service.ts               # Seller Onboarding & KYC Workflows
│   ├── catalog.service.ts              # Product Lifecycle & Approvals
│   ├── order.service.ts                # Order & Fulfillment State Machines
│   ├── payment.service.ts              # Payment Intent & Webhook Orchestration
│   ├── ledger.service.ts               # Double-Entry Wallet Accounting
│   └── points.service.ts               # Product Points Engine
├── repositories/                       # Data Access Tier (Prisma Queries & Tenant Isolation)
│   ├── user.repository.ts
│   ├── seller.repository.ts
│   ├── order.repository.ts
│   └── ledger.repository.ts
├── prisma/                             # Persistence Tier
│   ├── schema.prisma                   # Normalized Relational Data Model
│   ├── migrations/                     # Versioned, Reversible Migration Scripts
│   └── seeds/                          # Idempotent Database Baseline Seeds
├── workers/                            # Asynchronous Queue Processing Tier
│   ├── index.ts                        # BullMQ Worker Entrypoint
│   ├── outbox.worker.ts                # Outbox Event Processor
│   ├── notification.worker.ts          # Email / SMS / Push Dispatchers
│   └── settlement.worker.ts            # Periodic Club & Commission Settlements
├── shared/                             # Shared Utilities & Infrastructure
│   ├── constants/                      # Brand Colors, System Limits
│   ├── types/                          # Domain Primitives (Poisha, ProductPoint)
│   └── adapters/                       # S3, Redis, Meilisearch, SMS Gateways
└── docs/                               # Architectural Governance & Documentation
```

---

## 3. Four-Tier Layering & Dependency Invariants

Dependencies strictly flow downward. Reverse dependencies or layer skipping are architectural violations:

```
[ Tier 1: Presentation (app/*) ]
               │
               ▼ (Calls only Domain Services)
[ Tier 2: Domain Services & Pure Calculations (services/*) ]
               │
               ▼ (Calls only Repositories or Outbox)
[ Tier 3: Data Repositories (repositories/*) ]
               │
               ▼ (Executes scoped Prisma queries)
[ Tier 4: Database & Infrastructure (PostgreSQL, Redis, S3) ]
```

### Layer Constraints:
1. **Route Handlers (`app/api/v1/*`)**: Must remain thin. Responsible only for extracting headers, validating requests with Zod, calling a Domain Service, and returning standardized JSON envelopes. **Zero SQL queries or business state transitions allowed in route handlers.**
2. **Domain Services (`services/*`)**: The sole orchestrators of business transactions, state machines, and outbox event emissions. Domain services never inspect raw HTTP requests or mutate tables of other domains directly.
3. **Pure Calculation Engines (`services/calculations/*`)**: Deterministic functions without database or network I/O. Given identical inputs, they produce identical outputs with explicit integer poisha rounding.
4. **Data Repositories (`repositories/*`)**: Encapsulate all Prisma database queries. Every query must enforce tenant filtering (`seller_id`) and field selection budgets.

---

## 4. Inter-Domain Communication & Outbox Decoupling

Domains interact through two strictly controlled patterns:

### 4.1 In-Process Synchronous Invocation
Used when immediate consistency is mandatory:
- **Example**: Checkout calls `InventoryService.reserveStock()` inside a database transaction to lock quantities.
- **Rule**: Direct method invocation via typed service interfaces. Cross-domain table mutations are strictly prohibited.

### 4.2 Asynchronous Event Decoupling (Transactional Outbox)
Used for all side-effects and eventual consistency workflows:
- **Example**: An order is marked `COMPLETED`. The `OrderService` atomically writes an event to the `OutboxEvent` table inside the same transaction:
  ```typescript
  await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id }, data: { status: 'COMPLETED' } });
    await tx.outboxEvent.create({
      data: {
        eventType: 'ORDER_COMPLETED',
        aggregateType: 'ORDER',
        aggregateId: id,
        payload: { orderId: id, customerId, totalPoints, sellerId },
        status: 'PENDING',
      },
    });
  });
  ```
- The `outbox.worker.ts` continuously dispatches pending events into BullMQ queues for asynchronous consumption (Point accruals, notifications, settlement updates).

---

## 5. Shared Infrastructure Abstraction Layer

All external dependencies are wrapped in boot-safe, resilient adapters:

| Dependency | Purpose | Abstraction Pattern | Failure / Degradation Strategy |
|:---|:---|:---|:---|
| **PostgreSQL** | Primary relational store | Prisma ORM with connection pooling | Automatic reconnect, read-replica routing |
| **Redis** | Locks, rate limits, queues | Typed Redis client (`shared/adapters/redis`) | Direct PostgreSQL fallback with circuit breaker |
| **BullMQ** | Async job queues | Typed Queue interfaces (`shared/adapters/queue`) | Dead-letter queues with exponential backoff |
| **Meilisearch** | Fast catalog search | Search Adapter (`shared/adapters/search`) | **Automatic PostgreSQL Full-Text Fallback** |
| **S3 Storage** | Permanent media storage | Storage Adapter (`shared/adapters/storage`) | Presigned direct uploads; stateless application |

---

## 6. Process Topologies & Container Deployment

The application compiles into a single multi-stage Docker container image and deploys into two process roles:

```bash
# Role A: Web Application Server (Next.js App Router)
CMD ["bun", "run", "start"]

# Role B: Background Queue Worker (BullMQ & Outbox)
CMD ["bun", "run", "workers/index.ts"]
```

- **Web Role**: Serves public web pages, seller portal, admin console, and REST API handlers. Stateless, horizontally auto-scaled based on HTTP traffic.
- **Worker Role**: Consumes BullMQ jobs, processes outbox events, and executes cron schedules in `Asia/Dhaka` time. Scaled independently based on queue backlog depth.

---

## 7. Architectural Boundary Enforcement

To ensure boundaries are not compromised during autonomous milestone execution:
1. **ESLint Boundary Rules**: Lint rules enforce that `app/api/v1` cannot import from `repositories/` directly (must go through `services/`).
2. **Strict TypeScript Types**: Zero `any` policy; branded `Poisha` and `ProductPoint` types prevent financial bugs at compile time.
3. **Automated CI Validation**: CI pipeline runs `bun run lint`, `bun run typecheck`, and `bun run test` on every pull request.
