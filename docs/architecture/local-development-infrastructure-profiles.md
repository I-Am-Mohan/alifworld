# AlifWorld Local Development Infrastructure Profiles Specification

**Document Type**: Architectural Specification & Local Infrastructure Guide  
**Milestone Reference**: [Milestone 019](../../AlifWorld-300-Milestones/019-create-local-development-infrastructure-profiles.md)  
**Status**: Active / Approved  
**Related Decision**: [ADR-0019](../decisions/0019-local-development-infrastructure-profiles.md)  

---

## 1. Overview and Purpose

The AlifWorld platform is architected as a single-application modular monolith backed by stateful services: PostgreSQL 16 (relational persistence and transactional outbox), Redis 7 (distributed locks, rate limiting, and BullMQ job queues), MinIO (S3-compatible object storage), Meilisearch (full-text search), and Mailpit (local SMTP capture).

To ensure a reproducible, turnkey local developer experience with zero credential drift, Milestone 019 establishes Docker Compose infrastructure profiles in [`docker-compose.yml`](../../docker-compose.yml).

---

## 2. Infrastructure Topology & Profiles

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        DOCKER COMPOSE INFRASTRUCTURE PROFILES                          │
└────────────────────────────────────────────────────────────────────────────────────────┘
          │                                                       │
          ▼ Profile: "core"                                       ▼ Profile: "full" (Default)
┌─────────────────────────────────┐                     ┌─────────────────────────────────┐
│ • PostgreSQL 16 (Port 5432)     │                     │ • Core Profile (Postgres+Redis) │
│ • Redis 7 (Port 6379)           │                     │ • MinIO S3 API (Port 9000)      │
│                                 │                     │ • MinIO Console (Port 9001)     │
│ (Lightweight memory footprint)  │                     │ • MinIO Auto-Bucket Setup       │
└─────────────────────────────────┘                     │ • Meilisearch (Port 7700)       │
                                                        │ • Mailpit SMTP (Port 1025/8025) │
                                                        └─────────────────────────────────┘
```

The infrastructure defines two explicit profiles:
1. **`core` Profile**: Runs only PostgreSQL and Redis. Ideal for rapid development of domain logic, unit tests, and migrations with minimal CPU/RAM overhead.
2. **`full` Profile**: Runs the complete platform dependencies including MinIO, Meilisearch, and Mailpit for full-stack integration testing.

---

## 3. Service Catalog and Configuration Standards

All credentials and ports strictly mirror [`src/shared/config/environment.ts`](../../src/shared/config/environment.ts) and [`.env.example`](../../.env.example):

### 3.1 PostgreSQL 16 (`alifworld-postgres`)
- **Image**: `postgres:16-alpine`
- **Port**: `5432:5432`
- **Database**: `alifworld_dev`
- **Credentials**: User `alifworld`, Password `alifworld_local_secret`
- **Healthcheck**: `pg_isready -U alifworld -d alifworld_dev` (5s interval, 5 retries)
- **Volume**: `alifworld_postgres_data`

### 3.2 Redis 7 (`alifworld-redis`)
- **Image**: `redis:7-alpine`
- **Port**: `6379:6379`
- **Persistence**: Append-Only File (`--appendonly yes`)
- **Healthcheck**: `redis-cli ping` (5s interval, 5 retries)
- **Volume**: `alifworld_redis_data`

### 3.3 MinIO S3-Compatible Storage (`alifworld-minio`)
- **Image**: `minio/minio:latest`
- **Ports**: `9000:9000` (S3 API), `9001:9001` (Web Console)
- **Credentials**: User `minioadmin`, Password `minioadmin`
- **Healthcheck**: `curl -f http://localhost:9000/minio/health/live`
- **Automatic Bucket Initialization (`minio-setup`)**:
  - One-shot companion container (`minio/mc:latest`).
  - Idempotently creates `alifworld-media` bucket.
  - Sets public download policy matching `.env.example`.

### 3.4 Meilisearch Search Engine (`alifworld-meilisearch`)
- **Image**: `getmeili/meilisearch:v1.10`
- **Port**: `7700:7700`
- **Master Key**: `masterKey123`
- **Healthcheck**: `curl -f http://localhost:7700/health`
- **Volume**: `alifworld_meilisearch_data`

### 3.5 Mailpit SMTP Inspector (`alifworld-mailpit`)
- **Image**: `axllent/mailpit:latest`
- **Ports**: `1025:1025` (SMTP server), `8025:8025` (Web UI)
- **Purpose**: Intercepts verification emails, OTPs, and transaction alerts in local development.

---

## 4. Lifecycle Management Commands

The following scripts are registered in [`package.json`](../../package.json):

| Command | Action |
| :--- | :--- |
| `bun run infra:up` | Boots all infrastructure services under the `full` profile in the background. |
| `bun run infra:core` | Boots only PostgreSQL and Redis under the `core` profile. |
| `bun run infra:down` | Stops and tears down all containers while preserving data volumes. |
| `bun run infra:logs` | Streams consolidated container logs in realtime. |
| `bun run infra:reset` | Destroys data volumes and restarts all fresh containers. |

---

## 5. Verification and Correctness

Automated verification is implemented in [`tests/unit/infrastructure-profiles.test.ts`](../../tests/unit/infrastructure-profiles.test.ts):
- Verifies exact credential matches with `.env.example`.
- Verifies healthcheck definitions and port allocations.
- Proves presence of `core` and `full` profiles.
- Validates corresponding `package.json` infrastructure scripts.
