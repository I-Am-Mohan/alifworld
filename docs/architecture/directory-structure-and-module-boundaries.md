# AlifWorld Directory Structure & Module Boundaries Specification

**Document Type**: Architectural Structure & Module Boundary Governance  
**Phase Reference**: Phase 02 — Repository and Tooling  
**Milestone Reference**: [Milestone 013](../../AlifWorld-300-Milestones/013-establish-directory-structure-and-module-boundaries.md)  
**Status**: Authoritative & Mandatory  

---

## 1. Executive Summary & Core Rules

Milestone 013 operationalizes the physical directory hierarchy and modular boundaries of the AlifWorld single-application Next.js modular monolith. 

To maintain clean separation of concerns, high testability, and strict security across all 20 bounded contexts without introducing microservice operational overhead, the codebase enforces three fundamental rules:
1. **The 4-Tier Layer Isolation Rule**:
   - `Route Handlers & Pages (`src/app`)` -> `Domain Services (`src/features/*/services`)` -> `Domain Repositories (`src/features/*/repositories`)` -> `Persistence / External Gateways`.
   - Higher layers may depend on lower layers; lower layers NEVER import or depend on higher layers.
2. **The Encapsulated Domain Boundary Rule**:
   - Domains in `src/features/<domain>` expose their public interface strictly via `src/features/<domain>/index.ts`.
   - Direct cross-domain database access is prohibited: Domain A must never query Domain B's Prisma models directly. Cross-domain interactions occur through Domain B's public service contract or asynchronous domain events.
3. **The Multi-Tenant Scoping Rule**:
   - All operations touching seller catalog, inventory, order fulfillment, or financial settlements require explicit `sellerId` scoping at the repository boundary.

---

## 2. Complete Repository Directory Topology

```
alifworld/
├── .env.example                                  # Environment variables template
├── .gitignore                                    # Production gitignore
├── README.md                                     # Project root documentation
├── colors.md                                     # Authoritative brand colors source
├── logo.png                                      # Authoritative visual brand logo
├── package.json                                  # Bun script and package manifest
├── tsconfig.json                                 # Strict TypeScript compiler config
├── next.config.mjs                               # Standalone Next.js engine config
├── postcss.config.js                             # PostCSS Tailwind plugins
├── tailwind.config.ts                            # Tailwind theme with brand tokens
│
├── AlifWorld-300-Milestones/                     # 300-Milestone execution specifications
│
├── docs/                                         # Permanent engineering governance
│   ├── architecture/                             # Architectural specifications
│   ├── decisions/                                # Architecture Decision Records (ADRs)
│   └── product/                                  # Product & brand documentation
│
├── public/                                       # Static assets (favicons, brand media)
│   └── brand/
│
└── src/
    ├── app/                                      # Next.js 14+ App Router surfaces
    │   ├── globals.css                           # Tailwind directives & CSS tokens
    │   ├── layout.tsx                            # Root HTML layout (bn-BD default)
    │   ├── page.tsx                              # Customer storefront home page
    │   ├── seller/                               # Seller Center operational UI
    │   │   └── page.tsx
    │   ├── admin/                                # Admin Operations portal & compliance UI
    │   │   └── page.tsx
    │   └── api/                                  # Server-side Route Handlers
    │       ├── health/                           # Infrastructure health probes
    │       │   ├── live/route.ts                 # Process liveness probe
    │       │   └── ready/route.ts                # Dependency readiness probe
    │       └── v1/                               # REST API v1 for Flutter & integrations
    │           └── route.ts
    │
    ├── components/                               # Shared reusable UI components
    │   └── ui/                                   # Design system atoms (Button, Card, etc.)
    │       ├── button.tsx
    │       └── card.tsx
    │
    ├── features/                                 # Bounded Context Domains (ADR-0003)
    │   ├── identity/                             # Auth, users, sessions, RBAC
    │   ├── seller/                               # Seller onboarding, verification, tenant
    │   ├── catalog/                              # Categories, brands, taxonomy
    │   ├── order/                                # Order lifecycle & immutable items
    │   ├── wallet/                               # Double-entry ledger & balances
    │   ├── points/                               # Independent Product Points engine
    │   └── ...                                   # Pricing, Tax, Inventory, Rewards, etc.
    │
    ├── shared/                                   # Cross-cutting primitives & utilities
    │   ├── config/                               # Validated runtime environment & gates
    │   │   └── environment.ts
    │   ├── constants/                            # Brand color constants & system codes
    │   │   └── brand-colors.ts
    │   ├── errors/                               # Domain error hierarchy (AppError)
    │   │   └── app-error.ts
    │   ├── types/                                # Ubiquitous language & Poisha types
    │   │   └── domain-terms.ts
    │   └── utils/                                # Pure calculation & formatting utilities
    │       ├── currency.ts                       # BDT / Poisha formatters & parsers
    │       └── date.ts                           # Asia/Dhaka timezone helpers
    │
    └── workers/                                  # Asynchronous BullMQ workers & jobs
        └── index.ts                              # Worker registry & queue definitions
```

---

## 3. Layer Responsibilities & Architectural Constraints

| Architectural Layer | Directory Path | Responsibilities & Invariants | Prohibited Actions |
|:---|:---|:---|:---|
| **Route Adapters & UI** | `src/app/` | Validates HTTP/JSON input with Zod, checks session auth, calls domain services, serializes unified JSON envelopes. | ❌ No direct SQL/Prisma database queries. ❌ No raw financial calculations. |
| **Domain Services** | `src/features/*/services` | Encapsulates business logic, coordinates multi-step domain workflows, enforces domain invariants, emits outbox events. | ❌ No direct HTTP `NextResponse` handling. ❌ No untyped object manipulations. |
| **Domain Repositories**| `src/features/*/repositories` | Executes scoped Prisma queries, applies multi-tenant `sellerId` filters, selects only necessary fields. | ❌ No cross-domain queries. ❌ No bypass of tenant scoping. |
| **Shared Primitives** | `src/shared/` | Holds pure domain primitives (`Poisha`, `ProductPoint`), system configuration, error classes, date/currency helpers. | ❌ Must never import from `features/` or `app/` (zero cyclic dependencies). |
| **Asynchronous Workers**| `src/workers/` | Consumes BullMQ job queues, processes transactional outbox tasks, sends SMS, reconciles courier tracking. | ❌ No blocking operations without timeouts. ❌ No non-idempotent task processing. |

---

## 4. Multi-Tenant Scoping & Security Isolation

Every seller in AlifWorld is an isolated commercial tenant:
1. **Repository Enforcement**: Repositories managing tenant resources must require a `sellerId` argument on all mutative and query operations:
   ```typescript
   export interface ProductRepository {
     findById(sellerId: string, productId: string): Promise<Product | null>;
     update(sellerId: string, productId: string, data: UpdateProductInput): Promise<Product>;
   }
   ```
2. **Access Control**: Route handlers resolve the authenticated user's `UserSession`. If a user attempts to access a resource owned by another `sellerId`, the domain service throws an `AuthorizationError` yielding HTTP `403 Forbidden`.

---

## 5. Next Steps

With Milestone 013 complete, the physical directory topology and boundary rules are codified and active. The project proceeds immediately to **Milestone 014: Create the AlifWorld design system and brand tokens**.
