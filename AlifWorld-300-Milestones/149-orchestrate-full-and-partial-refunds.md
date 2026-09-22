---
project: AlifWorld
milestone: 149
phase: 15
phase_name: "Orders, Fulfillment, Returns, and Refunds"
title: "Orchestrate full and partial refunds"
status: not-started
currency: BDT
locales: [en-BD, bn-BD]
timezone: Asia/Dhaka
architecture: single-nextjs-application
---

# Milestone 149: Orchestrate full and partial refunds

## Outcome

Implement **Orchestrate full and partial refunds** as a production-ready, tested part of AlifWorld. This milestone belongs to Phase 15, **Orders, Fulfillment, Returns, and Refunds**. The phase purpose is: Operate parent orders and seller-specific fulfillment with explicit state machines and compensation.

This is an execution specification for an AI coding agent. It is not permission to replace working code blindly. Inspect the repository first, preserve compatible implementation, identify conflicts, then make the smallest coherent set of production changes that fully satisfies this file.

## Sequence and dependency gate

- Previous: [148 - Build return inspection, disposition, and inventory decisions](148-build-return-inspection-disposition-and-inventory-decisions.md)
- Next: [150 - Build disputes, support linkage, and order reporting](150-build-disputes-support-linkage-and-order-reporting.md)
- Do not start until the previous milestone's acceptance evidence exists or an explicit exception is recorded.
- If this work reveals a conflict with an earlier accepted decision, update the decision log and affected tests before proceeding.
- Keep the application runnable at the end of this milestone. A half-migrated schema or an undocumented breaking API is not acceptable.

## Locked project constraints

- Keep one repository and one deployable Next.js application. Storefront, Admin, Seller, REST API, docs, and worker code are modules in that codebase; do not create microservices or another backend framework.
- Use TypeScript throughout, Next.js Route Handlers under `/app/api/v1`, PostgreSQL through Prisma, Redis for distributed coordination/cache/rate limits, BullMQ for jobs, S3-compatible permanent storage, and a Meilisearch adapter with a boot-safe fallback.
- Use BDT as the launch currency, represent money in integer minor units (poisha) plus an ISO currency code, use `Asia/Dhaka` for configured business periods, and ship `en-BD` and `bn-BD` with an extensible localization design.
- Product price and Product Point are independent values. Never infer a conversion rate. Snapshot both on order items; generate Points as `productPointSnapshot * eligibleQuantity` only at the configured eligible status.
- All percentages, thresholds, splits, rank bands, period cutoffs, and eligibility rules are versioned Admin configuration. Historical transactions retain their rule version and are never silently recalculated.
- Financial, wallet, Point, reward, commission, inventory, payment, and order-sensitive operations must be transactional, idempotent, auditable, and safe under retries and concurrent requests.
- All protected resources require server-side authentication, permission checks, object ownership, and seller-tenant scoping. Hiding a UI control is not authorization.
- Generate OpenAPI from implementation-owned Zod schemas and route metadata. Do not maintain a divergent handwritten API description.
- Permanent uploads never use the application filesystem. The application remains stateless and supports multiple web and worker instances behind a load balancer.
- Do not ship placeholders, fake success paths, exposed secrets, ignored type errors, or unverified calculations. If a credential is absent, keep a real adapter boundary and a clear disabled-state response.

## Source authority and ambiguity policy

Use this precedence when sources disagree:

1. An approved, dated business configuration matrix and the user's current explicit instructions.
2. The detailed AlifWorld e-commerce wallet/rewards requirements proposal.
3. The single-codebase Next.js master build specification.
4. The Customer Wallet System and AlifWorld customer-rank presentation.
5. The Alifworld.click marketing presentation for optional ads/package/affiliate capabilities.
6. Existing implementation only when it does not contradict a higher source. Never use an AI assumption to resolve a monetary ambiguity.

The following items are approval gates. This milestone may prepare schemas, configuration screens, disabled adapters, and tests around them, but must not invent active financial behavior:

- [ ] The final eligible order status for Point/reward posting.
- [ ] The accounting definition and funding source of each profit/reward pool.
- [ ] Seller Rank Bonus and Customer Rank Bonus qualification formulas.
- [ ] Confirmation that the duplicated third Customer Club period is Monthly.
- [ ] Advanced Shopping deposit tenure, return formula, maturity, withdrawal, and cancellation rules.
- [ ] The BDT price catalogue for source documents that quote packages in USD; do not perform exchange-rate conversion automatically.
- [ ] Legal, tax, consumer-protection, charity, referral-marketing, withdrawal, promotional-draw/lottery, and advertising approval for each launch territory.

## Milestone-specific requirements

- Support item-level partial refunds and multiple attempts without exceeding captured value.
- Reverse inventory, Points, rewards, commission, tax, and seller payable according to explicit policy.



## Detailed implementation guide

1. **Inspect and baseline.** Locate every existing route, component, service, repository, schema, migration, job, test, configuration value, and document related to this milestone. Record what will be reused, changed, deprecated, or migrated. Run the relevant current tests before editing so pre-existing failures are not misreported as new.
2. **Write the contract first.** Define actors, permissions, states, transitions, invariants, inputs, outputs, error codes, idempotency boundary, audit events, and failure/retry behavior. For rules managed by Admin, define the versioned configuration shape and activation validation. Add or update an architecture decision when the choice affects later milestones.
3. **Design persistence deliberately.** Add only the normalized Prisma models and indexes required for this outcome. Use foreign keys, unique constraints, checks where supported, optimistic versions or locks where needed, explicit currency/Point units, and immutable snapshots for historical facts. Create a reviewed migration; do not use destructive reset workflows on shared data.
4. **Implement repository and service layers.** Route handlers authenticate, authorize, validate, call a service, and serialize a result. Services own business transactions and domain events. Repositories own scoped Prisma queries and select only required fields. Shared calculations are pure typed functions with explicit rounding and clock inputs.
5. **Expose stable interfaces.** Add versioned REST routes only where needed, using shared Zod schemas and the common success, pagination, and error envelopes. Document authorization and idempotency headers. Update generated OpenAPI metadata in the same change. If the capability is internal, expose a typed service/event contract rather than a private ad-hoc HTTP endpoint.
6. **Build the affected UI.** Implement complete loading, empty, validation, error, success, permission-denied, disabled-feature, and retry states. Use Server Components by default and Client Components only for interaction. Ensure mobile use, keyboard access, visible focus, screen-reader names, English/Bangla copy, and BDT formatting where relevant.
7. **Integrate asynchronous and external work safely.** Use the transactional outbox/BullMQ for email, notifications, indexing, exports, invoices, settlement, or other non-essential work. Assign deterministic job IDs and make processors idempotent. Put third-party calls behind interfaces and make missing credentials produce a controlled disabled/degraded state.
8. **Add auditability and observability.** Emit a request ID or job ID, structured redacted logs, domain metrics, and audit entries for sensitive changes. Never log secrets, tokens, OTPs, passwords, full KYC documents, or unnecessary personal data. Make reconciliation identifiers searchable by authorized operators.
9. **Test the behavior, not just the happy path.** Add deterministic unit tests for calculations and state rules, integration tests against real persistence boundaries, authorization/tenant-negative tests, retry/duplicate/concurrency tests, and focused end-to-end coverage for user-visible journeys. Use fixed clocks and provider fakes; do not make tests depend on live gateways.
10. **Document and hand off.** Update setup, architecture, database, API, operations, and user-facing documentation affected by the change. Record environment keys without values, migration/rollback notes, configuration needed to enable the feature, and known approved exceptions. Do not leave placeholder screens or pretend integrations are complete.

## Required code and documentation areas

Primary expected areas for this phase: `features/orders, features/returns, features/shipments, workers/invoice`. The exact existing repository structure wins when it already enforces the same boundaries. Do not create duplicate parallel modules merely to match a suggested path.

At minimum, review impacts across:

- `app/(store)` for public/customer surfaces and server-rendered SEO pages.
- `app/seller` and `app/admin` for role-specific operational UI.
- `app/api/v1` for Flutter-compatible REST contracts.
- `features`, `services`, and `repositories` for domain separation.
- `prisma` for schema, migration, indexes, and idempotent seed changes.
- `workers` and the outbox for asynchronous or scheduled effects.
- `validators`, `types`, OpenAPI generation, and error catalogs.
- unit, integration, end-to-end, security, and performance tests as applicable.

### Business-rule handling

When this milestone touches price, Product Points, rewards, commissions, wallets, ranks, packages, or lotteries, read the versioned configuration instead of embedding a percentage or threshold. Preserve the applied version on the resulting record and do not invent a missing formula.

## API and data conventions

- Success: `{ "success": true, "data": ... }`. Paginated collections also return page/cursor metadata. Errors use `{ "success": false, "error": { "code": "...", "message": "...", "details": ... } }` with safe localized presentation and stable machine codes.
- Use correct HTTP methods and statuses. `POST` creation returns 201, validation returns 422 or the project-approved consistent status, authentication returns 401, authorization returns 403, missing records return 404, conflict/idempotency races return 409, and rate limits return 429.
- Mobile clients use `Authorization: Bearer <token>` and JSON. Browser-only security may use secure `HttpOnly` cookies where the documented auth architecture requires them. Never expose service secrets through `NEXT_PUBLIC_*`.
- Large lists paginate and whitelist sort/filter fields. High-volume feeds use cursor pagination with a deterministic unique tiebreaker.
- Every mutation validates server-side and returns a stable result under retry. Payment, checkout, ledger, reward, commission, inventory, draw, and assignment mutations require explicit idempotency.

## Security and correctness review

- Enumerate who may read, create, update, approve, reverse, export, and delete each affected object. Test a user with no role, the wrong role, the right role but wrong seller, and a suspended actor.
- Validate payload size, file type, MIME signature, ranges, enumeration values, dates, locale, money, Points, and identifiers. Do not pass unchecked query objects to Prisma.
- Redact sensitive fields in responses, logs, analytics, audit diffs, exports, and support views. Use signed, short-lived object access for private documents.
- Make irreversible or high-value Admin operations require confirmation, a reason, fresh authentication when appropriate, and maker-checker approval for manual financial adjustments.
- Preserve source records. Correct accounting with linked reversal/correction entries rather than edits or deletes.

## Verification plan

Phase-level test emphasis: transition guards, partial flows, return inspection, refund and audit tests.

Before marking complete, run the narrow tests first, then the repository quality commands available at this point. By the end-state these commands must exist and pass:

```bash
bun run lint
bun run typecheck
bun run test
bun run openapi
bun run build:local
```

When the milestone changes Prisma, also run generation, migration validation, and seed idempotency in an isolated test database. When it changes workers, run the relevant worker with duplicate deliveries and injected provider failures. When it changes public routes, test both locales and mobile/desktop rendering.

## Acceptance criteria

- [ ] The implementation of **Orchestrate full and partial refunds** is real, reachable where intended, and contains no fake success path.
- [ ] Existing compatible work was preserved; replaced behavior and migrations are documented.
- [ ] Server-side validation, authentication, authorization, tenant isolation, and audit events are present where applicable.
- [ ] Money uses BDT/poisha-safe primitives; Points remain a separate unit; configured rules store their version.
- [ ] Concurrency, idempotency, retries, reversals, and partial failure are handled for sensitive mutations.
- [ ] English and Bangla behavior, accessibility, responsive UI, and localized errors are covered where user-facing.
- [ ] OpenAPI and examples match the actual route schemas; Flutter clients do not depend on UI-only structures.
- [ ] Unit, integration, negative authorization, and relevant end-to-end tests pass.
- [ ] Logs and audit data are useful and redacted; no secret or sensitive document content is exposed.
- [ ] Documentation, environment examples, migrations, seed effects, rollback notes, and operational steps are current.
- [ ] The milestone leaves the codebase in a buildable state and includes an evidence-based handoff for the next file.

## Required completion report

The executing AI must finish with a concise report containing:

1. Files and migrations changed.
2. Decisions made and the source that authorized them.
3. API, UI, worker, cache, search, or provider behavior added.
4. Tests and commands run with results.
5. Security, tenancy, localization, and financial-integrity checks performed.
6. Configuration or credentials still required.
7. Approved exceptions, unresolved gates, and exact next milestone.
