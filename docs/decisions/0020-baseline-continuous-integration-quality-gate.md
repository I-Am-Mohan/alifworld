# ADR 0020: Baseline Continuous Integration Quality Gate and Phase 02 Certification

**Status**: Accepted  
**Date**: 2026-09-22  
**Deciders**: AlifWorld Architecture, DevOps & QA Team  
**Milestone Reference**: [Milestone 020](../../AlifWorld-300-Milestones/020-build-the-baseline-continuous-integration-quality-gate.md)  
**Supporting Specification**: [Continuous Integration and Quality Gates Specification](../architecture/continuous-integration-and-quality-gates.md)  

---

## Context and Problem Statement

The AlifWorld platform is developed under trunk-based development with frequent commits and incremental milestone delivery. Without an automated continuous integration (CI) pipeline enforcing formatting, linting, type safety, test execution, and compilation before code reaches trunk, regressions, breaking API shifts, and untyped escapes will inevitably pollute the shared codebase.

Milestone 020 requires establishing a baseline CI quality gate in GitHub Actions and formally certifying the completion of **Phase 02: Repository and Tooling** (Milestones 011–020).

A formal Architecture Decision Record is required to lock the CI quality gate architecture and record Phase 02 completion.

---

## Decision Drivers

- **Zero-Tolerance Quality Gates**: Enforce zero lint warnings, zero typecheck errors, and 100% passing tests on every push and pull request.
- **Local-to-Remote Parity**: Provide developers with a single command (`bun run ci:check`) that replicates the exact CI pipeline locally.
- **Fast Feedback Loop**: Utilize Bun's sub-second execution engine to keep total CI duration under 3 minutes.
- **Phase 02 Certification**: Formally verify and close Phase 02, preparing the codebase for Phase 03 data architecture and database migrations.

---

## Decision Outcome

The AlifWorld engineering architecture formally adopts the **Baseline Continuous Integration Quality Gate and Phase 02 Certification**:

### 1. GitHub Actions CI Quality Gate (`.github/workflows/ci.yml`)
- Triggers on `push` and `pull_request` against `main` and `develop` branches.
- Uses `oven-sh/setup-bun@v2` with `latest` Bun runtime.
- Executes sequential quality pipeline:
  1. `bun run format:check`: Verifies Prettier formatting.
  2. `bun run lint`: Enforces ESLint with `--max-warnings 0`.
  3. `bun run typecheck`: Enforces strict TypeScript compiler verification (`tsc --noEmit`).
  4. `bun run test`: Executes unit, integration, and E2E smoke tests.
  5. `bun run openapi`: Generates and validates OpenAPI 3.1 schema.
  6. `bun run build:local`: Verifies Next.js standalone container compilation.

### 2. Local CI Script Contract
- Adds `ci:check` to [`package.json`](../../package.json) executing the identical chain locally.

### 3. Formal Certification and Completion of Phase 02
- Phase 02 (Milestones 011–020) is certified as **100% Completed**.
- The single Next.js modular monolith codebase is fully established with strict TypeScript, design system brand tokens, validated environment variables, Bun command contract, testing pyramid, local Docker infrastructure, and automated CI quality gate.

---

## Consequences

### Positive:
- Blocks broken, unformatted, or failing code from being merged into trunk branches.
- Eliminates manual review of formatting, linting, or type errors.
- Provides identical local and remote verification contracts.
- Certifies a rock-solid, production-grade foundation for Phase 03 (Data Architecture).

### Negative:
- Pull requests cannot be merged if any step in the pipeline fails, requiring developers to resolve issues prior to approval.
