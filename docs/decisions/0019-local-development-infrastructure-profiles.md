# ADR 0019: Local Development Infrastructure Profiles (Docker Compose)

**Status**: Accepted  
**Date**: 2026-09-22  
**Deciders**: AlifWorld Architecture & DevOps Team  
**Milestone Reference**: [Milestone 019](../../AlifWorld-300-Milestones/019-create-local-development-infrastructure-profiles.md)  
**Supporting Specification**: [Local Development Infrastructure Profiles Specification](../architecture/local-development-infrastructure-profiles.md)  

---

## Context and Problem Statement

The AlifWorld platform requires multiple stateful infrastructure dependencies: PostgreSQL for relational data and transactional outbox tables, Redis for caching, rate limiting, and BullMQ queues, MinIO for S3-compatible media storage, Meilisearch for storefront search, and local SMTP inspection for notifications.

Without a standardized containerized infrastructure setup, developers face differing local versions, manual credential configuration, missing media buckets, and port collisions.

Milestone 019 requires establishing reproducible Docker Compose infrastructure profiles matching the exact credentials and ports defined in `.env.example`.

A formal Architecture Decision Record is required to standardize this infrastructure.

---

## Decision Drivers

- **Zero Credential Drift**: Complete alignment between `docker-compose.yml`, `.env.example`, and `src/shared/config/environment.ts`.
- **Resource Efficiency**: Providing a lightweight `core` profile (PostgreSQL + Redis) alongside the `full` platform profile.
- **Automated Bootstrapping**: Automated bucket creation for MinIO (`alifworld-media`) without manual admin steps.
- **Reliable Readiness Probes**: Native container healthchecks on PostgreSQL (`pg_isready`), Redis (`redis-cli ping`), MinIO, and Meilisearch.

---

## Decision Outcome

The AlifWorld engineering architecture formally adopts the **Docker Compose Infrastructure Profiles Standard**:

### 1. Multi-Profile Docker Compose Architecture (`docker-compose.yml`)
- `core` profile: PostgreSQL 16 Alpine and Redis 7 Alpine.
- `full` profile: PostgreSQL 16, Redis 7, MinIO S3, MinIO Setup, Meilisearch, and Mailpit.

### 2. Service Specifications & Exact Credential Mapping
- **PostgreSQL**: `POSTGRES_USER=alifworld`, `POSTGRES_PASSWORD=alifworld_local_secret`, `POSTGRES_DB=alifworld_dev`, Port `5432:5432`.
- **Redis**: Port `6379:6379`, `--appendonly yes`.
- **MinIO**: Ports `9000:9000`, `9001:9001`, `MINIO_ROOT_USER=minioadmin`, `MINIO_ROOT_PASSWORD=minioadmin`.
- **MinIO Setup**: Idempotently provisions bucket `alifworld-media` with public read access.
- **Meilisearch**: Port `7700:7700`, `MEILI_MASTER_KEY=masterKey123`.
- **Mailpit**: Ports `1025:1025` (SMTP), `8025:8025` (Web UI).

### 3. Lifecycle Automation in `package.json`
- `bun run infra:up`: Starts full profile in background.
- `bun run infra:core`: Starts lightweight core profile.
- `bun run infra:down`: Stops infrastructure.
- `bun run infra:logs`: Follows logs.
- `bun run infra:reset`: Purges volumes and restarts fresh.

---

## Consequences

### Positive:
- Single-command developer setup (`bun run infra:up` or `bun run infra:core`).
- Eliminates configuration bugs and port mismatch between code and local databases.
- Automates S3 bucket creation and health monitoring.
- Verified by automated unit tests in `tests/unit/infrastructure-profiles.test.ts`.

### Negative:
- Local development requires Docker and Docker Compose installed on developer workstations.
