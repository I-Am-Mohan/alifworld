# ADR 0016: Typed Environment Validation and Secret Boundaries Architecture

**Status**: Accepted  
**Date**: 2026-09-22  
**Deciders**: AlifWorld Architecture & Security Team  
**Milestone Reference**: [Milestone 016](../../AlifWorld-300-Milestones/016-implement-typed-environment-validation-and-secret-boundaries.md)  
**Supporting Specification**: [Environment Validation and Secret Boundaries Specification](../architecture/environment-validation-and-secret-boundaries.md)  

---

## Context and Problem Statement

The AlifWorld platform operates financial ledgers, transactional wallets, Bangladesh MFS payment integrations (bKash, Nagad, SSLCommerz), courier logistics APIs (Pathao, RedX, Steadfast), and multi-tenant seller portals within a single Next.js modular monolith.

In full-stack Next.js applications, runtime environment configuration presents severe security and operational risks:
1. **Accidental Client Exposure**: Server secrets accidentally imported into Client Components (`'use client'`) leak into public browser JavaScript bundles.
2. **Delayed Failure**: Malformed or missing environment variables cause silent runtime exceptions during production traffic rather than failing fast at application boot.
3. **Invariant Violation**: Critical regulatory and business invariants (such as prohibition of multi-tier pyramid structures or cash conversion of product points) could be inadvertently toggled via misconfigured environment flags.
4. **Secret Leakage in Diagnostics**: Raw environment dumps during error logging or build checks expose sensitive credentials to observability tools.

A formal Architecture Decision Record is required to establish typed environment validation, runtime secret boundaries, and credential hygiene.

---

## Decision Drivers

- **Zero Secret Leakage**: Absolute prohibition of server credentials and secrets appearing in browser bundles.
- **Fail-Fast Boot Validation**: Immediate validation error at process start if any required environment variable is missing or malformed.
- **Hard-Locked Invariant Guarantees**: Cryptographic and schema enforcement of core regulatory constraints (`MAX_AFFILIATE_DEPTH=1`, `FEATURE_POINTS_CASH_CONVERTIBLE=false`).
- **Complete Type Safety**: Eliminate untyped `process.env` access across the codebase.
- **Automated Redaction**: Automatic masking of sensitive keys during error reporting or logging.

---

## Decision Outcome

The AlifWorld engineering architecture formally adopts the **Typed Environment Validation and Secret Boundaries Architecture**:

### 1. Dual Zod Schema Architecture
Configuration is split into two validated schemas in [`src/shared/config/environment.ts`](../../src/shared/config/environment.ts):
- `clientEnvSchema`: Strictly validates variables prefixed with `NEXT_PUBLIC_` (`NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_CDN_URL`, `NEXT_PUBLIC_DEFAULT_LOCALE`, `NEXT_PUBLIC_BASE_CURRENCY`). Safe for client and server.
- `serverEnvSchema`: Extends `clientEnvSchema` with all server-side database, cache, auth, storage, search, payment, logistics, SMS, and compliance variables.

### 2. Runtime Secret Boundary Proxy
Server-side secrets are accessed via the `env` singleton. The singleton wraps access in a Proxy that verifies execution context:
- If accessed in a browser runtime (`typeof window !== 'undefined'`), it throws an immediate fatal error: `[Security Violation] Attempted to read server environment variable...`.
- Client components must exclusively import and consume `clientEnv`.

### 3. Schema Enforcement of Locked Invariants
- `BASE_CURRENCY`: Locked to `BDT` (`z.literal('BDT')`).
- `TZ`: Locked to `Asia/Dhaka` (`z.literal('Asia/Dhaka')`).
- `MAX_AFFILIATE_DEPTH`: Locked to `1` (`z.coerce.number().min(1).max(1)`).
- `FEATURE_POINTS_CASH_CONVERTIBLE`: Hard-locked to `false` (`z.literal(false)`).
- `JWT_SECRET` & `SESSION_SECRET`: Minimum 32-character requirement enforced for cryptographic security.

### 4. Credential Redaction Hygiene
- Functions `isSensitiveKey` and `redactSecret` mask credentials (`***[REDACTED]***`) matching sensitive patterns.
- Error diagnostics emit only field paths and issue descriptions without exposing actual or neighboring values.

### 5. Standardized Module Structure
- Canonical implementation: `src/shared/config/environment.ts`
- Barrel exports: `src/shared/config/index.ts` and `@/config` (`src/config/index.ts`).

---

## Consequences

### Positive:
- Completely eliminates secret leakage into client JavaScript bundles.
- Fails fast at application boot if any configuration is missing or malformed, preventing runtime outages.
- Programmatically prevents violations of core regulatory and business invariants.
- Provides full TypeScript autocompletion and type checking across all environment variables.

### Negative:
- Developers cannot access server variables in Client Components without an explicit server action or API route.
- Any new environment variable must be added to both `.env.example` and `src/shared/config/environment.ts` before use.
