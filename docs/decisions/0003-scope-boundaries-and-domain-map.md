# ADR 0003: Scope Boundaries, Bounded Contexts, and Modular Monolith Architecture

**Status**: Accepted  
**Date**: 2026-09-22  
**Deciders**: AlifWorld Architecture & Engineering Governance Team  
**Milestone Reference**: [Milestone 003](../../AlifWorld-300-Milestones/003-scope-boundaries-and-modular-domain-map.md)  
**Supporting Specification**: [Scope Boundaries & Modular Domain Map](../architecture/scope-boundaries-and-domain-map.md)  

---

## Context and Problem Statement

The AlifWorld single-application Next.js monolith integrates twenty distinct business functions, spanning retail shopping, multi-vendor seller logistics, double-entry financial ledgers, customer/seller clubs, regional distribution networks, and mobile Flutter APIs.

Without enforced boundaries, monolith codebases rapidly degrade into tightly-coupled, untestable systems where:
1. Controllers execute raw database queries.
2. Services mutate tables belonging to completely different domains.
3. Synchronous cross-domain calls create cascade failures.
4. Business logic becomes entangled with HTTP presentation details.

A definitive architectural decision is required to formalize the domain boundaries, layer responsibilities, and cross-domain interaction rules.

---

## Decision Drivers

- **Domain-Driven Modularity**: Clear separation of business domains to enable independent feature development without microservices.
- **Transactional Safety**: Concurrency-safe transactions for stock reservation, ledger posting, and order state machines.
- **Stateless Horizontal Scalability**: Decoupling long-running tasks via BullMQ and transactional outbox patterns.
- **Mobile-First API Stability**: Contract-first REST API (`/app/api/v1`) using Zod schemas that match Flutter mobile requirements.

---

## Decision Outcome

The AlifWorld architecture officially adopts the **20 Bounded Context Modular Monolith Design**:

### 1. The 20 Bounded Contexts
The domain architecture is segmented into 20 bounded contexts:
1. Identity, Authentication & Access Management (IAM)
2. Seller Management & Multi-Tenant KYC
3. Catalog Taxonomy & Brand Authority
4. Pricing, Discounts, VAT & Promotion Engine
5. Multi-Warehouse Inventory & Atomic Reservations
6. Search, Discovery & Fallback Engine
7. Customer Experience, Carts & Engagement
8. Checkout Orchestration & Shipping Logistics
9. Orders, Fulfillment & RMA Engine
10. Payments, Gateway Integration & Seller Settlement
11. Double-Entry Financial & Wallet Ledger
12. Product Points Engine
13. Customer Loyalty, Star Clubs & Rank Bonuses
14. Seller Clubs, Levels & Leaderboards
15. Regional Distribution & Commissions
16. Lottery, Advertisement & Affiliate Network (Gated)
17. Rider Onboarding & Delivery Logistics
18. Operations Console, Moderation & CMS
19. Background Jobs, Realtime Events & Outbox
20. Versioned REST Route Handlers (`/app/api/v1`)

### 2. Architectural Layering Mandate
All code within the monolith must adhere to a strict 4-layer dependency model:
```
[ Presentation (app/api/v1, app/(store), app/admin, app/seller) ]
                              │ (Calls only Domain Services)
                              ▼
[ Domain Services & Calculations (services/*, features/*) ]
                              │ (Calls only Repositories or Outbox)
                              ▼
[ Data Repositories (repositories/*) ]
                              │ (Executes scoped Prisma queries)
                              ▼
[ Persistence & Infrastructure (PostgreSQL, Redis, BullMQ, S3) ]
```

### 3. Cross-Domain Mutation Prohibition
Direct SQL/Prisma mutations on tables owned by another bounded context are strictly prohibited. A service requiring data or actions from another domain must:
- Call a public Domain Service method (for synchronous operations).
- Or emit an immutable event to the `OutboxEvent` table (for asynchronous operations).

### 4. Asynchronous Decoupling via Transactional Outbox
Side-effects (e.g. email/SMS notifications, reward point accrual, search index synchronization, invoice PDF generation) must never execute synchronously within the customer HTTP request cycle. They must be written atomically to the `OutboxEvent` table inside the primary database transaction and dispatched asynchronously by BullMQ workers.

---

## Consequences

### Positive:
- High modularity prevents the "big ball of mud" syndrome while maintaining single-deployable simplicity.
- Decoupled outbox processing prevents database lock contention and ensures sub-100ms API response times.
- Independent domain repositories guarantee tenant isolation (`seller_id`) at query level.
- Clean contract boundaries allow rapid generation of OpenAPI specs and typed Flutter SDKs.

### Negative / Trade-offs:
- Requires discipline from developers and AI agents to avoid shortcut cross-domain queries.
- Eventual consistency applies to asynchronous side-effects (e.g. point balances update within seconds rather than milliseconds).

---

## Compliance and Verification

- **Code Review**: Every pull request must verify that route handlers do not contain Prisma queries or business logic.
- **Static Analysis**: ESLint rules will enforce import restrictions preventing cross-domain internal repository access.
