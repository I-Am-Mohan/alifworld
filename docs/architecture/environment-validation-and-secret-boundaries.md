# AlifWorld Environment Validation and Secret Boundaries Architecture

**Document Type**: Architectural Specification & Security Standard  
**Milestone Reference**: [Milestone 016](../../AlifWorld-300-Milestones/016-implement-typed-environment-validation-and-secret-boundaries.md)  
**Status**: Active / Approved  
**Related Decision**: [ADR-0016](../decisions/0016-typed-environment-validation-and-secret-boundaries.md)  

---

## 1. Context and Problem Statement

An enterprise-grade modular monolith handling multi-tenant e-commerce, double-entry financial ledgers, customer reward points, and mobile financial services (MFS) integrations requires ironclad configuration management.

Typical vulnerabilities and failure modes in modern full-stack web applications include:
1. **Secret Leakage to Browser Bundles**: Accidental import of server configuration files into Client Components (`'use client'`), exposing database passwords or payment gateway private keys in client JavaScript bundles.
2. **Silent Runtime Crashes**: Missing or malformed environment variables discovered only after traffic hits an affected route at runtime.
3. **Breach of Architectural Invariants**: Misconfiguration overriding critical invariants (e.g. attempting to enable multi-tier pyramid marketing or making loyalty points convertible to cash).
4. **Plaintext Credential Exposure in Logs**: Printing raw environment dictionaries during debugging or crash reporting, leaking secrets to observability platforms.

Milestone 016 establishes a typed runtime environment validation and secret boundary architecture to permanently eliminate these failure modes.

---

## 2. Core Architectural Principles

```
  ┌─────────────────────────────────────────────────────────┐
  │                 Process Startup / Boot                  │
  └────────────────────────────┬────────────────────────────┘
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
    ┌──────────────────────┐       ┌──────────────────────┐
    │  validateClientEnv   │       │  validateServerEnv   │
    │  (NEXT_PUBLIC_*)     │       │  (Full Server Env)   │
    └──────────┬───────────┘       └──────────┬───────────┘
               │ Pass                         │ Pass
               ▼                              ▼
    ┌──────────────────────┐       ┌──────────────────────┐
    │      clientEnv       │       │       env Proxy      │
    │   (Browser Safe)     │       │   (Server-Only Guard)│
    └──────────────────────┘       └──────────┬───────────┘
                                              │ Client Access Attempt
                                              ▼
                                   ┌──────────────────────┐
                                   │  Security Exception  │
                                   │  (Fatal Throw)       │
                                   └──────────────────────┘
```

1. **Fail-Fast at Boot**: Both server and client environments are strictly parsed using Zod schemas during initialization. Missing or malformed variables fail immediately with clear, descriptive diagnostics.
2. **Strict Logical & Physical Secret Separation**: Server secrets are restricted to server execution contexts. A runtime Proxy guard detects and blocks any attempt to access server keys from browser code.
3. **Automated Redaction & Log Hygiene**: Error reporting utilities and diagnostics automatically mask all keys matching sensitive patterns (`SECRET`, `KEY`, `PASSWORD`, `TOKEN`, `URL`).
4. **Type Safety & IDE Autocompletion**: Full TypeScript typing for all runtime settings, eliminating raw `process.env["KEY"]` lookups.
5. **Locked Invariant Enforcement**: Critical regulatory and business invariants are enforced at the schema level.

---

## 3. Schema Hierarchy and Domain Typing

The environment architecture separates configuration into two distinct Zod schemas located in [`src/shared/config/environment.ts`](../../src/shared/config/environment.ts):

### A. Client-Safe Schema (`clientEnvSchema`)
Exposes only public configuration prefixed with `NEXT_PUBLIC_`:
- `NEXT_PUBLIC_APP_URL`: Public storefront application URL (default: `http://localhost:3000`).
- `NEXT_PUBLIC_CDN_URL`: Public asset and media CDN endpoint (default: `http://localhost:9000/alifworld-media`).
- `NEXT_PUBLIC_DEFAULT_LOCALE`: Default launch locale, locked to `bn-BD`.
- `NEXT_PUBLIC_BASE_CURRENCY`: Locked launch currency, `BDT`.

### B. Server Schema (`serverEnvSchema`)
Extends `clientEnvSchema` with all infrastructure, security, and integration variables:
- **Application Runtime**: `NODE_ENV`, `APP_ENV`, `PORT`, `TZ` (`Asia/Dhaka`), `SUPPORTED_LOCALES`.
- **Database (PostgreSQL & Prisma)**: `DATABASE_URL`, `DATABASE_POOL_MIN`, `DATABASE_POOL_MAX`.
- **Cache & Queues (Redis & BullMQ)**: `REDIS_URL`, `REDIS_KEY_PREFIX`, `REDIS_TLS_ENABLED`.
- **Security & Sessions**: `JWT_SECRET` (min 32 chars), `JWT_EXPIRES_IN`, `REFRESH_TOKEN_EXPIRES_IN`, `SESSION_SECRET` (min 32 chars), `COOKIE_DOMAIN`, `COOKIE_SECURE`, rate limit ceilings.
- **Object Storage (S3 / MinIO)**: `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME`, `S3_FORCE_PATH_STYLE`.
- **Search Engine (Meilisearch)**: `MEILISEARCH_HOST`, `MEILISEARCH_API_KEY`, `MEILISEARCH_INDEX_PREFIX`.
- **MFS Payment Gateways**: bKash, Nagad, SSLCommerz credentials and sandbox toggles.
- **Logistics**: Pathao, RedX, Steadfast credentials and endpoints.
- **SMS Gateways**: Greenweb and Twilio credentials.
- **Compliance Gates**: Locked invariant flags and thresholds.

---

## 4. Enforcement of Locked Project Invariants

The Zod schema enforces non-negotiable project invariants at process start:

| Invariant | Config Key | Enforced Rule | Rationale |
| :--- | :--- | :--- | :--- |
| **Launch Currency** | `BASE_CURRENCY` | `z.literal('BDT')` | Single national launch currency; no arbitrary multi-currency drift. |
| **Business Timezone** | `TZ` | `z.literal('Asia/Dhaka')` | Canonical business day cutoffs and financial reconciliation calendar. |
| **Single-Tier Referral** | `MAX_AFFILIATE_DEPTH` | `z.coerce.number().min(1).max(1)` | Strict anti-pyramid compliance under Bangladesh regulatory framework. |
| **Non-Convertible Points** | `FEATURE_POINTS_CASH_CONVERTIBLE` | `z.literal(false)` | Product Points are loyalty metrics and must never be converted to withdrawable cash. |
| **Cryptographic Strength** | `JWT_SECRET`, `SESSION_SECRET` | `z.string().min(32)` | Prevents weak tokens vulnerable to brute-force attacks. |

---

## 5. Secret Boundary & Client Protection Mechanism

To eliminate accidental client-side leakage:

1. **Next.js Bundler Boundary**: Next.js automatically bundles only variables prefixed with `NEXT_PUBLIC_` into the browser bundle.
2. **Runtime Proxy Guard**:
```typescript
export const env: ServerEnv = new Proxy({} as ServerEnv, {
  get(_target, prop: string | symbol) {
    if (typeof window !== 'undefined') {
      throw new Error(
        `[Security Violation] Attempted to read server environment variable '${String(
          prop
        )}' on the client. Only NEXT_PUBLIC_* variables may be accessed in browser code via clientEnv.`
      );
    }
    // ... validate & return cached server environment
  },
});
```
3. **Safe Client Access**: Browser components import `clientEnv` from `@/shared/config`, which exposes only validated `NEXT_PUBLIC_*` properties.

---

## 6. Credential Redaction Hygiene

The configuration module includes built-in redaction functions:
- `isSensitiveKey(key)`: Matches sensitive patterns against key names (`SECRET`, `KEY`, `PASSWORD`, `TOKEN`, `AUTH`, `DATABASE_URL`, `REDIS_URL`).
- `redactSecret(key, value)`: Returns `'***[REDACTED]***'` for sensitive entries while preserving operational non-sensitive values for debugging.
- Error formatters output only the field name and validation issue, never the raw input value.

---

## 7. Verification and Testing

Automated verification is implemented in [`tests/unit/environment.test.ts`](../../tests/unit/environment.test.ts):
- Verifies successful validation under default and custom inputs.
- Proves rejection of `MAX_AFFILIATE_DEPTH > 1`.
- Proves rejection of `FEATURE_POINTS_CASH_CONVERTIBLE = true`.
- Proves rejection of weak JWT secrets (< 32 characters).
- Proves proper redaction of sensitive credentials.
