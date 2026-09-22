# AlifWorld Next.js TypeScript Application Initialization with Bun

**Document Type**: Architectural Specification & Implementation Record  
**Phase Reference**: Phase 02 — Repository and Tooling  
**Milestone Reference**: [Milestone 012](../../AlifWorld-300-Milestones/012-initialize-the-next-js-typescript-application-with-bun.md)  
**Status**: Authoritative & Mandatory  

---

## 1. Executive Summary & Outcome

Milestone 012 delivers the foundational application runtime for the AlifWorld platform. In accordance with the project charter ([ADR-0001](../decisions/0001-project-charter-and-execution-protocol.md)) and modular monolith decisions ([ADR-0006](../decisions/0006-single-application-modular-monolith-architecture.md)), AlifWorld is configured as a single-deployable Next.js 14+ application written in strict TypeScript and managed via Bun.

This initialization embeds all locked project invariants:
- **Single Modular Monolith**: One deployable unit hosting Storefront, Seller Center, Admin, REST API (`/app/api/v1`), and background workers.
- **Strict TypeScript**: Compiler configured with `strict: true`, `noEmit: true`, and path aliasing (`@/* -> ./src/*`).
- **Zero-Downtime Container Readiness**: `next.config.mjs` configured with `output: 'standalone'` and enterprise security headers.
- **Brand Token Fidelity**: Tailwind CSS and `globals.css` wired directly to authoritative color tokens (`#000000`, `#FFFFFF`, `#FF6A00`, globe blues).
- **Probes**: Operational `/api/health/live` and `/api/health/ready` endpoints verifying process health and configuration invariants.

---

## 2. Package Architecture & Bun Command Contract

The root [`package.json`](../../package.json) establishes the standard developer and CI execution contract:

```json
{
  "name": "alifworld",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "build:local": "next build",
    "start": "next start",
    "lint": "eslint . --max-warnings 0",
    "typecheck": "tsc --noEmit",
    "test": "bun test",
    "test:unit": "bun test",
    "openapi": "bun run scripts/generate-openapi.ts"
  }
}
```

### 2.1 Dependency Rationale
- **Core Framework**: `next` (v14.2.x), `react`, `react-dom` (v18.3.x).
- **Persistence & Queues**: `@prisma/client` (PostgreSQL ORM), `ioredis` (Redis caching and distributed locks), `bullmq` (asynchronous job processing).
- **Validation & Typing**: `zod` (runtime schema validation and OpenAPI generator input), `typescript` (v5.6.x).
- **Styling & UI**: `tailwindcss`, `postcss`, `autoprefixer`, `lucide-react`, `clsx`, `tailwind-merge`.
- **Runtime Target**: Bun and Node.js `>=20.0.0`.

---

## 3. Configuration & Runtime Specifications

### 3.1 Strict TypeScript Configuration ([`tsconfig.json`](../../tsconfig.json))
- **Strict Mode**: `strict: true` enforces strict null checks, no implicit any, and strict property initialization.
- **Modern Compilation**: `target: "ES2022"`, `moduleResolution: "bundler"`, `module: "esnext"`.
- **Path Mapping**: `@/*` mapped to `./src/*`, allowing clean imports across all layers:
  - `@/shared/types/domain-terms` (Poisha, ProductPoint)
  - `@/shared/constants/brand-colors` (Brand palette)
  - `@/shared/config/environment` (Runtime config & gate checks)

### 3.2 Production Next.js Engine ([`next.config.mjs`](../../next.config.mjs))
- **Standalone Build (`output: 'standalone'`)**: Automatically traces dependencies to build an ultra-compact, immutable container image suitable for multi-instance cloud deployments behind high-availability load balancers.
- **Security Headers**: Injects HSTS (`max-age=63072000`), `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, and Referrer-Policy into all incoming requests.
- **Remote Image Storage**: Whitelists local MinIO (`localhost:9000`), production CDN, and S3 buckets for responsive Next.js image optimization.

### 3.3 Authoritative Brand Tokens ([`tailwind.config.ts`](../../tailwind.config.ts))
Directly encodes colors from [`colors.md`](../../colors.md) into Tailwind utility classes:
- `bg-brand-black` / `text-brand-black` (`#000000`)
- `bg-brand-white` / `text-brand-white` (`#FFFFFF`)
- `bg-brand-orange` / `text-brand-orange` (`#FF6A00`)
- `bg-brand-globeBlue` (`#4F8FD9`), `bg-brand-globeLightBlue` (`#69B7E8`), `bg-brand-globeDarkBlue` (`#3456A3`)

---

## 4. Initial Application Routes & Health Probes

### 4.1 Storefront Landing Page ([`src/app/page.tsx`](../../src/app/page.tsx))
A responsive Server Component rendering:
- AlifWorld logo and navigation header.
- Hero presentation highlighting Bangladesh's Next-Gen Commerce & Rewards Ecosystem.
- Architectural pillar cards: Integer Poisha Ledger, Decoupled Product Points, and Compliance Gating.
- Live status indicator.

### 4.2 Liveness & Readiness Probes
- **`/api/health/live`**: Fast liveness probe returning HTTP `200` with process uptime and UTC timestamp.
- **`/api/health/ready`**: Deep readiness probe verifying configuration validity, timezone (`Asia/Dhaka`), base currency (`BDT`), and compliance gate states. Returns `503 Service Unavailable` if configuration fails validation.

---

## 5. Next Steps

With Milestone 012 complete, the application runtime is established and runnable. The project immediately proceeds to **Milestone 013: Establish directory structure and module boundaries**.
