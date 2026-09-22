# AlifWorld Bun Command Contract and Lifecycle Scripts Specification

**Document Type**: Architectural Specification & Lifecycle Operations Guide  
**Milestone Reference**: [Milestone 017](../../AlifWorld-300-Milestones/017-implement-the-required-bun-command-contract.md)  
**Status**: Active / Approved  
**Related Decision**: [ADR-0017](../decisions/0017-bun-command-contract-and-lifecycle-scripts.md)  

---

## 1. Overview and Purpose

The AlifWorld platform is architected as a single-application modular monolith. To ensure reproducibility across local developer machines, continuous integration (CI) pipelines, containerized production environments, and autonomous background workers, a unified lifecycle command contract is established using Bun.

This specification standardizes the exact script contract in [`package.json`](../../package.json) to eliminate configuration drift, prevent accidental development execution in production, and provide deterministic commands for build, test, database, worker, and documentation operations.

---

## 2. Canonical Bun Command Contract

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 BUN COMMAND LIFECYCLE CONTRACT                               │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
           │                                      │                                 │
           ▼                                      ▼                                 ▼
┌─────────────────────────┐            ┌─────────────────────────┐       ┌─────────────────────┐
│  Development & Local    │            │    Production Build     │       │ Verification & QA   │
│  • bun run dev          │            │  • bun run build        │       │ • bun run lint      │
│  • bun run dev:local    │            │  • bun run build:local  │       │ • bun run typecheck │
│  • bun run dev:product. │            │  • bun run build:prod.  │       │ • bun run quality   │
└─────────────────────────┘            └──────────┬──────────────┘       │ • bun run test      │
                                                  │                      └─────────────────────┘
                                                  ▼
                                       ┌─────────────────────────┐
                                       │ Production Execution    │
                                       │  • bun run start        │
                                       │  • bun run prod.:prod.  │
                                       │  (Compiled Output Only) │
                                       └─────────────────────────┘
```

The standard scripts registered in [`package.json`](../../package.json) are categorized below:

### 2.1 Development Lifecycle
| Script | Command | Purpose |
| :--- | :--- | :--- |
| `dev` | `next dev` | Primary development server with Hot Module Replacement (HMR). |
| `dev:local` | `next dev` | Explicit local development server running with local configuration. |
| `dev:production` | `NODE_ENV=production next dev` | Development server simulating production environment flags. |

### 2.2 Compilation and Build Lifecycle
| Script | Command | Purpose |
| :--- | :--- | :--- |
| `build` | `next build` | Standard Next.js production build producing optimized `.next/standalone` output. |
| `build:local` | `next build` | Local verified compilation command used in CI test runs. |
| `build:production` | `next build` | Production container build command. |

### 2.3 Production Execution
| Script | Command | Purpose |
| :--- | :--- | :--- |
| `start` | `next start` | Runs the compiled Next.js application server. |
| `production:production` | `next start -p 3000` | **Locked Invariant**: Runs compiled production output on port 3000. **Never invokes `next dev`**. |

### 2.4 Code Quality, Formatting, and Type Checking
| Script | Command | Purpose |
| :--- | :--- | :--- |
| `lint` | `eslint . --max-warnings 0` | Enforces zero-warning linting across Next.js and React code. |
| `lint:fix` | `eslint . --fix` | Automated autofixing for lint violations. |
| `format` | `prettier --write .` | Formats all source files according to project formatting rules. |
| `format:check` | `prettier --check .` | Verifies code formatting without altering files. |
| `typecheck` | `tsc --noEmit` | Strict type checking without emitting compiler artifacts. |
| `quality` | `bun run lint && bun run typecheck` | Unified quality gate for pre-commit and CI verification. |

### 2.5 Testing Suite
| Script | Command | Purpose |
| :--- | :--- | :--- |
| `test` | `bun test` | Executes the complete Bun test runner across the entire codebase. |
| `test:unit` | `bun test tests/unit` | Executes pure unit tests (calculations, Zod schemas, utilities). |
| `test:integration` | `bun test tests/integration` | Executes integration tests against database and cache adapters. |
| `test:e2e` | `bun test tests/e2e` | Executes end-to-end journey tests. |

### 2.6 Database & Persistence Operations (Prisma)
| Script | Command | Purpose |
| :--- | :--- | :--- |
| `db:generate` | `prisma generate` | Generates typed Prisma Client from `prisma/schema.prisma`. |
| `db:migrate` | `prisma migrate dev` | Applies database migrations in local development. |
| `db:migrate:deploy` | `prisma migrate deploy` | Applies pending migrations safely in staging and production CI/CD. |
| `db:seed` | `bun run prisma/seed.ts` | Idempotently seeds initial catalog, system roles, and configuration. |
| `db:studio` | `prisma studio` | Launches Prisma visual database browser for local administration. |

### 2.7 Asynchronous Background Worker
| Script | Command | Purpose |
| :--- | :--- | :--- |
| `worker` | `bun run src/workers/index.ts` | Launches the BullMQ worker cluster with graceful shutdown (`SIGTERM`, `SIGINT`). |

### 2.8 OpenAPI Generation
| Script | Command | Purpose |
| :--- | :--- | :--- |
| `openapi` | `bun run scripts/generate-openapi.ts` | Generates authoritative OpenAPI 3.1 schema JSON at `public/openapi.json`. |

---

## 3. Invariants and Safety Rules

1. **`production:production` Compiled Execution Invariant**:
   - `production:production` must **never** execute `next dev`. It runs `next start -p 3000` against compiled artifacts, ensuring zero dev-mode performance penalties or accidental code reloads in production.
2. **Single Modular Monolith Deployment**:
   - Both Web and Worker runtimes share the exact same repository and dependency manifest. The Web tier runs `production:production`, while the Worker tier runs `worker`.
3. **Reproducible Local and CI Execution**:
   - All commands use native `bun run <script>` syntax, avoiding inconsistencies between npm, yarn, or pnpm.

---

## 4. Verification and Contract Enforcement

Automated verification of the Bun command contract is provided in [`tests/unit/bun-command-contract.test.ts`](../../tests/unit/bun-command-contract.test.ts):
- Asserts the presence and command strings of all required scripts in `package.json`.
- Validates that `production:production` does not contain `next dev`.
- Asserts the structural integrity of the OpenAPI specification generated by `openapi`.
