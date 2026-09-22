# ADR-0021: PostgreSQL and Prisma Database Foundations Architecture

**Status**: Accepted  
**Date**: 2026-09-22  
**Deciders**: Architecture Team, Data Engineering, DevOps  
**Milestone Reference**: [Milestone 021](../../AlifWorld-300-Milestones/021-configure-postgresql-and-prisma-foundations.md)  
**Phase**: Phase 03: Data Architecture  

---

## Context and Problem Statement

With Phase 01 (Governance) and Phase 02 (Repository and Tooling) complete, AlifWorld requires a robust, scalable data persistence layer for Phase 03 (Data Architecture). As a single-application modular monolith hosting Storefront, Seller Center, Admin Backoffice, and Worker processes, the persistence architecture must:
1. Provide type-safe queries and compile-time schema validation across all application modules.
2. Prevent connection pool exhaustion during Next.js App Router hot-module replacement (HMR) and development cycles.
3. Map database-level exceptions (e.g., unique constraint violations, foreign key failures) to domain `AppError` types without leaking SQL statements, column names, or schema internals to API clients.
4. Support the Transactional Outbox pattern for asynchronous worker decoupling via BullMQ.
5. Provide multi-tenant isolation safeguards at repository boundaries.
6. Support deterministic, idempotent database seeding and migration deployment.

## Decision Drivers

- **Type Safety**: End-to-end TypeScript alignment from database tables to API Zod schemas.
- **Connection Efficiency**: Bounded connection pooling supporting both web instances and worker daemons.
- **Security & Privacy**: Zero leakage of database schema identifiers or query strings in HTTP responses.
- **Auditability & Traceability**: Dedicated foundational tables for system configuration, health probes, transactional outbox events, and immutable audit logs.
- **Resilience**: Non-blocking readiness checks that report database health telemetry without crashing processes during boot.

## Considered Options

1. **Bare `pg` / Kysely Query Builder**:
   - *Pros*: Lightweight, minimal abstraction overhead.
   - *Cons*: Lacks integrated schema migrations, requires extensive manual boilerplate for relationship mapping and DDL tracking.
2. **TypeORM / MikroORM**:
   - *Pros*: Rich Active Record or Data Mapper implementations.
   - *Cons*: High decorator complexity, heavy runtime metaprogramming, complex TypeScript configuration conflicts with Next.js Turbopack and Bun.
3. **Prisma ORM 5+ with PostgreSQL 16 (Selected)**:
   - *Pros*: Declarative schema definition, automated type-safe client generation, robust migrations (`prisma migrate`), native connection pooling, and seamless Next.js App Router integration.

---

## Decision Outcome & Detailed Rationale

We have adopted **Prisma ORM 5+ with PostgreSQL 16** as the authoritative data access foundation.

### 1. Singleton Connection Management
We implement a global singleton pattern (`globalForPrisma.prisma`) in `src/shared/database/prisma.ts` to preserve a single client instance across Next.js development hot reloads. In production, a single instance is instantiated per process container.

### 2. Foundational Database Schema (`prisma/schema.prisma`)
The foundational schema defines four core infrastructure models:
- **`SystemConfig` (`system_configs`)**: Key-value platform parameters, rule versions, and feature toggles.
- **`HealthProbe` (`health_probes`)**: Time-series health check telemetry and probe execution logs.
- **`OutboxEvent` (`outbox_events`)**: Transactional outbox storage for guaranteed at-least-once domain event processing.
- **`AuditLog` (`audit_logs`)**: Immutable security, administrative, and compliance audit trail.

### 3. Naming and Physical Storage Conventions
- Models and fields use TypeScript conventions (`SystemConfig`, `probeType`).
- Tables and columns use snake_case via explicit `@@map("table_name")` and `@map("column_name")`.
- All primary keys use UUID strings (`@id @default(uuid())`).
- Explicit timestamp columns (`created_at`, `updated_at`) are maintained on all models.

### 4. Database Error Translation Hierarchy
`translateDatabaseError` intercepts Prisma runtime errors and transforms them into domain exceptions:
- `P2002` (Unique constraint) $\rightarrow$ `ConflictError` (HTTP 409)
- `P2025` (Record not found) $\rightarrow$ `NotFoundError` (HTTP 404)
- `P2003` / `P2000` / `P2014` (Constraints) $\rightarrow$ `ValidationError` (HTTP 422)
- `P2024` (Pool timeout) $\rightarrow$ `InternalServerError` (HTTP 500)

### 5. Repository Layer Architecture
All repositories inherit from `BaseRepository`:
- Enforces scoped execution and automatic error translation.
- Provides `withTransaction` for interactive ACID transactions.
- Provides `assertSellerScope` for strict tenant boundary protection.
- Standardizes offset pagination (`parseOffsetPagination`, `formatPaginatedResult`).

### 6. Idempotent Seed Script
`prisma/seed.ts` seeds base platform configuration (`PLATFORM_CURRENCY: 'BDT'`, `PLATFORM_TIMEZONE: 'Asia/Dhaka'`, `MAX_AFFILIATE_DEPTH: 1`, `FEATURE_POINTS_CASH_CONVERTIBLE: false`) using idempotent `upsert` queries.

---

## Consequences

### Positive:
- Single declarative source of truth for database schema in `prisma/schema.prisma`.
- End-to-end type safety eliminates runtime column typo bugs.
- Prevents database connection exhaustion under Next.js development.
- Zero database schema or SQL error leakage to client applications.
- Built-in transactional outbox and audit logging tables ready for Phase 03 domain modeling.

### Negative / Trade-offs:
- Prisma Client requires code generation (`prisma generate`) upon schema updates.
- Slightly higher memory footprint per container instance compared to bare SQL drivers.

---

## Compliance & Verification Rules

1. **Zero Secret Leakage**: No database password or raw connection URL may appear in error objects or log outputs.
2. **Tenant Scoping**: All seller-scoped repository queries must verify tenant ownership before returning or mutating data.
3. **Integer Money**: All monetary fields in Prisma models must represent integer minor units (poisha).
4. **Automated Verification**: All database unit and integration tests must pass with 100% success rate in `bun run test`.
