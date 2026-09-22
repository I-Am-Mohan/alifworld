# AlifWorld Continuous Integration and Quality Gates Specification

**Document Type**: Architectural Specification & CI/CD Guide  
**Milestone Reference**: [Milestone 020](../../AlifWorld-300-Milestones/020-build-the-baseline-continuous-integration-quality-gate.md)  
**Status**: Active / Approved  
**Related Decision**: [ADR-0020](../decisions/0020-baseline-continuous-integration-quality-gate.md)  

---

## 1. Overview and Purpose

The AlifWorld platform operates as a single-application modular monolith. To guarantee that regressions, type errors, formatting inconsistencies, broken route contracts, or build failures are blocked before merging into `main` or deploying to production environments, an automated Continuous Integration (CI) quality gate is established.

Milestone 020 concludes **Phase 02: Repository and Tooling** by operationalizing the automated quality gate in GitHub Actions ([`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)) and providing local parity via `bun run ci:check`.

---

## 2. CI Pipeline Topology and Sequence

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        GITHUB ACTIONS CI QUALITY GATE PIPELINE                         │
│                    Trigger: push & pull_request to main / develop                      │
└────────────────────────────────────────────────────────────────────────────────────────┘
                                            │
                                            ▼
                    ┌────────────────────────────────────────────────┐
                    │ 1. Checkout & Setup Bun (oven-sh/setup-bun@v2) │
                    └───────────────────────┬────────────────────────┘
                                            │
                                            ▼
                    ┌────────────────────────────────────────────────┐
                    │ 2. Install Dependencies (--frozen-lockfile)    │
                    └───────────────────────┬────────────────────────┘
                                            │
                                            ▼
                    ┌────────────────────────────────────────────────┐
                    │ 3. Configure Baseline Environment (.env.local) │
                    └───────────────────────┬────────────────────────┘
                                            │
                                            ▼
                    ┌────────────────────────────────────────────────┐
                    │ 4. Code Formatting Check (bun run format:check)│
                    └───────────────────────┬────────────────────────┘
                                            │
                                            ▼
                    ┌────────────────────────────────────────────────┐
                    │ 5. Lint Rule Enforcement (bun run lint)        │
                    │    (--max-warnings 0 zero-tolerance policy)   │
                    └───────────────────────┬────────────────────────┘
                                            │
                                            ▼
                    ┌────────────────────────────────────────────────┐
                    │ 6. Strict Typecheck (bun run typecheck)        │
                    │    (tsc --noEmit zero-error policy)            │
                    └───────────────────────┬────────────────────────┘
                                            │
                                            ▼
                    ┌────────────────────────────────────────────────┐
                    │ 7. Automated Test Suite (bun run test)         │
                    │    (Unit, Integration, E2E Smoke Tests)        │
                    └───────────────────────┬────────────────────────┘
                                            │
                                            ▼
                    ┌────────────────────────────────────────────────┐
                    │ 8. OpenAPI Generation (bun run openapi)        │
                    └───────────────────────┬────────────────────────┘
                                            │
                                            ▼
                    ┌────────────────────────────────────────────────┐
                    │ 9. Next.js Production Build (bun build:local)  │
                    │    (Compiles optimized standalone container)   │
                    └────────────────────────────────────────────────┘
```

---

## 3. Strict Pipeline Standards

1. **Deterministic Dependency Installation**:
   - Uses `bun install --frozen-lockfile` to prevent unexpected transitive dependency changes.
2. **Zero-Warning Linting Gate**:
   - `eslint . --max-warnings 0` rejects any code introducing warnings or rule exemptions.
3. **Strict Zero-Error Type Checking**:
   - `tsc --noEmit` verifies strict TypeScript safety across the entire repository.
4. **Hermetic Test Execution**:
   - `bun run test` runs unit, integration, and E2E smoke suites without requiring external live network gateways.
5. **OpenAPI 3.1 Verification**:
   - Re-generates OpenAPI documentation and verifies that route schemas compile without errors.
6. **Production Build Compilation**:
   - `bun run build:local` guarantees that Next.js Server Components, Client Components, and standalone outputs compile cleanly.

---

## 4. Local CI Parity Command (`bun run ci:check`)

To enable developers to verify their changes before pushing to remote branches, `package.json` provides:

```bash
bun run ci:check
```

This single command sequentially executes:
```bash
bun run format:check && bun run lint && bun run typecheck && bun run test && bun run openapi && bun run build:local
```

---

## 5. Phase 02 Completion Summary

With the delivery of Milestone 020, **Phase 02: Repository and Tooling** is 100% complete:

| Milestone | Title | Status | Key Deliverables |
| :--- | :--- | :---: | :--- |
| **011** | Inspect repository and preserve work | **Completed** | Preservation audit, root `.gitignore`, asset registry. |
| **012** | Initialize Next.js TypeScript app with Bun | **Completed** | Next.js 14+ scaffold, strict `tsconfig.json`, health probes. |
| **013** | Establish directory structure & module boundaries | **Completed** | 4-tier layer isolation, domain modules, error hierarchy. |
| **014** | Create design system & brand tokens | **Completed** | 3-tier tokens, standalone globe logo, atomic UI components. |
| **015** | Configure linting, formatting & commit quality | **Completed** | ESLint, Prettier, Commitlint, quality script contract. |
| **016** | Implement typed environment validation | **Completed** | Zod schemas, secret boundary proxy guard, invariant locks. |
| **017** | Implement required Bun command contract | **Completed** | Standardized lifecycle scripts, worker runner, OpenAPI. |
| **018** | Establish unit, integration & E2E test frameworks | **Completed** | 3-tier test pyramid, `bun:test` runner, test fixtures. |
| **019** | Create local development infrastructure profiles | **Completed** | Docker Compose (Postgres, Redis, MinIO, Meilisearch). |
| **020** | Build baseline continuous-integration quality gate | **Completed** | GitHub Actions workflow, `bun run ci:check`, quality gate. |

Phase 03 (Data Architecture, Milestones 021–030) can now begin with an uncompromising, automated quality foundation.
