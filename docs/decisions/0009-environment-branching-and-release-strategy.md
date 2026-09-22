# ADR 0009: Environment Topology, Trunk-Based Development, and Zero-Downtime Release Strategy

**Status**: Accepted  
**Date**: 2026-09-22  
**Deciders**: AlifWorld Architecture, DevOps & Core Engineering Team  
**Milestone Reference**: [Milestone 009](../../AlifWorld-300-Milestones/009-environment-branching-and-release-strategy.md)  
**Supporting Specification**: [Environment, Branching, and Release Strategy](../architecture/environment-branching-and-release-strategy.md)  

---

## Context and Problem Statement

AlifWorld is designed as a single-codebase modular monolith in Next.js, serving customer storefronts, seller operations, admin workflows, REST APIs for mobile Flutter clients, and asynchronous BullMQ background workers.

Because the system manages financial ledgers, transactional order processing, and strict regulatory compliance requirements in Bangladesh:
1. System downtime during deployments causes lost transactions, abandoned carts, and potential ledger race conditions.
2. Naive database migrations (e.g., dropping or renaming columns in lockstep with new code) immediately crash active running instances during rolling deployments.
3. Complex, long-lived git feature branches (GitFlow) lead to massive merge debt and destabilize release quality.
4. Regulatory and high-risk features (lotteries, multi-tier MLM structures, term deposits) must be decoupled from code deployment to prevent unauthorized activation before regulatory clearance.

A formal Architecture Decision Record is required to define the environment tiers, branching model, zero-downtime release workflow, database migration safety rules, and feature gating.

---

## Decision Drivers

- **Zero Downtime**: Active consumer checkouts and financial ledger postings must not be interrupted by application updates.
- **Continuous Delivery Velocity**: Engineering teams must be able to merge and deliver code rapidly without multi-week merge conflicts.
- **Persistence & Rollback Safety**: Schema changes must be backward-compatible, allowing instant application rollbacks without database corruption.
- **Strict Compliance & Security**: Gate sensitive features behind dark-launch flags, and ensure production secrets are never leaked into lower environments or repository files.

---

## Decision Outcome

The AlifWorld engineering architecture formally adopts the **Environment Topology, Trunk-Based Development, and Zero-Downtime Release Strategy**:

### 1. Four-Tier Environment Model
- **Local (`local`)**: Developer workstations running local PostgreSQL, Redis, MinIO, and mock external adapters.
- **Development (`development`)**: Shared integration environment and ephemeral PR preview deployments.
- **Staging (`staging`)**: Exact replica of production topology, anonymized data, and official sandbox MFS/courier gateways. Mandatory UAT and compliance validation gate before production release.
- **Production (`production`)**: Multi-instance stateless Next.js web application behind load balancers, dedicated BullMQ workers, high-availability PostgreSQL with read replicas, Redis cluster, and enterprise S3 storage.

### 2. Trunk-Based Development (TBD)
- Single authoritative trunk branch: `main`.
- All work enters via short-lived feature or fix branches (`feat/*`, `fix/*`, `chore/*`, `docs/*`) with a maximum lifespan of 48 hours.
- Direct pushes to `main` are prohibited. Merges require passing automated CI checks (lint, typecheck, tests, OpenAPI validation, Next.js build verification) and peer review.
- Squash-and-merge or rebase-and-merge with Conventional Commits (`feat:`, `fix:`, `refactor:`, etc.).

### 3. Zero-Downtime Deployments & Health Probes
- Immutable container artifacts built once in CI and promoted across environments.
- Rolling / Canary updates with standardized probe endpoints:
  - `/api/health/live`: Liveness check for process responsiveness.
  - `/api/health/ready`: Readiness check verifying PostgreSQL, Redis, and pending migration status before accepting traffic.
- Graceful shutdown handling on `SIGTERM`: 30-second drain period for in-flight requests and pausing BullMQ workers.

### 4. Expand-and-Contract Database Migrations
- Schema evolution must be additive and two-phase. Single-step destructive operations (`DROP COLUMN`, `RENAME COLUMN`, `NOT NULL` without default) are strictly forbidden during live deployments.
- Phase 1 (Expand): Deploy additive schema changes and dual-writing code.
- Phase 2 (Migrate): Backfill historical rows asynchronously.
- Phase 3 (Contract): Deprecate and drop legacy columns in a subsequent release after 100% verification.

### 5. Decoupled Deployment via Compliance Feature Flags
- Code is deployed "dark". High-risk features (GATE-01 through GATE-07) default to disabled (`false`) at runtime.
- Unauthorized access returns HTTP `403 Forbidden` with machine code `FEATURE_PENDING_REGULATORY_APPROVAL`.

---

## Consequences

### Positive:
- Ensures 99.9% availability for critical commerce and financial ledger operations.
- Eliminates "big bang" release failures and catastrophic merge debt.
- Enables safe, instant code rollbacks in under 2 minutes without database restoration.
- Guarantees regulatory compliance through feature-flag decoupling.

### Negative:
- Requires discipline to execute schema alterations in multi-phase releases (Expand-and-Contract) instead of immediate destructive edits.
- Requires dedicated sandbox credentials and mock configurations for local and staging environments.
