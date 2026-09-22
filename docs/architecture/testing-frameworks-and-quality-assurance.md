# AlifWorld Testing Frameworks and Quality Assurance Architecture

**Document Type**: Architectural Specification & QA Guide  
**Milestone Reference**: [Milestone 018](../../AlifWorld-300-Milestones/018-establish-unit-integration-and-end-to-end-test-frameworks.md)  
**Status**: Active / Approved  
**Related Decision**: [ADR-0018](../decisions/0018-testing-frameworks-and-test-pyramid.md)  

---

## 1. Overview and Objectives

The AlifWorld platform operates as a single-application modular monolith managing high-volume Bangladesh e-commerce, multi-tenant seller centers, double-entry financial accounting, and regional distribution rewards.

To guarantee zero regressions, deterministic accounting, and high deployment velocity, a 3-tier testing pyramid is established using the native Bun test runner (`bun:test`).

```
                    ▲
                   / \
                  /   \
                 / E2E \        tests/e2e/ (10%)
                / Smoke \       Storefront, Seller, Admin
               /─────────\
              /           \
             / Integration \    tests/integration/ (20%)
            /  HTTP Routes  \   Health Probes, API v1, Workers
           /─────────────────\
          /                   \
         /     Unit Tests      \ tests/unit/ (70%)
        / Pure Domain Logic,    \ Poisha, Points, Dates, Envs,
       /  Zod Schemas, Errors    \ Invariants, Command Contracts
      └───────────────────────────┘
```

---

## 2. Test Pyramid Layers

### 2.1 Unit Testing Layer (`tests/unit/`)
- **Execution Speed**: Sub-millisecond per test file; executed fully in-memory without external I/O.
- **Coverage Scope**:
  - Branded domain primitives: `Poisha` (integer minor units) and `ProductPoint` (discrete loyalty units).
  - Pure calculation and rounding utilities (`currency.ts`, `date.ts`).
  - Timezone invariants locked to `Asia/Dhaka` (start-of-day cutoffs, period boundaries).
  - Runtime environment validation and secret boundary enforcement (`environment.test.ts`).
  - Bun lifecycle script contract compliance (`bun-command-contract.test.ts`).
  - Domain error serialization and status code mapping (`error-hierarchy.test.ts`).

### 2.2 Integration Testing Layer (`tests/integration/`)
- **Execution Scope**: Module boundary verification and HTTP route handler contracts without requiring a live network.
- **Coverage Scope**:
  - System health probes: `/api/health/live` (process uptime) and `/api/health/ready` (dependency and gate checks).
  - API v1 Root Discovery and metadata (`/api/v1`).
  - Dynamic OpenAPI 3.1 schema serving (`/api/v1/openapi.json`).
  - BullMQ background worker queue registry and event handlers.

### 2.3 End-to-End Smoke Testing Layer (`tests/e2e/`)
- **Execution Scope**: Verifying that rendered React components and page surfaces instantiate without runtime errors and present correct navigation, brand elements, and access boundaries.
- **Coverage Scope**:
  - Customer Storefront surface: [`src/app/page.tsx`](../../src/app/page.tsx) with AlifLogo, brand tokens, and navigation links.
  - Seller Center surface: [`src/app/seller/page.tsx`](../../src/app/seller/page.tsx) with verification status and withdrawable wallet metrics.
  - Admin Console surface: [`src/app/admin/page.tsx`](../../src/app/admin/page.tsx) with compliance approval gates dashboard.

---

## 3. Shared Test Helpers and Fixtures (`tests/helpers/`)

To avoid test duplication and ensure reproducible fixtures, [`tests/helpers/test-utils.ts`](../../tests/helpers/test-utils.ts) provides standard utilities:
- `createMockSession(overrides)`: Generates typed user sessions across `CUSTOMER`, `SELLER`, `ADMIN`, and `SUPER_ADMIN` roles.
- `createMockRequest(url, options)`: Creates mock Next.js Request instances with configured HTTP methods, headers, and JSON bodies.

---

## 4. Testing Execution Contract

All test commands are standardized in [`package.json`](../../package.json) and executed via Bun:

| Script Command | Target Directory | Description |
| :--- | :--- | :--- |
| `bun run test` | `tests/` | Executes all test suites across the repository. |
| `bun run test:unit` | `tests/unit` | Executes pure unit tests with zero I/O dependencies. |
| `bun run test:integration` | `tests/integration` | Executes route handler and worker integration tests. |
| `bun run test:e2e` | `tests/e2e` | Executes end-to-end component smoke tests. |

---

## 5. Non-Negotiable Testing Invariants

1. **Zero Fake Paths & No Placeholder Skips**:
   - Tests must assert real behavior. No `expect(true).toBe(true)` or empty test shells.
   - Tests may not use `@ts-ignore` to suppress compilation failures.
2. **Deterministic Timezones**:
   - Date tests must explicitly test against `Asia/Dhaka` (UTC+6) time offsets, preventing machine-local timezone flakiness.
3. **Financial Invariant Verification**:
   - Currency conversions must verify that poisha values are exact integers with zero floating-point accumulation.
   - Product Points must reject negative values and non-integers.
4. **Offline Resilience**:
   - Tests must never connect to live third-party gateways (bKash, Nagad, Pathao, Twilio). Fakes, mocks, and memory adapters are required.
