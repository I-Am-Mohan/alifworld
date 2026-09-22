# AlifWorld Milestone Dependency Graph & Incremental Delivery Workflow

**Document Type**: Architectural Execution Framework & Dependency Governance  
**Phase Reference**: Phase 01 — Governance and Architecture  
**Milestone Reference**: [Milestone 007](../../AlifWorld-300-Milestones/007-milestone-dependency-graph-and-incremental-delivery-workflow.md)  
**Total Milestones**: 300 across 30 Phases  
**Status**: Authoritative & Mandatory  

---

## 1. Topological Delivery Architecture & Phase Gates

The 300 milestones of AlifWorld execute according to a **Directed Acyclic Graph (DAG)**. Milestones are structured so that each deliverable builds strictly upon verified, production-ready predecessor code without speculative forward branching or untested dependencies.

```mermaid
flowchart TD
    P01["Phase 01: Governance & Architecture (001-010)"] --> P02["Phase 02: Repository & Tooling (011-020)"]
    P02 --> P03["Phase 03: Data Architecture (021-030)"]
    
    P03 --> P04["Phase 04: Identity & Auth (031-040)"]
    P03 --> P05["Phase 05: Security & Tenancy (041-050)"]
    P03 --> P06["Phase 06: Localization (051-060)"]
    
    P04 & P05 --> P07["Phase 07: Seller Lifecycle (061-070)"]
    P07 --> P08["Phase 08: Catalog Taxonomy (071-080)"]
    P08 --> P09["Phase 09: Products & Media (081-090)"]
    P09 --> P10["Phase 10: Pricing & VAT (091-100)"]
    P09 --> P11["Phase 11: Warehousing & Stock (101-110)"]
    
    P08 & P09 & P10 & P11 --> P12["Phase 12: Search & Storefront (111-120)"]
    P04 & P12 --> P13["Phase 13: Customer Experience (121-130)"]
    P11 & P13 --> P14["Phase 14: Checkout & Shipping (131-140)"]
    P14 --> P15["Phase 15: Orders & Fulfillment (141-150)"]
    P14 & P15 --> P16["Phase 16: Payments & Finance (151-160)"]
    
    P15 & P16 --> P17["Phase 17: Wallet Ledger (161-170)"]
    P15 & P17 --> P18["Phase 18: Points Engine (171-180)"]
    
    P17 & P18 --> P19["Phase 19: Customer Rewards & Clubs (181-190)"]
    P17 & P18 --> P20["Phase 20: Seller Rewards & Clubs (191-200)"]
    P17 & P18 --> P21["Phase 21: Regional Distribution (201-210)"]
    P17 --> P22["Phase 22: Lottery, Ads & Affiliates (211-220)"]
    
    P15 --> P23["Phase 23: Rider & Logistics (221-230)"]
    P05 & P15 & P17 --> P24["Phase 24: Admin, CMS & Support (231-240)"]
    P02 & P15 & P17 --> P25["Phase 25: Notifications & Workers (241-250)"]
    
    P04 & P08 & P14 & P15 & P23 --> P26["Phase 26: REST API & Flutter (251-260)"]
    P25 & P26 --> P27["Phase 27: Scale & Resilience (261-270)"]
    P26 & P27 --> P28["Phase 28: Security & Testing (271-280)"]
    P28 --> P29["Phase 29: DevOps & CI/CD (281-290)"]
    P29 --> P30["Phase 30: Launch & Handover (291-300)"]
```

---

## 2. Phase-to-Phase Transition Gates

Progression across phase boundaries requires satisfying mandatory transition gates:

| Transition Boundary | Primary Gate Criteria | Blocking Risk if Violated |
|:---|:---|:---|
| **Phase 01 -> Phase 02** | Charter, reconciliation, domain boundaries, NFRs, glossary, and DAG fully documented and accepted. | Premature coding without agreed domain invariants or monetary rules. |
| **Phase 02 -> Phase 03** | Next.js initialized, Bun tooling configured, CI pipeline green, design tokens in place. | Broken lint/typecheck pipelines and unstandardized development environment. |
| **Phase 03 -> Phase 04** | Normalized Prisma models created, migrations reversible, poisha/points typed. | Schema churn causing breaking changes across auth, catalog, and checkout. |
| **Phase 05 -> Phase 07** | Server-side authorization and seller tenant isolation (`seller_id`) enforced. | Multi-tenant data leakage between independent sellers. |
| **Phase 11 -> Phase 14** | Atomic stock reservation and multi-warehouse ledger verified under concurrency. | Overselling inventory during multi-vendor customer checkout. |
| **Phase 16 -> Phase 17** | Payment gateway idempotency and signed webhook handling verified. | Ghost orders and lost funds due to untracked gateway transactions. |
| **Phase 18 -> Phase 19** | Mandatory seller-defined points, order snapshotting, and return reversals verified. | Inflated point calculations and reward fraud on cancelled orders. |
| **Phase 26 -> Phase 28** | OpenAPI specifications generated directly from Zod schemas; 100% Flutter parity. | Broken mobile client integration and divergent documentation. |
| **Phase 29 -> Phase 30** | Full regression, load testing (k6), and disaster recovery rehearsals completed. | Production outage or financial ledger imbalance during launch. |

---

## 3. The Incremental Milestone Execution Protocol

Every milestone (from 001 to 300) follows an immutable execution protocol:

```
[ 1. Verify Predecessor ] -> Must verify Milestone N-1 is status: completed
            │
            ▼
[ 2. Inspect Repository ] -> Locate touched files, routes, schemas, tests
            │
            ▼
[ 3. Contract First ]     -> Define Zod schemas, state machines, invariants
            │
            ▼
[ 4. Make Smallest Production Change ] -> Write real code; zero placeholders
            │
            ▼
[ 5. Execute Tests & Quality Checks ] -> bun run lint && typecheck && test
            │
            ▼
[ 6. Update Docs & Milestone File ]   -> Mark status completed and [x] criteria
            │
            ▼
[ 7. Emit 7-Part Completion Report ]  -> Detailed evidence-based handoff
```

### Dependency Rules for Executing Agents:
1. **Never Skip Milestones**: An agent cannot begin Milestone N if Milestone N-1 does not have its acceptance criteria checked `[x]` and its completion report published.
2. **Zero Forward Drift**: If a milestone encounters an unresolvable technical or business block, the agent must stop and record the issue in the decision log. Speculatively implementing parts of later milestones is forbidden.
3. **Atomic Commit per Milestone**: Each milestone forms an independent, buildable, tested Git commit.

---

## 4. Critical Path Analysis

The critical path represents the minimum sequence of dependent phases that must execute to achieve an end-to-end commerce transaction:

```
Critical Path (Days 1 to 30):
Phase 01 (Governance) ──> Phase 02 (Tooling) ──> Phase 03 (Data Models)
                     ──> Phase 04/05 (IAM & Security) ──> Phase 07 (Seller Onboarding)
                     ──> Phase 08/09 (Catalog & Products) ──> Phase 10/11 (Pricing & Stock)
                     ──> Phase 14/15 (Checkout & Orders) ──> Phase 16/17 (Payments & Ledger)
                     ──> Phase 18/19 (Points & Rewards) ──> Phase 26 (Flutter API)
                     ──> Phase 28/29 (QA & DevOps) ──> Phase 30 (Launch)
```

Parallel streams (e.g. Phase 06 Localization, Phase 23 Rider Logistics, Phase 24 CMS) branch from verified data models and converge prior to Phase 26 (REST API integration).
