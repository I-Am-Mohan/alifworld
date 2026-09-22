# ADR 0007: Milestone Dependency Graph and Incremental Delivery Workflow

**Status**: Accepted  
**Date**: 2026-09-22  
**Deciders**: AlifWorld Architecture & Delivery Governance Team  
**Milestone Reference**: [Milestone 007](../../AlifWorld-300-Milestones/007-milestone-dependency-graph-and-incremental-delivery-workflow.md)  
**Supporting Specification**: [Milestone Dependency Graph & Delivery Workflow](../architecture/milestone-dependency-graph.md)  

---

## Context and Problem Statement

Executing an enterprise platform spanning 300 milestones across 30 distinct engineering phases carries substantial risk of delivery breakdown:
1. AI agents or developers attempting to implement downstream features (e.g. Flutter APIs or loyalty club settlements) before foundational layers (e.g. database schemas, authentication, or double-entry ledgers) are verified.
2. Out-of-order database migrations corrupting shared environments.
3. Speculative coding and partial implementations creating broken builds.
4. Absence of evidence-based handoffs between sequential tasks.

A binding Architecture Decision Record is required to establish the Directed Acyclic Graph (DAG), phase transition gates, and the incremental execution protocol.

---

## Decision Drivers

- **Deterministic Build State**: The application must remain 100% buildable, testable, and runnable at the completion of every individual milestone.
- **Topological Order Enforcement**: Predecessor milestones must satisfy all acceptance criteria before dependent milestones can begin.
- **Traceable Handoffs**: Mandatory documentation updates and 7-part completion reports for every milestone.

---

## Decision Outcome

The AlifWorld engineering protocol officially adopts the **Topological Dependency Graph & Incremental Delivery Workflow**:

### 1. Directed Acyclic Graph (DAG) Enforcement
The 300 milestones must execute in strict topological order as specified in [`docs/architecture/milestone-dependency-graph.md`](../architecture/milestone-dependency-graph.md). Skipping milestones or jumping ahead to later phases is strictly prohibited.

### 2. Predecessor Verification Gate
Before beginning Milestone `N`, the executing agent must:
1. Verify that Milestone `N-1` frontmatter is marked `status: completed`.
2. Verify that all acceptance criteria checkboxes in Milestone `N-1` are marked `[x]`.
3. Review Milestone `N-1`'s completion report to verify all handoff context and architectural decisions.

### 3. Seven-Step Milestone Execution Protocol
Every milestone must follow the 7-step protocol:
1. Verify predecessor completion.
2. Inspect codebase and baseline relevant tests.
3. Write domain contracts, state machines, and Zod schemas first.
4. Implement the smallest coherent production change (zero placeholders).
5. Run lint, typecheck, unit, and integration quality commands.
6. Update documentation, milestone checklist, and decision logs.
7. Publish the mandatory 7-part completion report.

### 4. Atomic Git Commit Standard
Each milestone represents an atomic, isolated unit of work. Every completed milestone must be committed with a descriptive, conventional commit message (e.g. `git commit -m "ft: milestone-name"`).

### 5. Formal Phase Transition Gates
Transitioning between phases (e.g. Phase 01 Governance -> Phase 02 Tooling -> Phase 03 Data Architecture) requires satisfying the phase transition gate criteria documented in the dependency specification.

---

## Consequences

### Positive:
- Guarantees zero regression and prevents speculative, untestable code from entering the repository.
- Provides total transparency into project velocity and milestone completion evidence.
- Ensures seamless handoffs between autonomous AI sessions.

### Negative / Trade-offs:
- Requires strict discipline; cannot jump directly to building UI screens without establishing underlying domain services, schemas, and tests.

---

## Compliance and Verification

- **Milestone Check**: Every milestone file in `AlifWorld-300-Milestones/` must maintain accurate `status` and `acceptance criteria`.
- **CI Enforcement**: The CI pipeline will verify that commits leave the codebase in a cleanly buildable state (`bun run build:local`).
