# AlifWorld Architecture & Business Decision Log

**Document Type**: Master Decision Log & ADR Index  
**Milestone Reference**: [Milestone 002](../../AlifWorld-300-Milestones/002-source-document-reconciliation-and-decision-log.md)  
**Maintenance Policy**: Updated synchronously whenever an architectural decision is adopted or amended.  

---

## Decision Log Index

| ADR ID | Title | Date | Status | Phase / Milestone | Deciders | Key Outcome |
|:---:|:---|:---:|:---:|:---:|:---|:---|
| [**ADR-0001**](0001-project-charter-and-execution-protocol.md) | Project Charter, Architectural Stack, Financial Invariants, Brand Tokens, and AI Protocol | 2026-09-22 | **Accepted** | Phase 01 / M001 | Architecture Team | Locked single Next.js modular monolith, Bun, Postgres/Prisma, Redis, BullMQ, S3, Meilisearch; integer poisha; independent points; brand colors. |
| [**ADR-0002**](0002-source-document-reconciliation.md) | Source-Document Reconciliation and Treatment of Ambiguities | 2026-09-22 | **Accepted** | Phase 01 / M002 | Product Governance | Adopted 10-page proposal as Tier 2 authority; resolved Customer Club cycles as Daily/Weekly/Monthly/Yearly; locked 50-20-15-5-10 & 70-15-5-10 splits; gated lottery & advanced shopping. |
| [**ADR-0003**](0003-scope-boundaries-and-domain-map.md) | Scope Boundaries, Bounded Contexts, and Modular Monolith Architecture | 2026-09-22 | **Accepted** | Phase 01 / M003 | Architecture Team | Established 20 bounded contexts; enforced thin route handlers, domain services, repositories; prohibited cross-domain direct table mutations; mandated transactional outbox. |
| [**ADR-0004**](0004-non-functional-requirements-and-slos.md) | Non-Functional Requirements, Capacity Assumptions, and SLOs | 2026-09-22 | **Accepted** | Phase 01 / M004 | SRE & Architecture | Established 3-tier capacity model (up to 2M DAU / 25k QPS); set 99.95% API availability and 100% financial ledger integrity; defined sub-100ms p95 latency budgets and graceful degradation. |
| [**ADR-0005**](0005-domain-glossary-and-ubiquitous-language.md) | Ubiquitous Language, Canonical Domain Glossary, and Monetary Typing | 2026-09-22 | **Accepted** | Phase 01 / M005 | Product Governance | Standardized canonical domain glossary; enforced integer Poisha (Poisha branded type, _poisha db columns); locked ProductPoint discrete integer units; established bilingual dictionary. |
| [**ADR-0006**](0006-single-application-modular-monolith-architecture.md) | Single-Application Modular Monolith Architectural Decisions | 2026-09-22 | **Accepted** | Phase 01 / M006 | Architecture Team | Locked single Next.js monolith repository; established 4-layer dependency model; mandated transactional outbox via BullMQ; configured dual web/worker deployment from single Docker image. |
| [**ADR-0007**](0007-milestone-dependency-graph-and-delivery-workflow.md) | Milestone Dependency Graph and Incremental Delivery Workflow | 2026-09-22 | **Accepted** | Phase 01 / M007 | Delivery Governance | Established 30-phase DAG; mandated predecessor completion verification gate; codified 7-step incremental execution protocol and atomic single-milestone commits. |
| [**ADR-0008**](0008-risk-register-and-compliance-approval-gates.md) | Risk Register and Compliance Approval Gates Framework | 2026-09-22 | **Accepted** | Phase 01 / M008 | Legal & Architecture | Adopted 12-point enterprise risk register; operationalized 7 compliance approval gates; enforced feature-flag deactivation and error standard for disabled capabilities. |
| [**ADR-0009**](0009-environment-branching-and-release-strategy.md) | Environment Topology, Trunk-Based Development, and Zero-Downtime Release Strategy | 2026-09-22 | **Accepted** | Phase 01 / M009 | DevOps & Architecture | Defined 4-tier environments; adopted Trunk-Based Development with short-lived branches; mandated zero-downtime rolling releases, health probes, and Expand-and-Contract database migrations. |
| [**ADR-0010**](0010-definition-of-done-and-requirements-traceability.md) | Canonical Definition of Done and Requirements Traceability Matrix Framework | 2026-09-22 | **Accepted** | Phase 01 / M010 | QA & Governance | Established 7-pillar Canonical Definition of Done; adopted 25-category master Requirements Traceability Matrix; formally concluded Phase 01 governance foundation. |
| [**ADR-0011**](0011-repository-inspection-and-preservation-baseline.md) | Existing Repository Inspection, Baseline Audit, and Asset Preservation Strategy | 2026-09-22 | **Accepted** | Phase 02 / M011 | Architecture & Engineering | Completed 100% preservation audit of Phase 01 assets; implemented root .gitignore; aligned Next.js src/ directory structure and @/* path aliases. |
| [**ADR-0012**](0012-initialize-nextjs-typescript-application-with-bun.md) | Next.js TypeScript Application Initialization with Bun | 2026-09-22 | **Accepted** | Phase 02 / M012 | Architecture & Engineering | Initialized single Next.js App Router codebase, strict TypeScript, Bun script contract, Tailwind brand tokens, standalone container output, and health probes. |
| [**ADR-0013**](0013-directory-structure-and-module-boundaries.md) | Directory Structure and Module Boundaries Architecture | 2026-09-22 | **Accepted** | Phase 02 / M013 | Architecture & Engineering | Established physical directory hierarchy, 4-tier layer isolation, public feature exports, multi-tenant seller scoping, and shared domain primitives. |

---

## ADR Process & Standards

1. **When to write an ADR**:
   - Any architectural pattern selection (e.g. database, cache, auth library, queue system).
   - Any monetary, point, or ledger formula standard.
   - Any reconciliation of contradictory business requirements.
   - Any introduction or modification of an approval gate.
2. **Standard ADR Template**:
   - Status (Proposed, Accepted, Rejected, Superseded)
   - Date & Deciders
   - Context and Problem Statement
   - Decision Drivers
   - Considered Options
   - Decision Outcome & Detailed Rationale
   - Consequences (Positive and Negative)
   - Compliance & Verification Rules
