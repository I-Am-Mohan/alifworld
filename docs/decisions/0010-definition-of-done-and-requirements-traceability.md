# ADR 0010: Canonical Definition of Done and Requirements Traceability Matrix Framework

**Status**: Accepted  
**Date**: 2026-09-22  
**Deciders**: AlifWorld Architecture, Quality Assurance & Governance Team  
**Milestone Reference**: [Milestone 010](../../AlifWorld-300-Milestones/010-definition-of-done-and-requirements-traceability-matrix.md)  
**Supporting Specification**: [Definition of Done & Requirements Traceability Matrix](../architecture/definition-of-done-and-traceability-matrix.md)  

---

## Context and Problem Statement

Phase 01 (**Governance and Architecture**) is chartered with turning all disparate source documents (10-page proposal, build specifications, wallet presentations, marketing pitch decks) into a unified, testable, and controlled source of truth before code implementation begins in Phase 02.

To guarantee that each of the 300 milestones across all 30 phases delivers production-grade, secure, and compliant software:
1. Engineering teams and autonomous AI agents require an objective, non-negotiable standard for when a task is truly "Done".
2. Business stakeholders require complete visibility that every single commercial, operational, and regulatory requirement from the source authorities is implemented and verified.
3. Financial invariants (integer Poisha, independent Product Points, double-entry ledgers) and security invariants (tenant isolation, compliance gates) must be validated uniformly across every pull request.

A formal Architecture Decision Record is required to lock the Canonical Definition of Done and the Requirements Traceability Matrix.

---

## Decision Drivers

- **Zero Speculative Engineering**: Every line of production code must trace directly to an approved requirement in the RTM.
- **Uniform Enterprise Quality**: Consistent enforcement of TypeScript strict typing, test coverage, and API contracts.
- **Uncompromising Financial Invariants**: Elimination of floating-point money bugs, point miscalculations, and unbacked reward payouts.
- **Phase Transition Governance**: Clear, audited entry and exit criteria for moving between the 30 project delivery phases.

---

## Decision Outcome

The AlifWorld engineering architecture formally adopts the **Canonical Definition of Done (DoD) and Requirements Traceability Matrix (RTM) Framework**:

### 1. The 7-Pillar Canonical Definition of Done
Every milestone, feature branch, and pull request must satisfy:
1. **Code Quality & Typing**: TypeScript strict mode, zero compiler warnings/errors, 4-tier layer isolation (Route -> Service -> Repository -> Database), stateless Next.js monolith.
2. **Financial & Data Integrity**: Integer Poisha (`1 BDT = 100 poisha`), independent Product Point snapshots, double-entry ledger balance constraints (`debits == credits`, `balance >= 0`), unique idempotency keys.
3. **Security & Multi-Tenancy**: Server-side authentication and role checks, mandatory `seller_id` tenant scoping, encrypted PII (AES-256-GCM), compliance approval gates (**GATE-01** to **GATE-07**) dark-launched and disabled by default.
4. **Testing & Verification**: Deterministic unit tests, PostgreSQL integration tests with transaction rollbacks, negative tenant isolation tests, and concurrency race-condition tests.
5. **API & Mobile Contracts**: Unified JSON response envelopes (`{ success, data }` / `{ success, error }`), Zod-generated OpenAPI 3.1 specifications, HTTP semantics.
6. **UX & Localization**: Bilingual Bengali (`bn-BD`, default) and English (`en-BD`), Asia/Dhaka timezone, BDT (`৳`) currency formatting, brand token fidelity (`#000000`, `#FFFFFF`, `#FF6A00`, globe blues).
7. **Observability & Operations**: Redacted structured JSON logging, trace IDs, health probes (`/api/health/live`, `/api/health/ready`), Expand-and-Contract safe database migrations, `.env.example` synchronization.

### 2. Requirements Traceability Matrix Adoption
- Formally adopts the 25-category master RTM ([`docs/architecture/definition-of-done-and-traceability-matrix.md`](../architecture/definition-of-done-and-traceability-matrix.md)), establishing bidirectional traceability from source documents to bounded contexts, milestone numbers, and automated test strategies.
- Any proposed scope adjustment must update the RTM and obtain architectural sign-off before implementation.

### 3. Conclusion of Phase 01: Governance and Architecture
- With the acceptance of ADR 0010 and the completion of Milestones 001 through 010, **Phase 01 is formally concluded**.
- The codebase and governance documentation are certified as a complete, controlled, testable foundation ready for Phase 02 (**Repository and Tooling**).

---

## Consequences

### Positive:
- Establishes complete certainty on acceptance criteria across all 300 milestones.
- Eliminates technical debt and architectural drift early before implementation commences.
- Provides autonomous AI agents with an unambiguous evaluation checklist for every milestone.
- Satisfies audit, regulatory, and stakeholder verification requirements.

### Negative:
- Imposes strict overhead on every PR, requiring developers to satisfy all 7 DoD pillars rather than delivering quick partial hacks.
