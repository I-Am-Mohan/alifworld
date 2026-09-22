# ADR 0011: Existing Repository Inspection, Baseline Audit, and Asset Preservation Strategy

**Status**: Accepted  
**Date**: 2026-09-22  
**Deciders**: AlifWorld Architecture & Engineering Team  
**Milestone Reference**: [Milestone 011](../../AlifWorld-300-Milestones/011-inspect-the-existing-repository-and-preserve-useful-work.md)  
**Supporting Specification**: [Repository Inspection & Asset Preservation Inventory](../architecture/repository-inspection-and-preservation-inventory.md)  

---

## Context and Problem Statement

With the completion of Phase 01 (Governance and Architecture), AlifWorld transitions to Phase 02 (Repository and Tooling). Phase 01 produced essential domain primitives, brand token definitions, environment configuration modules, 10 accepted ADRs, and 11 architecture specifications.

Before initializing the Next.js TypeScript application scaffolding in Milestone 012:
1. Automated scaffolding generators (such as interactive `create-next-app` commands) risk overwriting or clobbering existing source files (`src/styles/tokens.css`, `src/shared/`, `README.md`, etc.).
2. The repository lacks a root `.gitignore`, risking accidental commits of dependencies (`node_modules`), build artifacts (`.next`), and private local environment files (`.env.local`).
3. Project directory layouts and TypeScript module aliases must align seamlessly with existing code paths.

A formal Architecture Decision Record is required to establish the repository baseline audit and lock the asset preservation strategy.

---

## Decision Drivers

- **Zero Asset Regressions**: Complete preservation of all Phase 01 brand tokens, TypeScript domain types, environment validators, and governance documentation.
- **Repository Hygiene**: Prevention of accidental secret, dependency, or build artifact commits before package manager operations begin.
- **Next.js `src/` Layout Alignment**: Seamless coexistence of existing `src/` primitives with upcoming Next.js App Router directories.

---

## Decision Outcome

The AlifWorld engineering architecture formally adopts the **Existing Repository Inspection and Asset Preservation Strategy**:

### 1. 100% Asset Preservation Policy
All files created during Phase 01 are cataloged in the Preservation Inventory ([`docs/architecture/repository-inspection-and-preservation-inventory.md`](../architecture/repository-inspection-and-preservation-inventory.md)) and preserved intact:
- Brand assets: `colors.md`, `logo.png`
- Styling tokens: `src/styles/tokens.css`
- TypeScript primitives: `src/shared/constants/brand-colors.ts`, `src/shared/types/domain-terms.ts`
- Environment module: `src/shared/config/environment.ts`, `.env.example`
- Governance: `docs/architecture/*`, `docs/product/*`, `docs/decisions/*`, `AlifWorld-300-Milestones/*`

### 2. Root `.gitignore` Implementation
A comprehensive `.gitignore` is installed at the repository root, guarding against:
- `node_modules/`, `.pnp*`
- `.next/`, `out/`, `build/`, `dist/`
- `.env`, `.env.local`, `*.pem`, `*.key`
- `.DS_Store`, `.idea/`, logs, and test coverage artifacts.

### 3. Surgical Next.js Initialization Standard
- Prohibits running blind, destructive interactive scaffolding tools that could purge existing directories.
- Next.js configuration in Milestone 012 will be created with deterministic, surgical precision using `src/` directory conventions and `@/*` path mapping to `./src/*`.

---

## Consequences

### Positive:
- Ensures continuity and stability between Phase 01 governance and Phase 02 technical scaffolding.
- Guarantees that brand identity, integer Poisha types, and environment gates are directly inherited by the Next.js application.
- Establishes clean repository hygiene before dependencies are installed.

### Negative:
- Scaffolding files (`package.json`, `tsconfig.json`, `next.config.js`) must be authored and verified explicitly rather than generated through generic wizard prompts.
