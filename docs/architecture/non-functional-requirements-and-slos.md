# AlifWorld Non-Functional Requirements, Capacity Assumptions & SLOs

**Document Type**: Architectural Specification & Performance Benchmark  
**Phase Reference**: Phase 01 — Governance and Architecture  
**Milestone Reference**: [Milestone 004](../../AlifWorld-300-Milestones/004-non-functional-requirements-capacity-assumptions-and-slos.md)  
**Timezone Reference**: `Asia/Dhaka` (UTC+06:00)  
**Currency Standard**: BDT integer poisha  
**Status**: Authoritative & Accepted  

---

## 1. Capacity Assumptions & Workload Models

AlifWorld is architected to support high-velocity retail commerce and high-frequency loyalty/distribution calculations across three distinct operating tiers:

```
[ Tier 1: Baseline Launch ]       --> 50,000 DAU, 1,000 Peak QPS, 50 Orders/min
[ Tier 2: Year-1 Growth ]         --> 500,000 DAU, 5,000 Peak QPS, 500 Orders/min
[ Tier 3: Festival Flash Sales ]   --> 2,000,000 DAU, 25,000 Peak QPS, 5,000 Orders/min (Eid/Campaign)
```

### 1.1 Workload Sizing Specifications

| Dimension | Baseline Launch | Year-1 Steady State | Flash Sale / Peak Campaign | Architecture Strategy |
|:---|:---:|:---:|:---:|:---|
| **Registered Customers** | 250,000 | 2,000,000 | 5,000,000+ | Normalized PostgreSQL schema; partition user sessions in Redis |
| **Active Sellers** | 2,500 | 15,000 | 50,000 | Tenant-scoped data partitioning via `seller_id` indexes |
| **Active SKUs** | 100,000 | 1,000,000 | 5,000,000 | Meilisearch primary search index; PostgreSQL GIN fallback |
| **Search Queries (QPS)** | 500 QPS | 2,500 QPS | 10,000+ QPS | Edge caching + Redis query cache + Meilisearch cluster |
| **Peak Checkout / Orders** | 10 orders/sec | 100 orders/sec | 500 orders/sec | Atomic Redis reservations + PostgreSQL row lock checkout |
| **Ledger Postings / Month** | 2,500,000 | 25,000,000 | 100,000,000 | Immutable append-only ledger; monthly table partitioning |
| **Rider GPS Telemetry** | 1,000 pings/sec | 5,000 pings/sec | 15,000 pings/sec | Ingestion into Redis GEO/Streams; rate-limited writeback |
| **Media Assets (S3)** | 2 TB (500k files) | 20 TB (5M files) | 100 TB (25M files) | S3-compatible storage + CDN edge caching + WebP/AVIF |

---

## 2. Service Level Objectives (SLOs) & Error Budgets

All production operations are held to concrete Service Level Indicators (SLIs) and contractual Service Level Objectives (SLOs).

### 2.1 Availability Objectives

| Service Tier | Target Availability (SLO) | Monthly Allowed Downtime | SLI Measurement Method |
|:---|:---:|:---:|:---|
| **Customer Storefront & Browse** | **99.90%** | 43.8 minutes | Synthetic uptime probes from Dhaka, Singapore, and Mumbai |
| **REST APIs (`/app/api/v1`)** | **99.95%** | 21.9 minutes | Ratio of successful HTTP responses (non-5xx) to total requests |
| **Checkout & Payment Intents** | **99.99%** | 4.38 minutes | Percentage of successful checkout orchestrations without 500 errors |
| **Double-Entry Wallet Ledger** | **100.00%** | 0 minutes (Zero Loss) | Daily cryptographic balancing verification (`Sum(Debit) == Sum(Credit)`) |
| **Background Queue Processors** | **99.90%** | 43.8 minutes | BullMQ job completion rate without dead-letter exhaustion |

---

## 3. Latency & Performance Budgets

To deliver instant experiences over variable Bangladesh mobile networks (3G/4G/5G), execution budgets are allocated across the request pipeline:

```
[ Total User Latency: 250ms (p95) ]
 ├── Mobile Network Transit (Bangladesh LTE) : ~120ms
 ├── CDN / Edge Routing                      : ~15ms
 ├── Next.js Route Handler Execution         : ~40ms
 ├── Database (PostgreSQL Index Query)       : ~15ms
 └── Redis Distributed Cache Hit             : ~2ms
```

### 3.1 Endpoint Latency Budgets (Server Execution Time)

| Operation Type | p50 Latency | p95 Latency | p99 Latency | Max Timeout | Strategy |
|:---|:---:|:---:|:---:|:---:|:---|
| **Cached Storefront Page (SSR)** | < 30ms | < 80ms | < 150ms | 1,500ms | Incremental Static Regeneration (ISR) + Redis |
| **Search Query (Meilisearch)** | < 25ms | < 60ms | < 120ms | 800ms | Distributed Meilisearch + In-Memory Filters |
| **Search Query (Postgres Fallback)** | < 60ms | < 150ms | < 300ms | 1,500ms | GIN Trigram & Full-Text Indexes |
| **Cart Revalidation Mutation** | < 40ms | < 90ms | < 180ms | 1,000ms | Multi-key Redis query + batch stock read |
| **Atomic Checkout Reservation** | < 80ms | < 200ms | < 400ms | 2,500ms | Atomic Redis lock + isolated Prisma transaction |
| **Payment Gateway Webhook Handling** | < 50ms | < 120ms | < 250ms | 2,000ms | Validate HMAC, append outbox event, return 200 OK |
| **Ledger Posting Transaction** | < 30ms | < 70ms | < 150ms | 1,000ms | Append-only balanced transaction |
| **Asynchronous Job Dispatch** | < 10ms | < 25ms | < 50ms | 500ms | Redis-backed BullMQ enqueue |

---

## 4. Scalability, Concurrency & Stateless Node Architecture

1. **Stateless Web Application Nodes**:
   - Next.js application runs as stateless containerized instances behind a Layer 7 load balancer.
   - Zero local filesystem state: session tokens in JWT/Redis, uploads in S3, logs to standard output/OpenTelemetry.
   - Horizontal pod autoscaling (HPA) triggers when CPU utilization exceeds 70% or average latency exceeds 150ms.
2. **Database Connection Pooling**:
   - PostgreSQL connections managed via connection pooler (e.g. PgBouncer / Prisma Accelerate).
   - Connection budget: 200 total active connections allocated across web and worker pods.
   - Strict query execution budget: Any database query taking longer than 250ms triggers an automated slow-query log alert.
3. **Distributed Rate Limiting**:
   - Public APIs: 120 requests/minute per IP address.
   - Authentication Endpoints (Login/OTP): 5 requests/minute per IP / phone number.
   - Checkout Mutations: 10 requests/minute per authenticated user.
   - Managed in Redis via Token Bucket / Sliding Window algorithms.

---

## 5. Graceful Degradation & Resilience Framework

The platform must never fail catastrophically when downstream dependencies encounter outages. The following degradation behaviors are mandatory:

```
+-------------------+-----------------------------+------------------------------------------------+
| Outage Scenario   | Degraded Operational State  | User Experience Impact                         |
+-------------------+-----------------------------+------------------------------------------------+
| Meilisearch Down  | Auto-fallback to PostgreSQL | Search remains functional; slight latency rise |
| Redis Cache Down  | Direct PostgreSQL queries   | Pages load with bypass-cache; rate limits fail |
| SMS Gateway Down  | Queue OTPs with retry alert | Prompts user to retry or select email OTP      |
| S3 Storage Slow   | Asynchronous image process  | Upload accepted; WebP variants generated async |
| Payment GW Slow   | Asynchronous Webhook Recon  | Order placed in PENDING_PAYMENT; safe retry    |
+-------------------+-----------------------------+------------------------------------------------+
```

---

## 6. Security, Compliance & Data Protection NFRs

1. **Zero Secret Exposure**:
   - API keys, webhook secrets, database credentials, and cryptographic salts are injected exclusively via environment variables.
   - Strict automated CI scanning blocks commits containing tokens or passwords.
2. **Data Redaction**:
   - Structured JSON logs redact: customer passwords, OTPs, auth tokens, credit card details, bank account numbers, and unmasked NID photos.
3. **Maker-Checker Financial Controls**:
   - Manual wallet adjustments above BDT 1,000 (100,000 poisha) require dual-authorization by Super Admin accounts.
4. **Audit Immutability**:
   - All role modifications, permission grants, configuration updates, and ledger postings write to an append-only, tamper-evident audit log table.

---

## 7. Bangladesh Network & Localization NFRs

1. **Cellular Data Optimization**:
   - Storefront initial bundle payload must not exceed **180 KB compressed** (Gzip/Brotli).
   - Images automatically converted to modern WebP/AVIF formats with responsive `srcset` tailored to mobile screen densities.
2. **Bilingual String Coverage**:
   - 100% of user-facing UI copy and error messages must be available in both English (`en-BD`) and Bangla (`bn-BD`).
   - Missing translation strings fall back gracefully to English without rendering empty text or translation keys (`MISSING_KEY`).
3. **Time & Business Day Invariants**:
   - All daily, weekly, monthly, and yearly cutoffs operate in `Asia/Dhaka` time (UTC+06:00).
   - System accounts for Bangladesh weekend conventions (Friday–Saturday operational schedules).

---

## 8. Disaster Recovery & Data Retention

- **Recovery Point Objective (RPO)**: **< 5 minutes** (Continuous write-ahead logging (WAL) archiving to off-site cloud storage).
- **Recovery Time Objective (RTO)**: **< 1 hour** (Automated infrastructure reconstruction from Docker images and infrastructure-as-code).
- **Ledger Data Retention**: Financial and point ledger postings are retained indefinitely (minimum 7 years in immutable archival storage to comply with regulatory tax standards).
