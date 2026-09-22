# ADR 0004: Non-Functional Requirements, Capacity Assumptions, and SLOs

**Status**: Accepted  
**Date**: 2026-09-22  
**Deciders**: AlifWorld Architecture & Site Reliability Engineering (SRE) Team  
**Milestone Reference**: [Milestone 004](../../AlifWorld-300-Milestones/004-non-functional-requirements-capacity-assumptions-and-slos.md)  
**Supporting Specification**: [Non-Functional Requirements & SLOs](../architecture/non-functional-requirements-and-slos.md)  

---

## Context and Problem Statement

AlifWorld targets high-volume multi-vendor commerce in Bangladesh, characterized by erratic cellular network latency (3G/4G/5G transitions), steep traffic spikes during festival campaigns (Eid-ul-Fitr, Eid-ul-Adha, 11.11 shopping festivals), and mission-critical financial ledger postings across millions of loyalty transactions.

Without documented, enforceable Non-Functional Requirements (NFRs) and Service Level Objectives (SLOs), systems suffer from:
1. Inadequate database connection sizing leading to connection exhaustion.
2. Unbounded API queries that saturate CPU and memory under load.
3. Catastrophic cascade failures when external services (Meilisearch, SMS gateways) degrade.
4. Ambiguity regarding acceptable latency and availability thresholds.

A binding Architecture Decision Record is required to codify capacity assumptions, SLOs, and degradation policies.

---

## Decision Drivers

- **Mobile Network Resilience**: High responsiveness over Bangladesh mobile networks with p95 server latency under 100ms.
- **Financial Immutability**: 100% cryptographic balance integrity for double-entry ledgers.
- **Fail-Safe Operation**: Uninterrupted storefront operations during external service degradation.
- **Automated Verification**: Concrete SLIs measurable by continuous synthetic monitoring and APM tools.

---

## Decision Outcome

The architecture formally adopts the following Non-Functional Standards:

### 1. Workload Sizing & Capacity Ceilings
- **Launch Baseline**: 50,000 DAU, 1,000 peak QPS, 50 orders/minute.
- **Year-1 Target**: 500,000 DAU, 5,000 peak QPS, 500 orders/minute.
- **Flash Campaign Peak**: 2,000,000 DAU, 25,000 peak QPS, 5,000 orders/minute.
- Architecture requirement: Next.js web instances must scale horizontally without sticky sessions.

### 2. Service Level Objectives (SLOs)
- **API Availability**: 99.95% uptime monthly (error budget: 21.9 minutes).
- **Checkout & Payment**: 99.99% uptime monthly (error budget: 4.38 minutes).
- **Financial Ledger**: 100.00% balance integrity (zero rounding leakage, zero lost postings).
- **RTO / RPO**: Recovery Time Objective < 1 hour; Recovery Point Objective < 5 minutes.

### 3. Server Execution Latency Budgets
- Cached SSR / Static Pages: p95 < 80ms.
- Meilisearch Product Queries: p95 < 60ms (PostgreSQL fallback: p95 < 150ms).
- Cart Revalidations: p95 < 90ms.
- Atomic Checkout Reservations: p95 < 200ms.
- Payment Webhook Handling: p95 < 120ms.

### 4. Mandatory Graceful Degradation Policies
- **Search Outage**: Meilisearch adapter must intercept connection timeouts within 250ms and seamlessly switch to PostgreSQL full-text search queries.
- **Redis Cache Outage**: Application must bypass cache and query PostgreSQL directly with query budgets, while logging degraded state alerts.
- **SMS Outage**: BullMQ retry with exponential backoff; fallback prompt offered to users for email verification.

---

## Consequences

### Positive:
- Engineering teams and AI agents have clear, quantitative performance benchmarks for every query and endpoint.
- Capacity planning eliminates guesswork for database connection pools, Redis memory sizing, and worker scaling.
- Graceful degradation guarantees that customer shopping journeys do not break when third-party tools fail.

### Negative / Trade-offs:
- Requires continuous performance testing and strict query optimization budgets (< 250ms per database query).
- Requires fallback logic for search and caching, slightly increasing codebase complexity.

---

## Compliance and Verification

- **Milestone 269 (Performance & Capacity Tests)**: Must validate these SLOs using load-testing tools (k6/Artillery) under simulated campaign conditions.
- **Milestone 288 (Observability & Monitoring)**: Must configure automated Prometheus/Grafana alerts triggered when p95 latency exceeds budgets.
