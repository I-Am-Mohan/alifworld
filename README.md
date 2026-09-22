# AlifWorld: E-Commerce Platform & Digital Ecosystem

AlifWorld is an enterprise-grade multi-vendor e-commerce platform and digital ecosystem engineered for Bangladesh and regional markets. Built as a high-performance single-codebase Next.js modular monolith, AlifWorld unifies customer shopping, multi-vendor seller operations, customer reward and rank ladders, seller clubs and leaderboards, regional distribution commission engines, and mobile-ready Flutter REST API contracts.

---

## Brand Identity & Design Language

AlifWorld's visual identity is governed by the authoritative brand guidelines (`colors.md` and `logo.png`):

- **Foundation**: Deep Black (`#000000`) and Pure White (`#FFFFFF`) provide a bold, high-contrast, modern interface foundation.
- **Brand Interactive Accent**: Brand Orange (`#FF6A00`) drives all primary calls-to-action, highlights, links, and active interactive states.
- **Global / World Elements**: Globe Blue (`#4F8FD9`), Globe Light Blue (`#69B7E8`), and Globe Dark Blue (`#3456A3`) accent international, geographic, and world-related modules.
- **Logo Rule**: The blue globe is an authoritative brand icon and logo element—it is never treated as a replacement character for the letter `O`.

```css
:root {
  --alif-black: #000000;
  --alif-white: #FFFFFF;
  --alif-orange: #FF6A00;
  --alif-globe-blue: #4F8FD9;
  --alif-globe-light: #69B7E8;
  --alif-globe-dark: #3456A3;
}
```

Detailed brand tokens and rules: [Brand Identity & Design Tokens](docs/product/brand-identity-and-design-tokens.md)

---

## Architectural Pillars

1. **Single Deployable Next.js Application**: Storefront, Admin portal, Seller center, Route Handlers under `/app/api/v1`, BullMQ background workers, and documentation reside in one cohesive TypeScript repository. No distributed microservices.
2. **Deterministic Financial Ledger**: All monetary amounts are stored in Bangladeshi Taka (BDT) integer minor units (poisha). Product Points are distinct, non-convertible units defined independently by sellers. All wallet operations enforce double-entry accounting.
3. **Versioned Business Rules**: Percentages, commission splits, reward clubs, and rank thresholds are versioned Admin configurations. Historical transactions are never retroactively recalculated.
4. **Localization First**: Native support for English (`en-BD`) and Bangla (`bn-BD`) with localized numerals, currency formatting, and `Asia/Dhaka` business calendar cutoffs.
5. **Strict Source Authority & Approval Gates**: All engineering decisions follow a strict 6-tier precedence order. Unapproved financial or regulatory domains are protected behind disabled feature gates until formally authorized.

---

## Core Documentation & Governance

- **[Project Charter](docs/architecture/project-charter.md)**: Full architecture specification, actors, core domains, and non-negotiable invariants.
- **[30-Phase Milestone Map](docs/architecture/30-phase-milestone-map.md)**: Master delivery roadmap spanning all 300 milestones across 30 disciplined engineering phases.
- **[AI Execution Protocol](docs/architecture/ai-execution-protocol.md)**: Strict 10-step protocol, inspection standards, zero-placeholder rule, and verification checklist for autonomous agents.
- **[Scope Boundaries & Domain Map](docs/architecture/scope-boundaries-and-domain-map.md)**: Definition of the 20 bounded contexts, state machines, and event decoupling.
- **[Non-Functional Requirements & SLOs](docs/architecture/non-functional-requirements-and-slos.md)**: Performance benchmarks, capacity sizing, availability SLOs, and graceful degradation rules.
- **[Domain Glossary & Ubiquitous Language](docs/architecture/domain-glossary-and-ubiquitous-language.md)**: Canonical terminology, integer Poisha definitions, Product Point rules, and bilingual dictionary.
- **[Single-Application Modular Monolith](docs/architecture/single-application-modular-monolith.md)**: System topology, 4-tier layer constraints, outbox decoupling, and process deployment models.
- **[Milestone Dependency Graph & Delivery Workflow](docs/architecture/milestone-dependency-graph.md)**: 30-phase DAG, critical paths, phase transition gates, and atomic delivery standards.
- **[Enterprise Risk Register & Compliance Approval Gates](docs/architecture/risk-register-and-compliance-gates.md)**: 12-point enterprise risk register with 5x5 impact/likelihood scoring and operationalized approval gates.
- **[Environment, Branching, and Release Strategy](docs/architecture/environment-branching-and-release-strategy.md)**: 4-tier environments, Trunk-Based Development, zero-downtime rolling deployments, and Expand-and-Contract migrations.
- **[Definition of Done & Requirements Traceability Matrix](docs/architecture/definition-of-done-and-traceability-matrix.md)**: 7-pillar canonical Definition of Done and 25-category bidirectional requirements traceability matrix.
- **[Repository Inspection & Asset Preservation Inventory](docs/architecture/repository-inspection-and-preservation-inventory.md)**: 100% preservation baseline of Phase 01 assets, root `.gitignore`, and Next.js `src/` directory alignment.
- **[Next.js Application Initialization with Bun](docs/architecture/nextjs-application-initialization.md)**: Single Next.js TypeScript App Router setup, Bun command contract, standalone Docker output, and health probes.
- **[Directory Structure & Module Boundaries](docs/architecture/directory-structure-and-module-boundaries.md)**: 4-tier layer isolation, public feature contracts, multi-tenant seller scoping, and shared domain primitives.
- **[Design System & Brand Tokens](docs/architecture/design-system-and-brand-tokens.md)**: 3-tier token hierarchy, standalone globe logo governance, WCAG 2.1 AAA contrast compliance, and atomic UI component suite.
- **[Code Quality & Commit Standards](docs/architecture/code-quality-and-commit-standards.md)**: Automated ESLint, Prettier, strict TypeScript verification, Commitlint Conventional Commits, and UI References asset protection.
- **[Environment Validation & Secret Boundaries](docs/architecture/environment-validation-and-secret-boundaries.md)**: Zod-validated runtime environment, secret boundary proxy guard, invariant guarantees, and credential redaction.
- **[Source Authority & Approval Gates](docs/product/source-authority-and-approval-gates.md)**: Precedence hierarchy and unresolved business rule gates requiring stakeholder sign-off.
- **[Source Document Reconciliation Matrix](docs/product/source-document-reconciliation-matrix.md)**: Cross-document conflict analysis and authoritative resolutions.
- **[Architecture Decision Records (ADRs)](docs/decisions/decision-log.md)**:
  - [ADR 0001: Project Charter, Core Stack, Financial Invariants, Brand Tokens, and AI Protocol](docs/decisions/0001-project-charter-and-execution-protocol.md)
  - [ADR 0002: Source-Document Reconciliation and Treatment of Ambiguities](docs/decisions/0002-source-document-reconciliation.md)
  - [ADR 0003: Scope Boundaries, Bounded Contexts, and Modular Monolith Architecture](docs/decisions/0003-scope-boundaries-and-domain-map.md)
  - [ADR 0004: Non-Functional Requirements, Capacity Assumptions, and SLOs](docs/decisions/0004-non-functional-requirements-and-slos.md)
  - [ADR 0005: Ubiquitous Language, Canonical Domain Glossary, and Monetary Typing](docs/decisions/0005-domain-glossary-and-ubiquitous-language.md)
  - [ADR 0006: Single-Application Modular Monolith Architectural Decisions](docs/decisions/0006-single-application-modular-monolith-architecture.md)
  - [ADR 0007: Milestone Dependency Graph and Incremental Delivery Workflow](docs/decisions/0007-milestone-dependency-graph-and-delivery-workflow.md)
  - [ADR 0008: Enterprise Risk Register and Compliance Approval Gates](docs/decisions/0008-risk-register-and-compliance-approval-gates.md)
  - [ADR 0009: Environment Topology, Trunk-Based Development, and Zero-Downtime Release Strategy](docs/decisions/0009-environment-branching-and-release-strategy.md)
  - [ADR 0010: Canonical Definition of Done and Requirements Traceability Matrix Framework](docs/decisions/0010-definition-of-done-and-requirements-traceability.md)
  - [ADR 0011: Existing Repository Inspection, Baseline Audit, and Asset Preservation Strategy](docs/decisions/0011-repository-inspection-and-preservation-baseline.md)
  - [ADR 0012: Next.js TypeScript Application Initialization with Bun](docs/decisions/0012-initialize-nextjs-typescript-application-with-bun.md)
  - [ADR 0013: Directory Structure and Module Boundaries Architecture](docs/decisions/0013-directory-structure-and-module-boundaries.md)
  - [ADR 0014: AlifWorld Design System and Brand Tokens Architecture](docs/decisions/0014-design-system-and-brand-tokens.md)
  - [ADR 0015: Linting, Formatting, Type Checking, and Commit Quality Standards](docs/decisions/0015-linting-formatting-and-commit-quality.md)
  - [ADR 0016: Typed Environment Validation and Secret Boundaries Architecture](docs/decisions/0016-typed-environment-validation-and-secret-boundaries.md)

---

## 300-Milestone Delivery Progress

The project executes through 30 structured phases, tracked in `AlifWorld-300-Milestones/`:

| Phase | Milestone Range | Phase Theme | Status |
|:---:|:---:|:---|:---:|
| **01** | 001–010 | Governance and Architecture | **Completed (Milestones 001–010)** |
| **02** | 011–020 | Repository and Tooling | **In Progress (Milestones 011–016 Completed)** |
| **03** | 021–030 | Data Architecture | Planned |
| **04** | 031–040 | Identity and Authentication | Planned |
| **05** | 041–050 | Authorization, Security, and Tenancy | Planned |
| **06** | 051–060 | Bangladesh Localization | Planned |
| **07** | 061–070 | Seller Lifecycle | Planned |
| **08** | 071–080 | Catalog Foundations | Planned |
| **09** | 081–090 | Products and Media | Planned |
| **10** | 091–100 | Pricing, Tax, and Promotions | Planned |
| **11** | 101–110 | Inventory and Warehousing | Planned |
| **12** | 111–120 | Search, Discovery, SEO, and Storefront | Planned |
| **13** | 121–130 | Customer Experience | Planned |
| **14** | 131–140 | Checkout and Shipping | Planned |
| **15** | 141–150 | Orders, Fulfillment, Returns, and Refunds | Planned |
| **16** | 151–160 | Payments and Seller Finance | Planned |
| **17** | 161–170 | Wallet Ledger | Planned |
| **18** | 171–180 | Product Points Engine | Planned |
| **19** | 181–190 | Customer Rewards and Ranks | Planned |
| **20** | 191–200 | Seller Rewards, Levels, and Leaderboards | Planned |
| **21** | 201–210 | Regional Distribution and Commissions | Planned |
| **22** | 211–220 | Lottery, Ads, Packages, and Affiliate Programs | Planned |
| **23** | 221–230 | Rider and Delivery | Planned |
| **24** | 231–240 | Admin, CMS, Support, and Analytics | Planned |
| **25** | 241–250 | Notifications, Jobs, and Realtime Events | Planned |
| **26** | 251–260 | REST API, OpenAPI, and Flutter Contracts | Planned |
| **27** | 261–270 | Caching, Performance, Scale, and Resilience | Planned |
| **28** | 271–280 | Testing, Security, Compliance, and Quality | Planned |
| **29** | 281–290 | DevOps, Deployment, and Observability | Planned |
| **30** | 291–300 | Launch, Handover, and Continuous Improvement | Planned |
