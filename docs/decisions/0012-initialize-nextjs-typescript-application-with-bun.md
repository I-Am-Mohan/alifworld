# ADR 0012: Next.js TypeScript Application Initialization with Bun

**Status**: Accepted  
**Date**: 2026-09-22  
**Deciders**: AlifWorld Architecture & Core Engineering Team  
**Milestone Reference**: [Milestone 012](../../AlifWorld-300-Milestones/012-initialize-the-next-js-typescript-application-with-bun.md)  
**Supporting Specification**: [Next.js Application Initialization with Bun](../architecture/nextjs-application-initialization.md)  

---

## Context and Problem Statement

Following the completion of Phase 01 governance and the Milestone 011 repository baseline audit, the AlifWorld platform requires the official initialization of its single-application modular monolith codebase.

To ensure consistency, security, and developer velocity across the 300-milestone lifecycle:
1. The project must enforce strict TypeScript compilation with zero loose types or unchecked nulls.
2. The runtime configuration must support high-density, multi-instance containerized deployments (`output: 'standalone'`).
3. The build and execution tooling must adhere to the standardized Bun command contract (`bun run lint`, `bun run typecheck`, `bun run test`, `bun run build`).
4. Authoritative brand tokens (`colors.md`, `tokens.css`) must be natively accessible across all UI components through Tailwind CSS.
5. System probes (`/api/health/live` and `/api/health/ready`) must be available from day one to support zero-downtime rolling deployments.

A formal Architecture Decision Record is required to document this application initialization.

---

## Decision Drivers

- **Locked Monolith Architecture**: Guaranteeing that Storefront, Admin, Seller, and APIs remain unified in a single Next.js codebase.
- **Reproducible Tooling Contract**: Standardizing scripts on Bun for fast execution and predictable CI outcomes.
- **Enterprise Containerization**: Minimizing image sizes and memory footprint via Next.js standalone tracing.
- **Day-One Observability**: Immediate availability of liveness and readiness health checks.

---

## Decision Outcome

The AlifWorld engineering architecture formally adopts the **Next.js TypeScript Application Initialization with Bun**:

### 1. Application Scaffold & Runtime Stack
- **Framework**: Next.js 14+ App Router (`src/app/`) with React 18.
- **Package Management & Tooling**: Bun runtime and package manager, with Node.js `>=20.0.0` engine compatibility.
- **TypeScript**: Strict configuration (`target: ES2022`, `strict: true`, `noEmit: true`), with `@/*` mapped to `./src/*`.

### 2. Standalone Deployment & Security Headers
- `next.config.mjs` adopts `output: 'standalone'` to generate optimized standalone builds for Docker containerization.
- Automatically applies HTTP security headers: HSTS, `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, and Referrer-Policy.

### 3. Styling & Brand Token Integration
- Tailwind CSS (`tailwind.config.ts`) extends theme colors with authoritative tokens:
  - Deep Black (`#000000`), Pure White (`#FFFFFF`), Brand Orange (`#FF6A00`), and Globe Blues (`#4F8FD9`, `#69B7E8`, `#3456A3`).
- Global CSS (`src/app/globals.css`) imports base directives and custom properties from `src/styles/tokens.css`.

### 4. Health Check Probes
- Deploys `/api/health/live` (process liveness) and `/api/health/ready` (environment, timezone, and compliance gate verification).

---

## Consequences

### Positive:
- The AlifWorld platform is now a runnable, strongly typed Next.js application.
- Establishes a seamless developer workflow powered by Bun and TypeScript strict mode.
- Provides immediate containerization readiness and health verification.

### Negative:
- Developers must adhere to App Router conventions and Server/Client component boundaries.
