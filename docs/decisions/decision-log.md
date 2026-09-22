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
