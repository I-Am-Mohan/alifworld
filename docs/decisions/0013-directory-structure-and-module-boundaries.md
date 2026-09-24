# ADR 0013: Directory Structure and Module Boundaries Architecture

**Status**: Accepted  
**Date**: 2026-09-22  
**Deciders**: AlifWorld Architecture & Engineering Team  
**Milestone Reference**: [Milestone 013](../../AlifWorld-300-Milestones/013-establish-directory-structure-and-module-boundaries.md)  
**Supporting Specification**: [Directory Structure & Module Boundaries Specification](../architecture/directory-structure-and-module-boundaries.md)  

---

## Context and Problem Statement

AlifWorld is designed as a single-codebase modular monolith in Next.js, housing 20 bounded contexts across customer storefronts, seller operations, administration consoles, REST APIs, and asynchronous BullMQ workers.

Without strictly enforced directory structures and dependency boundaries:
1. Business logic leaks into route handlers and React components, degrading testability and auditability.
2. database queries across bounded contexts create tight coupling, making schema evolution dangerous.
3. Multi-tenant isolation risks accidental leakage if `sellerId` scoping is not strictly required at repository interfaces.
4. Circular dependencies between modules compromise build reproducibility and static analysis.

A formal Architecture Decision Record is required to establish the physical directory topology and codify module boundary rules.

---

## Decision Drivers

- **4-Tier Architectural Cleanliness**: Unidirectional dependencies (Route -> Service -> Repository -> Database).
- **Domain Encapsulation**: Strict public interface exports (`src/features/*/index.ts`) with zero direct cross-domain table queries.
- **Tenant Isolation**: Non-negotiable `sellerId` parameterization on all seller-owned entity queries.
- **Zero Circular Dependencies**: Shared primitives (`src/shared/`) must remain leaf dependencies that never import from higher layers.

---

## Decision Outcome

The AlifWorld engineering architecture formally adopts the **Directory Structure and Module Boundaries Architecture**:

### 1. Physical Directory Hierarchy
The repository layout is standardized into distinct architectural zones:
- `src/app/`: User-facing surfaces (`/`, `/seller`, `/admin`) and versioned REST routes (`/api/v1`, `/api/health`).
- `src/features/<domain>/`: Bounded contexts owning domain services, repositories, validators, and types.
- `src/components/ui/`: Reusable brand design system atoms (Button, Card, Badge).
- `src/shared/`: Cross-cutting domain primitives (`Poisha`, `ProductPoint`), utilities (`currency`, `date`), error hierarchy (`AppError`), and configuration.
- `src/workers/`: BullMQ asynchronous job queue registry and processors.

### 2. Mandatory Boundary Rules
1. **Unidirectional Layer Flow**: Higher layers depend on lower layers; lower layers never import from higher layers.
2. **Public API Contract**: Cross-domain interactions must pass through public service contracts or asynchronous events. Direct queries across domain Prisma models are prohibited.
3. **Multi-Tenant Scoping**: All seller repository methods must accept an explicit `sellerId`.
4. **Leaf Shared Primitives**: `src/shared/` must never import from `src/features/` or `src/app/`.

---

## Consequences

### Positive:
- Ensures high maintainability and testability across all 300 milestones.
- Guarantees strict multi-tenant data isolation and financial integrity.
- Prevents architectural erosion and spaghetti dependencies as the codebase grows.

### Negative:
- Cross-domain workflows require explicit service methods or event dispatches rather than simple direct cross-table SQL joins.
