# ADR 0017: Bun Command Contract and Lifecycle Scripts Standardization

**Status**: Accepted  
**Date**: 2026-09-22  
**Deciders**: AlifWorld Architecture & DevOps Team  
**Milestone Reference**: [Milestone 017](../../AlifWorld-300-Milestones/017-implement-the-required-bun-command-contract.md)  
**Supporting Specification**: [Bun Command Contract Specification](../architecture/bun-command-contract-and-lifecycle-scripts.md)  

---

## Context and Problem Statement

The AlifWorld platform operates as a single-codebase modular monolith. Without an authoritative, documented command contract across local development, testing, database operations, background jobs, and production deployment, developer experience suffers from command drift, inconsistent CI failure modes, and dangerous misconfigurations (such as accidentally running `next dev` in production).

Milestone 017 requires establishing an authoritative Bun command contract in `package.json`, explicitly providing `dev:local`, `dev:production`, `build:local`, and `production:production`, and guaranteeing that `production:production` executes compiled output, never `next dev`.

A formal Architecture Decision Record is required to lock this lifecycle command contract.

---

## Decision Drivers

- **Zero Production Misconfiguration**: Absolute guarantee that production containers run compiled, optimized outputs (`next start`) and never invoke development servers.
- **Reproducible Engineering Workflow**: Unified command names across developer machines, Docker containers, and CI pipelines via Bun.
- **Complete Operational Coverage**: Standardized scripts for builds, database migrations, background workers, OpenAPI generation, and automated testing suites.
- **Contract Traceability**: Automated test suite asserting the integrity of `package.json` scripts.

---

## Decision Outcome

The AlifWorld engineering architecture formally adopts the **Bun Command Contract and Lifecycle Scripts Standard**:

### 1. Mandatory Core Lifecycle Scripts in `package.json`
- `dev:local`: `next dev` (standard local development server).
- `dev:production`: `NODE_ENV=production next dev` (simulates production runtime behavior in development).
- `build:local`: `next build` (local test build).
- `build:production`: `next build` (containerized production build).
- `production:production`: `next start -p 3000` (**Hard Invariant**: strictly executes compiled output; never calls `next dev`).

### 2. Quality and Verification Scripts
- `lint`: `eslint . --max-warnings 0` (zero-warning tolerance).
- `lint:fix`: `eslint . --fix` (automated lint repair).
- `format`: `prettier --write .` (code formatting).
- `format:check`: `prettier --check .` (format verification).
- `typecheck`: `tsc --noEmit` (strict type analysis).
- `quality`: `bun run lint && bun run typecheck` (pre-commit quality gate).

### 3. Granular Test Suite Scripts
- `test`: `bun test` (full test suite).
- `test:unit`: `bun test tests/unit` (unit tests).
- `test:integration`: `bun test tests/integration` (integration tests).
- `test:e2e`: `bun test tests/e2e` (end-to-end tests).

### 4. Persistence and Migration Lifecycle
- `db:generate`: `prisma generate`.
- `db:migrate`: `prisma migrate dev`.
- `db:migrate:deploy`: `prisma migrate deploy`.
- `db:seed`: `bun run prisma/seed.ts`.
- `db:studio`: `prisma studio`.

### 5. Worker Cluster and OpenAPI Contracts
- `worker`: `bun run src/workers/index.ts` (starts background job cluster with graceful shutdown).
- `openapi`: `bun run scripts/generate-openapi.ts` (generates OpenAPI 3.1 schema JSON).

---

## Consequences

### Positive:
- Establishes a predictable, deterministic operational contract across all development, testing, and deployment stages.
- Guarantees that `production:production` executes compiled artifacts with production optimizations.
- Provides unified tooling for database migrations and worker cluster management.
- Enforces contract compliance via automated unit tests in `tests/unit/bun-command-contract.test.ts`.

### Negative:
- All CI/CD workflows and deployment configurations must strictly call the standardized Bun script names.
