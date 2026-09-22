# PostgreSQL and Prisma Foundations Architecture

**Document Type**: Architectural Specification & Implementation Standard  
**Milestone Reference**: [Milestone 021](../../AlifWorld-300-Milestones/021-configure-postgresql-and-prisma-foundations.md)  
**Phase**: Phase 03: Data Architecture  
**Status**: Authoritative / Implemented  
**Date**: 2026-09-22  

---

## 1. Executive Overview & Scope

Phase 03 initiates the **Data Architecture** for the AlifWorld e-commerce platform. The overarching purpose of Phase 03 is to establish normalized PostgreSQL models, strict database constraints, optimized compound indexes, and deterministic migrations via Prisma, ensuring full financial traceability and multi-tenant isolation.

**Milestone 021** establishes the core database foundations:
- Canonical Prisma schema configuration targeting PostgreSQL 16.
- Resilient singleton connection management compatible with Next.js App Router hot-reloading.
- Base repository pattern and unified error translation mapping database exceptions to domain `AppError` types.
- Operational health checks integrated into Kubernetes-compatible readiness probes (`/api/health/ready`).
- Foundational infrastructure tables: `system_configs`, `health_probes`, `outbox_events`, and `audit_logs`.
- Idempotent database seed harness (`prisma/seed.ts`).

---

## 2. Infrastructure & Connection Pool Topology

### 2.1 Database Credentials & Connection Parameters
Connection parameters strictly align with `.env.example` and the typed configuration schema in `src/shared/config/environment.ts`:
- **Engine**: PostgreSQL 16 Alpine
- **Database Name**: `alifworld_dev` (configurable via `DATABASE_URL`)
- **Default Port**: `5432`
- **Default Pool Size**: `10` connections per web/worker container instance
- **Direct Connection URL**: `DIRECT_DATABASE_URL` (bypasses transaction poolers like PgBouncer for migrations)

### 2.2 Connection String Format
```text
postgresql://alifworld:alifworld_local_secret@localhost:5432/alifworld_dev?schema=public&connection_limit=10
```

---

## 3. Prisma Schema Design Standards

All future domain models in Phase 03 (Milestones 022–029) must adhere to these structural conventions:

1. **PascalCase Models & snake_case Tables**:
   - Model definitions use TypeScript PascalCase (e.g. `SystemConfig`, `OutboxEvent`).
   - Physical table names use snake_case plural with explicit `@@map("...")` (e.g. `@@map("system_configs")`).
2. **camelCase Fields & snake_case Columns**:
   - Model fields use camelCase (e.g. `probeType`, `createdAt`).
   - Physical database columns use snake_case with explicit `@map("...")` (e.g. `@map("probe_type")`, `@map("created_at")`).
3. **Primary Key Standardization**:
   - All models use UUID primary keys: `id String @id @default(uuid())`.
4. **Lifecycle Timestamps**:
   - `createdAt DateTime @default(now()) @map("created_at")`
   - `updatedAt DateTime @updatedAt @map("updated_at")`
5. **Integer Minor Monetary Units**:
   - All monetary amounts represent integer minor units (poisha). Floating-point numeric columns for money are strictly prohibited.
6. **Independent Product Points**:
   - Product Points are distinct integer quantities; never stored as converted cash or floating-point ratios.

---

## 4. Foundational Data Models

Milestone 021 establishes four foundational infrastructure models in `prisma/schema.prisma`:

### 4.1 SystemConfig (`system_configs`)
Stores platform configuration parameters, financial rule versions, and feature flags. Changes are tracked and versioned.
- `id`: String (UUID)
- `key`: String (Unique)
- `value`: String
- `description`: String?
- `isPublic`: Boolean (Flag indicating safe client exposure)
- `created_at` / `updated_at`: DateTime

### 4.2 HealthProbe (`health_probes`)
Persists operational telemetry from readiness and liveness checks for latency tracking and reliability auditing.
- `id`: String (UUID)
- `probe_type`: String (`live` | `ready`)
- `status`: String (`healthy` | `degraded` | `unhealthy`)
- `latency_ms`: Int
- `metadata`: Json?
- `created_at`: DateTime (Indexed with `probe_type`)

### 4.3 OutboxEvent (`outbox_events`)
Implements the Transactional Outbox pattern (ADR-0003, ADR-0006). Domain mutations write events into this table within the same ACID transaction; BullMQ workers consume and dispatch them asynchronously.
- `id`: String (UUID)
- `event_type`: String (e.g., `ORDER_CREATED`, `POINTS_ACCRUED`)
- `aggregate_type`: String (e.g., `Order`, `Wallet`)
- `aggregate_id`: String
- `payload`: Json
- `status`: String (`PENDING` | `PROCESSING` | `PROCESSED` | `FAILED`)
- `attempts`: Int
- `last_error`: String?
- `processed_at`: DateTime?

### 4.4 AuditLog (`audit_logs`)
Maintains an immutable append-only trail of all sensitive operations, configuration updates, and security events.
- `id`: String (UUID)
- `actor_id`: String?
- `actor_role`: String?
- `action`: String
- `resource`: String
- `resource_id`: String?
- `ip_address`: String?
- `user_agent`: String?
- `metadata`: Json?
- `created_at`: DateTime

---

## 5. Next.js Singleton Connection Management

To avoid exhausting PostgreSQL connection pools during Next.js development hot module replacement (HMR), the Prisma client is declared as a global singleton in `src/shared/database/prisma.ts`:

```typescript
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

### Logging Configuration:
- **Development**: `['query', 'error', 'warn']` for full query visibility.
- **Production / Staging**: `['error', 'warn']` to prevent sensitive query payloads and PII from reaching standard output.

---

## 6. Database Error Translation Hierarchy

To prevent internal database table names, SQL constraints, and credentials from leaking through API responses, `src/shared/database/error-translator.ts` intercepts Prisma exceptions and maps them to strongly typed `AppError` subclasses:

| Prisma Error Code | Description | Translated Domain Error | HTTP Status |
|:---|:---|:---|:---:|
| `P2002` | Unique constraint violation | `ConflictError` | `409` |
| `P2025` | Record to update/delete not found | `NotFoundError` | `404` |
| `P2003` | Foreign key constraint failed | `ValidationError` | `422` |
| `P2000` | Value exceeds column length | `ValidationError` | `422` |
| `P2014` | Required relationship violation | `ValidationError` | `422` |
| `P2024` | Connection pool checkout timeout | `InternalServerError` | `500` |
| *Unhandled* | Unspecified query failure | `InternalServerError` | `500` |

---

## 7. Base Repository Pattern & Multi-Tenant Scoping

In alignment with the four-tier dependency architecture (ADR-0006):
1. **Route Handlers** (`app/api/*`) are thin orchestrators.
2. **Domain Services** (`services/*`) own business logic and transactions.
3. **Repositories** (`repositories/*`) extend `BaseRepository` to encapsulate database queries.

### Multi-Tenant Protection
Repositories enforce tenant boundaries using `assertSellerScope(entitySellerId, authorizedSellerId)`. Any attempt by an authenticated seller to access records outside their tenant raises an immediate `AuthorizationError` (HTTP 403).

### Standardized Pagination
`parseOffsetPagination` and `formatPaginatedResult` enforce:
- Positive page and limit bounds.
- Configurable maximum page size ceilings (default: 100).
- Consistent metadata structures (`total`, `page`, `limit`, `totalPages`, `hasNext`, `hasPrev`).

---

## 8. Idempotent Database Seed Harness

The database seed script (`prisma/seed.ts`, run via `bun run db:seed`) provides idempotent initialization:
- Uses `upsert` operations on `SystemConfig` records.
- Injects core business constants:
  - `PLATFORM_CURRENCY`: `BDT`
  - `PLATFORM_TIMEZONE`: `Asia/Dhaka`
  - `PLATFORM_LOCALES`: `bn-BD,en-BD`
  - `FEATURE_POINTS_CASH_CONVERTIBLE`: `false`
  - `MAX_AFFILIATE_DEPTH`: `1`
  - Initial rule versions (`v1.0.0`)
- Records seed execution in `AuditLog`.
- Closes database connections cleanly upon completion.
