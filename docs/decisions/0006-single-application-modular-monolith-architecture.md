# ADR 0006: Single-Application Modular Monolith Architectural Decisions

**Status**: Accepted  
**Date**: 2026-09-22  
**Deciders**: AlifWorld Architecture & Engineering Governance Team  
**Milestone Reference**: [Milestone 006](../../AlifWorld-300-Milestones/006-single-application-modular-monolith-architecture-decisions.md)  
**Supporting Specification**: [Single-Application Modular Monolith Architecture](../architecture/single-application-modular-monolith.md)  

---

## Context and Problem Statement

Building a multi-vendor e-commerce platform with complex loyalty programs, seller clubs, and regional distribution networks presents a critical architectural choice:
1. **Option 1 (Distributed Microservices)**: Split into multiple repositories and services (Auth Service, Catalog Service, Order Service, Ledger Service, Notification Service).
2. **Option 2 (Single-Deployable Modular Monolith)**: Unify Storefront, Admin, Seller, REST API (`/app/api/v1`), and BullMQ background workers in a single TypeScript Next.js repository with strictly enforced domain boundaries.

Microservices introduce significant operational overhead (distributed tracing, network latency, distributed transactions, multi-repo CI/CD complexity) that is unwarranted and counterproductive for AlifWorld. However, an unconstrained monolith risks becoming an unmaintainable "big ball of mud" without architectural discipline.

A definitive Architecture Decision Record is required to formalize the single-application modular monolith structure and enforce its boundaries.

---

## Decision Drivers

- **Transactional Atomicity**: Ability to execute multi-item stock reservations and ledger entries within native ACID database transactions.
- **Operational Simplicity**: Single repository, unified type system, and single Docker container build pipeline.
- **Low Overhead**: Zero network hops for inter-module service calls.
- **Strict Boundary Enforcement**: Enforcing domain separation through directory conventions, repository encapsulation, and outbox event decoupling.

---

## Decision Outcome

AlifWorld officially adopts the **Single-Codebase Next.js Modular Monolith**:

### 1. Unified Single-Repository Architecture
All application surfaces—Public Storefront, Seller Center, Admin Operations, REST Route Handlers (`/app/api/v1`), and BullMQ workers—reside in one repository and share a single Prisma schema, Zod validation layer, and brand token definitions. Microservices or separate backend frameworks are strictly prohibited.

### 2. Four-Tier Dependency Discipline
Code must strictly follow the top-to-bottom dependency hierarchy:
- **Presentation Tier (`app/*`)**: Thin Route Handlers and React Server Components. Calls only Domain Services.
- **Domain Services Tier (`services/*`)**: Orchestrates business logic, state machines, and outbox event publishing. Calls Repositories.
- **Pure Calculation Engines (`services/calculations/*`)**: Deterministic functions with zero I/O side-effects.
- **Data Repositories (`repositories/*`)**: Scoped Prisma queries enforcing tenant isolation (`seller_id`) and field budgets.
- **Persistence & Infrastructure (`prisma/*`, `shared/adapters/*`)**: PostgreSQL, Redis, BullMQ, S3, Meilisearch.

### 3. Asynchronous Side-Effect Decoupling (Transactional Outbox)
No synchronous network calls or heavy background processing are allowed inside user-facing request cycles. All side-effects (loyalty point accrual, seller settlement, notification emails, search indexing) are written atomically to an `OutboxEvent` table inside the database transaction and processed asynchronously by BullMQ workers.

### 4. Dual Process Deployment from Single Container
The application produces a single production Docker container image capable of running either:
- **Web Application Process**: `next start` (serving HTTP routes and SSR pages).
- **Worker Daemon Process**: `bun run workers/index.ts` (consuming BullMQ queues and outbox events).

### 5. Resilient Infrastructure Adapters
All external systems are encapsulated behind boot-safe adapters:
- Meilisearch is paired with an automatic PostgreSQL full-text search fallback.
- Redis caching gracefully degrades to database queries if the cache cluster is temporarily unreachable.

---

## Consequences

### Positive:
- Dramatically simplifies development, continuous integration, and local testing.
- Eliminates distributed transaction failures and saga rollbacks for core e-commerce checkouts.
- Enables seamless sharing of TypeScript types, brand design tokens, and Zod schemas across web, API, and worker tiers.
- Allows independent horizontal scaling of web pods and worker pods from the same build artifact.

### Negative / Trade-offs:
- Requires strict automated linting and code review to prevent developers from bypassing service layers.
- Shared database connection pool must be monitored to prevent worker jobs from starving web route handlers.

---

## Compliance and Verification

- **Milestone 013**: Will establish directory structure and module boundaries in code.
- **Milestone 015**: Will configure ESLint boundary rules preventing presentation layers from accessing repositories directly.
- **Milestone 267**: Will verify stateless horizontal scaling of the single monolith behind a load balancer.
