# ADR 0001: Project Charter, Architectural Stack, Financial Invariants, Brand Tokens, and AI Protocol

**Status**: Accepted  
**Date**: 2026-09-22  
**Deciders**: AlifWorld Architecture & Engineering Governance Team  
**Milestone Reference**: [Milestone 001](../../AlifWorld-300-Milestones/001-project-charter-source-authority-and-ai-execution-protocol.md)  
**Source Authority Reference**: [Source Authority & Approval Gates](../product/source-authority-and-approval-gates.md)  

---

## Context and Problem Statement

AlifWorld requires a robust architectural foundation capable of scaling to millions of transactions across multi-vendor commerce, complex customer loyalty reward programs, seller club settlements, regional distribution commissions, and mobile Flutter clients.

Historically, complex e-commerce projects suffer from:
1. Architectural fragmentation caused by premature microservices.
2. Inconsistent financial representations leading to rounding errors and floating-point corruption.
3. Confusion between currency and loyalty points.
4. Retroactive recalculation of historic transactions when business rules change.
5. Inconsistent visual branding across distributed screens.
6. AI coding agents generating disconnected placeholders and untested code.

A definitive Architecture Decision Record is required to lock these fundamental engineering parameters.

---

## Decision Drivers

- **Simplicity & Deployability**: Maintain high engineering velocity with a unified single-repository codebase.
- **Financial Rigor**: Zero tolerance for ledger imbalance, currency drift, or retroactive manipulation.
- **Predictable AI Execution**: Explicit operating standards for autonomous coding agents.
- **Brand Consistency**: Unified color palette and visual identity derived from `colors.md` and `logo.png`.
- **Regulatory Safety**: Protection of unapproved business mechanisms behind explicit approval gates.

---

## Considered Options

1. **Option A (Microservices & Multi-repo)**: Separate services for Storefront, Auth, Catalog, Cart, Wallet, and Admin across multiple repositories.
2. **Option B (Next.js Single-Codebase Modular Monolith)**: A single deployable TypeScript Next.js application containing Storefront, Admin, Seller, Route Handlers (`/app/api/v1`), and BullMQ workers in structured module boundaries.

---

## Decision Outcome

Chosen Option: **Option B (Next.js Single-Codebase Modular Monolith)**.

### Core Architectural Mandates:
1. **Single Repository & Monolith Deployment**: All platform surfaces (Storefront, Admin, Seller, APIs, and asynchronous workers) will live in one repository and deploy as a single Next.js application.
2. **Core Technology Stack**:
   - Runtime: Bun
   - Framework: Next.js (App Router, Server Components by default)
   - API: Route Handlers under `/app/api/v1`
   - Database & ORM: PostgreSQL with Prisma ORM
   - Cache & Distributed Coordination: Redis
   - Queues & Async Jobs: BullMQ with transactional outbox
   - Media Storage: S3-compatible object storage (stateless container design)
   - Search: Meilisearch adapter with an automatic boot-safe PostgreSQL fallback
3. **Financial & Point Invariants**:
   - Currency: Bangladeshi Taka (BDT) stored as 64-bit integer minor units (poisha, `1 BDT = 100 poisha`).
   - Product Points: Independent, seller-defined integer units. Automatic conversion between BDT and points is strictly prohibited. Points snapshot onto order items and post only at the approved eligible order status.
   - Ledgers: Balanced double-entry postings for all wallet accounts.
4. **Versioned Business Rules**:
   - All commission splits, reward percentages, and tier thresholds are versioned Admin records. Historic ledger postings are immutable.
5. **Brand Identity & Color Tokens**:
   - Authoritative palette: Deep Black (`#000000`), Pure White (`#FFFFFF`), Brand Orange (`#FF6A00`), Globe Blue (`#4F8FD9`), Globe Light Blue (`#69B7E8`), Globe Dark Blue (`#3456A3`).
   - The blue globe is an independent brand emblem and never a character substitution for the letter 'O'.
   - Brand orange is reserved for primary CTAs and active states.
6. **AI Execution Protocol**:
   - Mandatory 10-step execution cycle.
   - Zero-placeholder guarantee: no stubs, no bypass casts (`any`), no fake success paths.
   - 7 locked approval gates requiring explicit business sign-off before financial activation.

---

## Consequences

### Positive:
- Single deployment pipeline drastically simplifies local development, testing, and CI/CD operations.
- Integer poisha and double-entry ledgers eliminate financial discrepancy bugs.
- Clear brand tokens ensure high visual consistency across Storefront, Seller, Admin, and mobile apps.
- Strict AI execution protocol prevents regression and code rot during autonomous milestone delivery.

### Negative / Trade-offs:
- Requires discipline in modular directory organization to avoid tight coupling between Storefront, Admin, and Seller features.
- High test coverage and strict CI gates are required to ensure worker jobs and web handlers do not interfere with each other.

---

## Compliance and Verification

Every subsequent milestone (Milestones 002–300) must verify compliance with this ADR:
- Lint and typecheck commands must pass with zero warnings or errors.
- Any attempt to introduce an external microservice backend will be rejected.
- Any floating-point money or unversioned commission calculations will fail code review.
