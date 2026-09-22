# ADR 0015: Linting, Formatting, Type Checking, and Commit Quality Standards

**Status**: Accepted  
**Date**: 2026-09-22  
**Deciders**: AlifWorld Architecture & DevOps Team  
**Milestone Reference**: [Milestone 015](../../AlifWorld-300-Milestones/015-configure-linting-formatting-type-checking-and-commit-quality.md)  
**Supporting Specification**: [Code Quality and Commit Standards Specification](../architecture/code-quality-and-commit-standards.md)  

---

## Context and Problem Statement

A high-scale e-commerce modular monolith with transactional ledgers, multi-tier commission structures, and localized interfaces requires rigorous automated code verification. Without automated gates, inconsistent formatting, untyped escapes, brittle hook usage, and unstructured git commits introduce technical debt, deployment regressions, and audit obscurity.

Furthermore, user-provided visual references (`UI References/`) and brand assets must be protected against unintentional reformatting or destructive modifications.

A formal Architecture Decision Record is required to establish automated quality standards across ESLint, Prettier, TypeScript, and Git commits.

---

## Decision Drivers

- **Zero Untyped Escapes**: Eliminate `@ts-ignore`, unchecked `any`, and runtime surprises in financial and domain logic.
- **Deterministic Formatting**: Standardize line widths, quotes, indentation, and semicolons across all contributors with Prettier.
- **React and Web Vitals Hygiene**: Enforce React hooks execution safety and Next.js Core Web Vitals via ESLint.
- **Auditable Commit History**: Enforce Conventional Commits specification to enable automated versioning, release changelogs, and traceability.
- **Reference Asset Protection**: Safeguard user-provided design mockups in `UI References/` and brand icons from automated tool interference.

---

## Decision Outcome

The AlifWorld engineering architecture formally adopts the following quality and commit standards:

### 1. ESLint Configuration (`.eslintrc.json`)
- Extends `next/core-web-vitals`.
- Enforces `prefer-const` (error), `no-var` (error), and React hooks rules.
- Restricts console pollution while permitting operational logs (`warn`, `error`, `info`).
- Explicitly ignores build artifacts (`node_modules/`, `.next/`, `dist/`, `out/`, `build/`, `coverage/`) and `UI References/`.

### 2. Prettier Formatting (`.prettierrc.json` & `.prettierignore`)
- Standard: 2 spaces, single quotes, trailing commas (`es5`), 100-character line width, bracket spacing, LF line endings.
- Ignore policy: Excludes all build artifacts, lockfiles, `UI References/`, and brand binary assets.

### 3. Strict TypeScript (`tsconfig.json`)
- Enforces strict mode (`strict: true`, `noImplicitAny: true`, `strictNullChecks: true`, `strictFunctionTypes: true`).
- Verified via `bun run typecheck` (`tsc --noEmit`).

### 4. Commitlint & Conventional Commits (`commitlint.config.js`)
- Enforces standard Conventional Commits format (`type(scope): subject`).
- Permitted types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`, and feature milestone alias `ft`.
- Enforces max header length of 100 characters.

### 5. Quality Command Contract in `package.json`
- `bun run lint`: Zero-warning ESLint execution (`--max-warnings 0`).
- `bun run lint:fix`: Automated autofixing for lintable rules.
- `bun run format`: Formatting write mode.
- `bun run format:check`: Formatting verification.
- `bun run typecheck`: Pure typecheck execution.
- `bun run quality`: Combined lint and typecheck gate.

---

## Consequences

### Positive:
- Ensures high code consistency and prevents subtle React/Next.js runtime defects.
- Protects historical visual references in `UI References/` from automated corruption.
- Guarantees commit history follows Conventional Commits for automated release auditing.
- Provides immediate developer feedback with fast Bun-executed quality commands.

### Negative:
- Commits that do not conform to Conventional Commits or that introduce type/lint warnings will be rejected by CI and quality gates.
