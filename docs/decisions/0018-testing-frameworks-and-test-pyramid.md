# ADR 0018: Testing Frameworks, Test Pyramid Architecture, and Execution Standards

**Status**: Accepted  
**Date**: 2026-09-22  
**Deciders**: AlifWorld Architecture & QA Engineering Team  
**Milestone Reference**: [Milestone 018](../../AlifWorld-300-Milestones/018-establish-unit-integration-and-end-to-end-test-frameworks.md)  
**Supporting Specification**: [Testing Frameworks and QA Specification](../architecture/testing-frameworks-and-quality-assurance.md)  

---

## Context and Problem Statement

The AlifWorld platform requires continuous verification across financial ledgers, currency conversions, localized timezone cutoffs, multi-tenant portals, and mobile REST APIs. Without a structured testing harness, tests become slow, flaky, coupled to external networks, or concentrated in slow end-to-end runs that impede development velocity.

Milestone 018 requires establishing unit, integration, and end-to-end test frameworks using the native Bun test runner, enforcing a clean test pyramid, and providing reproducible testing commands.

A formal Architecture Decision Record is required to lock the testing architecture.

---

## Decision Drivers

- **Execution Speed**: Instantaneous test execution via native `bun:test` without external runtime wrappers or Babel transforms.
- **Test Pyramid Balance**: 70% unit tests, 20% integration tests, 10% end-to-end smoke tests.
- **Financial & Invariant Correctness**: Absolute verification of integer Poisha, independent Product Points, `Asia/Dhaka` time cutoffs, and regulatory gates.
- **Hermetic Offline Testing**: Tests must never fail due to unavailable third-party APIs (bKash, Nagad, Pathao, Twilio).

---

## Decision Outcome

The AlifWorld engineering architecture formally adopts the **Testing Frameworks and Test Pyramid Standards**:

### 1. Native Bun Test Engine (`bun:test`)
- Standardized on `bun:test` for all test suites (`describe`, `it`, `expect`).
- Eliminates heavy test dependencies (e.g. Jest, ts-jest, Karma) in favor of Bun's built-in fast runner.

### 2. Standardized Directory Hierarchy
- `tests/unit/`: Pure in-memory unit tests (currency, points, dates, environment validation, error hierarchy, Bun command contract).
- `tests/integration/`: Module boundary and route handler tests (health probes, API v1 discovery, OpenAPI schema, worker queues).
- `tests/e2e/`: Smoke tests for storefront, seller portal, and admin console surfaces.
- `tests/helpers/`: Shared fixtures and mock utilities (`test-utils.ts`).

### 3. Strict Testing Invariants
- Zero placeholders: tests assert real behavior; no `@ts-ignore` or blank assertions.
- Explicit `Asia/Dhaka` timezone verification.
- Rejection of floating-point money and non-integer loyalty points.

### 4. Lifecycle Test Scripts
- `bun run test`: Complete test run.
- `bun run test:unit`: Unit tests only.
- `bun run test:integration`: Integration tests only.
- `bun run test:e2e`: End-to-end smoke tests.

---

## Consequences

### Positive:
- Blazing-fast test runs (under 50ms total for all unit and integration suites).
- Provides deterministic verification before git commits and deployment pipelines.
- Prevents regressions in financial precision and timezone boundary handling.

### Negative:
- Developers must maintain unit and integration tests alongside all new domain services and route handlers.
